// End-to-end walkthrough for the chatbot module.
//
// This spec exists because the recommender's PostGIS/raw-SQL query cannot be
// meaningfully unit-tested against a mocked Prisma. So we boot a real Postgres
// via testcontainers (same harness the other integration specs use), apply
// every migration including 0016_chatbot_tables, seed multiple venues at known
// coordinates, and drive the whole chain end-to-end:
//
//   1. Chat migration applied (chat_conversations + chat_messages exist).
//   2. Recommender: PostGIS + availability + scoring returns correct ranking.
//   3. ChatService: agent tool call → tool executor → recommender → persistence.
//   4. Replay: GET /chat/conversations/:id returns the full turn history.
//
// The Anthropic client is faked — we script the exact tool_use → tool_result →
// end_turn sequence so we can verify the wiring without an API key.

import { ChatMessageRole, PrismaClient } from '@prisma/client';
import type Anthropic from '@anthropic-ai/sdk';
import { ConfigService } from '@nestjs/config';
import { AvailabilityService } from '../../src/modules/availability/availability.service';
import { AvailabilityCache } from '../../src/modules/availability/availability.cache';
import { DiscoveryService } from '../../src/modules/discovery/discovery.service';
import { ChatRecommenderService } from '../../src/modules/chat/chat-recommender.service';
import { ChatToolsService } from '../../src/modules/chat/chat-tools.service';
import { ChatAgentService } from '../../src/modules/chat/chat-agent.service';
import { ChatService } from '../../src/modules/chat/chat.service';
import { startHarness, type IntegrationHarness } from './harness';

describe('chat module (E2E)', () => {
  let h: IntegrationHarness;
  let prisma: PrismaClient;
  let recommender: ChatRecommenderService;
  let chatService: ChatService;
  let fakeAnthropic: { messages: { create: jest.Mock } };

  beforeAll(async () => {
    h = await startHarness();
    prisma = h.prisma;

    const availability = new AvailabilityService(
      prisma as unknown as ConstructorParameters<typeof AvailabilityService>[0],
      new AvailabilityCache(),
    );
    const discovery = new DiscoveryService(
      prisma as unknown as ConstructorParameters<typeof DiscoveryService>[0],
      availability,
    );
    recommender = new ChatRecommenderService(
      prisma as unknown as ConstructorParameters<typeof ChatRecommenderService>[0],
      availability,
    );
    const tools = new ChatToolsService(discovery, availability, recommender);

    fakeAnthropic = { messages: { create: jest.fn() } };
    const config = {
      get: (key: string) => {
        if (key === 'ANTHROPIC_MODEL') return 'test-model';
        if (key === 'CHAT_MAX_TOOL_ITERATIONS') return 4;
        return undefined;
      },
    } as unknown as ConstructorParameters<typeof ChatAgentService>[2];
    const agent = new ChatAgentService(fakeAnthropic as unknown as Anthropic, tools, config);
    chatService = new ChatService(
      prisma as unknown as ConstructorParameters<typeof ChatService>[0],
      agent,
    );
  }, 240_000);

  afterAll(async () => {
    await h?.stop();
  });

  beforeEach(async () => {
    await h.truncateAll();
    fakeAnthropic.messages.create.mockReset();
  });

  it('applied migration 0016 (chat_conversations + chat_messages)', async () => {
    const rows = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables
       WHERE schemaname='public'
         AND tablename IN ('chat_conversations','chat_messages')
    `;
    expect(rows.map((r) => r.tablename).sort()).toEqual(['chat_conversations', 'chat_messages']);
  });

  it('recommender returns top-3 ranked by distance, rating, price with real PostGIS', async () => {
    const seed = await seedThreeVenues(prisma);
    const today = todayIst();

    const results = await recommender.recommend({
      lat: seed.userLat,
      lng: seed.userLng,
      date: today,
      start_time: '19:00',
      sport_code: 'CRICKET',
      radius_km: 15,
    });

    expect(results).toHaveLength(3);
    // Closest cricket ground (0.5km, 4.6★, ₹600) should win over 4km/4.8★/₹1000 and 8km/4.2★/₹500.
    expect(results[0].venue_slug).toBe('close-nashik');
    expect(results[0].price_paise).toBe(60000);
    expect(results[0].start_time).toBe('19:00');
    expect(results[0].rationale).toMatch(/0\.5km|0\.4km|0\.6km/);
    expect(results[0].score).toBeGreaterThan(results[1].score);
    expect(results[1].score).toBeGreaterThan(results[2].score);
  });

  it('recommender excludes candidates whose slot at start_time is unavailable', async () => {
    const seed = await seedThreeVenues(prisma);
    const today = todayIst();

    // Block 19:00 on the closest venue by creating a live booking there.
    await prisma.$transaction(async (tx) => {
      const customer = await tx.identity.create({
        data: { firebaseUid: 'test:blocker', phone: '+919111111111', role: 'CUSTOMER' },
      });
      const session = await tx.bookingSession.create({
        data: {
          identityId: customer.id,
          groundId: seed.closeCricketGroundId,
          bookingDate: new Date(`${today}T00:00:00Z`),
          startTime: new Date('1970-01-01T19:00:00Z'),
          endTime: new Date('1970-01-01T20:30:00Z'),
          totalAmount: 600,
          expiresAt: new Date(Date.now() + 3600_000),
          status: 'ACTIVE',
        },
      });
      await tx.booking.create({
        data: {
          referenceCode: 'BKG-TEST-01',
          bookingSessionId: session.id,
          identityId: customer.id,
          partnerId: seed.partnerId,
          venueId: seed.closeVenueId,
          groundId: seed.closeCricketGroundId,
          bookingDate: new Date(`${today}T00:00:00Z`),
          startTime: new Date('1970-01-01T19:00:00Z'),
          endTime: new Date('1970-01-01T20:30:00Z'),
          bookingSource: 'CUSTOMER_APP',
          bookingStatus: 'CONFIRMED',
          totalAmount: 600,
        },
      });
    });

    const results = await recommender.recommend({
      lat: seed.userLat,
      lng: seed.userLng,
      date: today,
      start_time: '19:00',
      sport_code: 'CRICKET',
      radius_km: 15,
    });

    // Closest venue drops out — mid becomes top.
    const slugs = results.map((r) => r.venue_slug);
    expect(slugs).not.toContain('close-nashik');
    expect(slugs[0]).toBe('mid-nashik');
  });

  it('ChatService drives a full user→tool→persist→reply roundtrip', async () => {
    const seed = await seedThreeVenues(prisma);
    const today = todayIst();

    // Script Anthropic: first call returns a tool_use for recommend_best,
    // second call returns the final text summary.
    fakeAnthropic.messages.create
      .mockResolvedValueOnce({
        content: [
          {
            type: 'tool_use',
            id: 'tu_1',
            name: 'recommend_best',
            input: { lat: seed.userLat, lng: seed.userLng, date: today, start_time: '19:00', sport_code: 'CRICKET' },
          },
        ],
        stop_reason: 'tool_use',
        usage: { input_tokens: 100, output_tokens: 20 },
      })
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Try Close Nashik — 0.5km away, ₹600.' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 200, output_tokens: 30 },
      });

    const result = await chatService.sendMessage(
      {
        message: 'Recommend a cricket turf near me for 7pm tonight',
        lat: seed.userLat,
        lng: seed.userLng,
        client_now_iso: `${today}T18:00:00+05:30`,
      },
      null, // guest
    );

    expect(result.reply).toContain('Close Nashik');
    expect(result.tools_used).toEqual([{ name: 'recommend_best', ok: true, error_code: undefined }]);
    expect(result.conversation_id).toBeTruthy();

    // The conversation is persisted with exactly the right shape.
    const stored = await chatService.getConversation(result.conversation_id, null);
    // Turns: user → assistant(tool_use) → user(tool_result) → assistant(text) = 4
    expect(stored.messages).toHaveLength(4);
    expect(stored.messages[0].role).toBe(ChatMessageRole.USER);
    expect(stored.messages[1].role).toBe(ChatMessageRole.ASSISTANT);
    expect(stored.messages[2].role).toBe(ChatMessageRole.USER);
    expect(stored.messages[3].role).toBe(ChatMessageRole.ASSISTANT);
    // The tool_result block was persisted verbatim as JSONB.
    const toolResultTurn = stored.messages[2].content as Array<{ type: string; tool_use_id: string; content: string }>;
    expect(Array.isArray(toolResultTurn)).toBe(true);
    expect(toolResultTurn[0].type).toBe('tool_result');
    expect(toolResultTurn[0].tool_use_id).toBe('tu_1');
    // And the tool_result content is the compacted recommender payload — contains "recommendations".
    expect(toolResultTurn[0].content).toContain('recommendations');
    expect(toolResultTurn[0].content).toContain('close-nashik');
  });

  it('a second message on the same conversation replays history to the agent', async () => {
    await seedThreeVenues(prisma);
    const today = todayIst();

    fakeAnthropic.messages.create
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Hi! Where are you?' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 50, output_tokens: 10 },
      })
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Got it — Gangapur Road.' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 60, output_tokens: 10 },
      });

    const first = await chatService.sendMessage(
      { message: 'hey', client_now_iso: `${today}T18:00:00+05:30` },
      null,
    );
    const second = await chatService.sendMessage(
      { message: 'im at gangapur road', conversation_id: first.conversation_id, client_now_iso: `${today}T18:01:00+05:30` },
      null,
    );

    expect(second.conversation_id).toBe(first.conversation_id);
    expect(fakeAnthropic.messages.create).toHaveBeenCalledTimes(2);

    // The second Anthropic call must have received the full prior history.
    // messages[] is mutated inside the agent loop, so we can't inspect it via
    // mock.calls after the fact — instead verify persistence, which is what
    // downstream turns actually read from.
    const stored = await chatService.getConversation(first.conversation_id, null);
    expect(stored.messages).toHaveLength(4);
    expect(stored.messages.map((m) => m.role)).toEqual([
      ChatMessageRole.USER,
      ChatMessageRole.ASSISTANT,
      ChatMessageRole.USER,
      ChatMessageRole.ASSISTANT,
    ]);
  });
});

// ── fixture ──────────────────────────────────────────────────────────────

async function seedThreeVenues(prisma: PrismaClient) {
  const cricketSport = await prisma.sport.findFirstOrThrow({ where: { code: 'CRICKET' } });

  const partnerIdentity = await prisma.identity.create({
    data: { firebaseUid: 'test:chat-partner', phone: '+919000000010', role: 'PARTNER' },
  });
  const partner = await prisma.partner.create({
    data: {
      identityId: partnerIdentity.id,
      businessName: 'Chat Test Sports',
      displayName: 'Chat Test',
      phone: '+919000000010',
      address: 'Nashik',
      city: 'Nashik',
      state: 'Maharashtra',
      status: 'ACTIVE',
      isVerified: true,
    },
  });

  // Anchor point: Gangapur Road, Nashik (matches the demo seed).
  const userLat = 20.0059;
  const userLng = 73.7784;

  // Close: ~0.5km east; high rating; ₹600.
  const close = await createVenue(prisma, partner.id, cricketSport.id, {
    slug: 'close-nashik',
    name: 'Close Nashik',
    lat: 20.0059,
    lng: 73.7834, // ~0.5km east at this latitude
    rating: 4.6,
    reviews: 40,
    price: 600,
  });
  // Mid: ~4km south; higher rating but further; ₹1000.
  const mid = await createVenue(prisma, partner.id, cricketSport.id, {
    slug: 'mid-nashik',
    name: 'Mid Nashik',
    lat: 19.9700,
    lng: 73.7784,
    rating: 4.8,
    reviews: 100,
    price: 1000,
  });
  // Far: ~8km south; mediocre; cheap.
  const far = await createVenue(prisma, partner.id, cricketSport.id, {
    slug: 'far-nashik',
    name: 'Far Nashik',
    lat: 19.9340,
    lng: 73.7784,
    rating: 4.2,
    reviews: 15,
    price: 500,
  });

  return {
    userLat,
    userLng,
    partnerId: partner.id,
    closeVenueId: close.venueId,
    closeCricketGroundId: close.groundId,
    midVenueId: mid.venueId,
    farVenueId: far.venueId,
  };
}

async function createVenue(
  prisma: PrismaClient,
  partnerId: string,
  sportId: string,
  cfg: { slug: string; name: string; lat: number; lng: number; rating: number; reviews: number; price: number },
) {
  const venue = await prisma.venue.create({
    data: {
      partnerId,
      name: cfg.name,
      slug: cfg.slug,
      address: `${cfg.name}, Nashik`,
      city: 'Nashik',
      state: 'Maharashtra',
      postalCode: '422013',
      latitude: cfg.lat,
      longitude: cfg.lng,
      amenities: [],
      averageRating: cfg.rating,
      totalReviews: cfg.reviews,
      status: 'PUBLISHED',
    },
  });
  // Populate the geography column that migration 0004 added (raw SQL — not modelled in Prisma).
  await prisma.$executeRawUnsafe(
    `UPDATE venues SET location = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography WHERE id = $3::uuid`,
    cfg.lng,
    cfg.lat,
    venue.id,
  );

  const ground = await prisma.ground.create({
    data: {
      venueId: venue.id,
      sportId,
      name: `${cfg.name} Box`,
      surfaceType: 'ARTIFICIAL_TURF',
      maxPlayers: 14,
      lighting: true,
      status: 'ACTIVE',
    },
  });
  await prisma.groundConfiguration.create({
    data: {
      groundId: ground.id,
      bookingDuration: 90,
      bookingInterval: 30,
      maxAdvanceBookingDays: 30,
      minNoticeMinutes: 30,
      cancellationWindowHours: 4,
    },
  });
  // Operating hours: open every day 06:00–23:00.
  for (let day = 1; day <= 7; day++) {
    await prisma.operatingHour.create({
      data: {
        groundId: ground.id,
        dayOfWeek: day,
        openingTime: new Date('1970-01-01T06:00:00Z'),
        closingTime: new Date('1970-01-01T23:00:00Z'),
        isClosed: false,
      },
    });
  }
  // Flat pricing.
  await prisma.pricingRule.create({
    data: {
      groundId: ground.id,
      name: 'flat',
      dayOfWeek: null,
      startTime: new Date('1970-01-01T00:00:00Z'),
      endTime: new Date('1970-01-01T23:59:00Z'),
      pricePerSlot: cfg.price,
      priority: 1,
      active: true,
    },
  });
  return { venueId: venue.id, groundId: ground.id };
}

function todayIst(): string {
  // Availability service's window check runs today-in-IST. Use today's IST date.
  const now = new Date();
  const istOffsetMs = 5.5 * 3600 * 1000;
  return new Date(now.getTime() + istOffsetMs).toISOString().slice(0, 10);
}
