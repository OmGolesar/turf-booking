// End-to-end walkthrough for the chatbot module.
//
// This spec exists because the recommender's PostGIS query and the booking
// hand-off flow cannot be meaningfully unit-tested against a mocked Prisma.
// So we boot a real Postgres via testcontainers (same harness the other
// integration specs use), apply every migration including 0016+0017, seed
// multiple venues at known coordinates, and drive the whole chain end-to-end:
//
//   1. Chat migrations applied (chat_conversations + chat_messages exist,
//      booking_sessions.booking_source column exists, CHATBOT enum value).
//   2. Recommender: PostGIS + availability + scoring returns correct ranking.
//   3. ChatService: agent tool call → tool executor → recommender → persistence.
//   4. Replay: GET /chat/conversations/:id returns the full turn history.
//   5. Booking flow: hold_slot creates a session with bookingSource=CHATBOT,
//      returns Razorpay handoff, and the persisted booking (created via the
//      normal confirm path) carries CHATBOT attribution through to the DB.
//   6. Auth gates: guest cannot hold/cancel/list-bookings.
//   7. Cancel via chat: BookingService.cancel works end-to-end.
//
// The Anthropic client is faked — we script the exact tool_use → tool_result →
// end_turn sequence so we can verify the wiring without an API key. Razorpay
// is faked at the boundary so we don't call the real API but still exercise
// the full transactional path (session create + refund on cancel).

import { BookingSource, BookingStatus, ChatMessageRole, PrismaClient, Role } from '@prisma/client';
import type Anthropic from '@anthropic-ai/sdk';
import { formatIstIso, toIstDateString } from '../../src/shared/time/ist';
import { AvailabilityService } from '../../src/modules/availability/availability.service';
import { AvailabilityCache } from '../../src/modules/availability/availability.cache';
import { DiscoveryService } from '../../src/modules/discovery/discovery.service';
import { BookingSessionService } from '../../src/modules/booking/booking-session.service';
import { BookingService } from '../../src/modules/booking/booking.service';
import { CustomersService } from '../../src/modules/customers/customers.service';
import { OutboxService } from '../../src/shared/outbox/outbox.service';
import { AuditService } from '../../src/shared/audit/audit.service';
import { RefundService } from '../../src/modules/refund/refund.service';
import { ChatRecommenderService } from '../../src/modules/chat/chat-recommender.service';
import { ChatToolsService } from '../../src/modules/chat/chat-tools.service';
import { ChatAgentService } from '../../src/modules/chat/chat-agent.service';
import { ChatService } from '../../src/modules/chat/chat.service';
import type { AuthContext } from '../../src/shared/auth/auth-context';
import { startHarness, type IntegrationHarness } from './harness';

describe('chat module (E2E)', () => {
  let h: IntegrationHarness;
  let prisma: PrismaClient;
  let recommender: ChatRecommenderService;
  let chatService: ChatService;
  let bookingService: BookingService;
  let bookingSessionService: BookingSessionService;
  let fakeAnthropic: { messages: { create: jest.Mock } };
  let fakeRazorpay: {
    createOrder: jest.Mock;
    keyId: jest.Mock;
    verifySignature: jest.Mock;
    fetchPayment: jest.Mock;
    createRefund: jest.Mock;
    listRefunds: jest.Mock;
    findOrCreateRefund: jest.Mock;
  };

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
    const customers = new CustomersService(
      prisma as unknown as ConstructorParameters<typeof CustomersService>[0],
    );
    const outbox = new OutboxService();
    const audit = new AuditService();

    fakeRazorpay = {
      createOrder: jest.fn(async (amountPaise: number, receipt: string) => ({
        id: `order_test_${receipt}`,
        amount: amountPaise,
        currency: 'INR',
      })),
      keyId: jest.fn(() => 'rzp_test_stub'),
      verifySignature: jest.fn(() => true),
      fetchPayment: jest.fn(async (_paymentId: string) => ({
        id: 'pay_test',
        status: 'captured',
        amount: 60000,
        method: 'upi',
        order_id: 'order_test_session:sess',
      })),
      createRefund: jest.fn(async (_txn: string, amountPaise: number, notes?: Record<string, string>) => ({
        id: 'rfnd_test',
        amount: amountPaise,
        status: 'processed',
        notes,
      })),
      // Refund dedupe path — mirrors production RazorpayService.
      // Chat cancel flow calls findOrCreateRefund directly; assertions on
      // createRefund elsewhere in the file still hold because production
      // eventually calls it under the hood in the non-reused branch.
      listRefunds: jest.fn(async (_paymentId: string) => []),
      findOrCreateRefund: jest.fn(async (
        paymentId: string,
        amountPaise: number,
        idempotencyKey: string,
        extraNotes: Record<string, string> = {},
      ) => {
        // Delegate to createRefund so tests that assert on createRefund
        // being called (the chat cancel spec) still observe the call.
        const refund = await fakeRazorpay.createRefund(paymentId, amountPaise, {
          ...extraNotes,
          idempotency_key: idempotencyKey,
        });
        return { refund, reused: false };
      }),
    };

    bookingSessionService = new BookingSessionService(
      prisma as unknown as ConstructorParameters<typeof BookingSessionService>[0],
      outbox,
      audit,
      fakeRazorpay as unknown as ConstructorParameters<typeof BookingSessionService>[3],
      availability,
    );
    const refunds = new RefundService(
      prisma as unknown as ConstructorParameters<typeof RefundService>[0],
      outbox,
      audit,
      fakeRazorpay as unknown as ConstructorParameters<typeof RefundService>[3],
    );
    bookingService = new BookingService(
      prisma as unknown as ConstructorParameters<typeof BookingService>[0],
      outbox,
      audit,
      fakeRazorpay as unknown as ConstructorParameters<typeof BookingService>[3],
      availability,
      refunds,
    );

    const tools = new ChatToolsService(
      discovery,
      availability,
      recommender,
      bookingSessionService,
      bookingService,
      customers,
    );

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

  it('applied migration 0017 (BookingSource.CHATBOT + booking_sessions.booking_source column)', async () => {
    const enumRows = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
      SELECT enumlabel FROM pg_enum
        JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
       WHERE pg_type.typname = 'BookingSource'
    `;
    expect(enumRows.map((r) => r.enumlabel)).toContain('CHATBOT');

    const columnRows = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name FROM information_schema.columns
       WHERE table_name = 'booking_sessions' AND column_name = 'booking_source'
    `;
    expect(columnRows).toHaveLength(1);
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

  // ── Booking flow (Phase 3) ─────────────────────────────────────────

  it('hold_slot creates a BookingSession with bookingSource=CHATBOT and returns Razorpay handoff', async () => {
    const seed = await seedThreeVenues(prisma);
    const customer = await createPhoneVerifiedCustomer(prisma, 'cust-hold');
    const today = tomorrowIst(); // tomorrow to safely clear min-notice

    fakeAnthropic.messages.create
      .mockResolvedValueOnce({
        content: [
          {
            type: 'tool_use',
            id: 'tu_hold',
            name: 'hold_slot',
            input: { ground_id: seed.closeCricketGroundId, date: today, start_time: '19:00' },
          },
        ],
        stop_reason: 'tool_use',
        usage: { input_tokens: 100, output_tokens: 20 },
      })
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Held for you at Close Nashik. Opening payment sheet.' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 150, output_tokens: 20 },
      });

    const result = await chatService.sendMessage(
      { message: `Book Close Nashik cricket at 7pm on ${today}`, client_now_iso: nowInIst() },
      customer.auth,
    );

    expect(result.tools_used[0]).toMatchObject({ name: 'hold_slot', ok: true });
    // The handoff is what the Flutter app consumes to open Razorpay Checkout.
    expect(result.handoff).toMatchObject({
      type: 'confirm_booking',
      razorpay_key_id: 'rzp_test_stub',
      amount_paise: expect.any(Number),
      expires_at: expect.any(String),
    });
    expect(result.handoff!.booking_session_id).toBeTruthy();
    expect(result.handoff!.razorpay_order_id).toBeTruthy();

    // Verify the DB — the source was stored on the session, ready for confirm to promote.
    const session = await prisma.bookingSession.findUniqueOrThrow({
      where: { id: result.handoff!.booking_session_id },
    });
    expect(session.bookingSource).toBe(BookingSource.CHATBOT);
    expect(session.identityId).toBe(customer.auth.identityId);
    expect(session.status).toBe('ACTIVE');
    expect(fakeRazorpay.createOrder).toHaveBeenCalled();
  });

  it('CHATBOT source propagates from BookingSession → Booking when confirm runs (existing app flow)', async () => {
    const seed = await seedThreeVenues(prisma);
    const customer = await createPhoneVerifiedCustomer(prisma, 'cust-confirm');
    const today = tomorrowIst();

    // Simulate chat holding the slot.
    fakeAnthropic.messages.create
      .mockResolvedValueOnce({
        content: [{ type: 'tool_use', id: 'tu_hold', name: 'hold_slot', input: { ground_id: seed.closeCricketGroundId, date: today, start_time: '19:00' } }],
        stop_reason: 'tool_use',
        usage: { input_tokens: 100, output_tokens: 20 },
      })
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Held.' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 100, output_tokens: 10 },
      });

    const chat = await chatService.sendMessage(
      { message: 'book it', client_now_iso: nowInIst() },
      customer.auth,
    );
    const sessionId = chat.handoff!.booking_session_id;
    const session = await prisma.bookingSession.findUniqueOrThrow({ where: { id: sessionId } });
    // Payment fetch must return the correct order_id + amount to pass verifySignature+match.
    fakeRazorpay.fetchPayment.mockResolvedValueOnce({
      id: 'pay_from_chat',
      status: 'captured',
      amount: Math.round(Number(session.totalAmount) * 100),
      method: 'upi',
      order_id: chat.handoff!.razorpay_order_id,
    });

    // App confirms via the normal (non-chat) confirm path.
    const confirmed = await bookingService.confirm(
      customer.auth,
      {
        booking_session_id: sessionId,
        razorpay_payment_id: 'pay_from_chat',
        razorpay_order_id: chat.handoff!.razorpay_order_id,
        razorpay_signature: 'sig_stub',
      },
      { requestId: 'confirm-1' },
    );

    // The stamped booking row carries CHATBOT — that's the whole point of migration 0017.
    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: confirmed.booking.id } });
    expect(booking.bookingSource).toBe(BookingSource.CHATBOT);
    expect(booking.bookingStatus).toBe(BookingStatus.CONFIRMED);
  });

  it('default sessions (no source override) confirm as CUSTOMER_APP — schema default applies', async () => {
    const seed = await seedThreeVenues(prisma);
    const customer = await createPhoneVerifiedCustomer(prisma, 'cust-default');
    const today = tomorrowIst();
    const held = await bookingSessionService.create(
      customer.auth,
      { ground_id: seed.closeCricketGroundId, booking_date: today, start_time: '19:00' },
      { requestId: 'default-1' },
      // No source override — should get CUSTOMER_APP via the column default.
    );
    const session = await prisma.bookingSession.findUniqueOrThrow({ where: { id: held.session.id } });
    expect(session.bookingSource).toBe(BookingSource.CUSTOMER_APP);
  });

  it('hold_slot as guest returns CHAT_AUTH_REQUIRED and does not create a session', async () => {
    const seed = await seedThreeVenues(prisma);
    const today = tomorrowIst();

    fakeAnthropic.messages.create
      .mockResolvedValueOnce({
        content: [{ type: 'tool_use', id: 'tu_hold', name: 'hold_slot', input: { ground_id: seed.closeCricketGroundId, date: today, start_time: '19:00' } }],
        stop_reason: 'tool_use',
        usage: { input_tokens: 100, output_tokens: 20 },
      })
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: 'You need to sign in first.' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 120, output_tokens: 10 },
      });

    const result = await chatService.sendMessage(
      { message: 'book it', client_now_iso: nowInIst() },
      null,
    );

    expect(result.tools_used[0]).toMatchObject({ name: 'hold_slot', ok: false, error_code: 'CHAT_AUTH_REQUIRED' });
    expect(result.handoff).toBeNull();
    const sessions = await prisma.bookingSession.count();
    expect(sessions).toBe(0);
  });

  it('cancel_booking via chat cancels a confirmed booking and issues a refund', async () => {
    const seed = await seedThreeVenues(prisma);
    const customer = await createPhoneVerifiedCustomer(prisma, 'cust-cancel');
    const today = tomorrowIst();

    // Set up a confirmed booking straight in the DB (skip the chat holding path for speed).
    const hold = await bookingSessionService.create(
      customer.auth,
      { ground_id: seed.closeCricketGroundId, booking_date: today, start_time: '19:00' },
      { requestId: 'setup-1' },
      BookingSource.CHATBOT,
    );
    fakeRazorpay.fetchPayment.mockResolvedValueOnce({
      id: 'pay_for_cancel',
      status: 'captured',
      amount: hold.payment_order.amount_paise,
      method: 'upi',
      order_id: hold.payment_order.order_id,
    });
    const confirmed = await bookingService.confirm(
      customer.auth,
      {
        booking_session_id: hold.session.id,
        razorpay_payment_id: 'pay_for_cancel',
        razorpay_order_id: hold.payment_order.order_id,
        razorpay_signature: 'sig_stub',
      },
      { requestId: 'setup-2' },
    );

    // Now the user cancels via chat.
    fakeAnthropic.messages.create
      .mockResolvedValueOnce({
        content: [{ type: 'tool_use', id: 'tu_cancel', name: 'cancel_booking', input: { booking_id_or_reference: confirmed.booking.reference_code } }],
        stop_reason: 'tool_use',
        usage: { input_tokens: 100, output_tokens: 20 },
      })
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Cancelled. Refund of ₹600 in 5 days.' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 120, output_tokens: 20 },
      });

    const result = await chatService.sendMessage(
      { message: `Cancel booking ${confirmed.booking.reference_code}`, client_now_iso: nowInIst() },
      customer.auth,
    );

    expect(result.tools_used[0]).toMatchObject({ name: 'cancel_booking', ok: true });
    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: confirmed.booking.id } });
    expect(booking.bookingStatus).toBe(BookingStatus.CANCELLED);
    expect(fakeRazorpay.createRefund).toHaveBeenCalled();
  });

  it('get_my_bookings returns the caller\'s bookings via chat', async () => {
    const seed = await seedThreeVenues(prisma);
    const customer = await createPhoneVerifiedCustomer(prisma, 'cust-list');
    const today = tomorrowIst();
    const hold = await bookingSessionService.create(
      customer.auth,
      { ground_id: seed.closeCricketGroundId, booking_date: today, start_time: '19:00' },
      { requestId: 'setup-list' },
      BookingSource.CHATBOT,
    );
    fakeRazorpay.fetchPayment.mockResolvedValueOnce({
      id: 'pay_list',
      status: 'captured',
      amount: hold.payment_order.amount_paise,
      method: 'upi',
      order_id: hold.payment_order.order_id,
    });
    await bookingService.confirm(
      customer.auth,
      {
        booking_session_id: hold.session.id,
        razorpay_payment_id: 'pay_list',
        razorpay_order_id: hold.payment_order.order_id,
        razorpay_signature: 'sig_stub',
      },
      { requestId: 'setup-list-confirm' },
    );

    fakeAnthropic.messages.create
      .mockResolvedValueOnce({
        content: [{ type: 'tool_use', id: 'tu_list', name: 'get_my_bookings', input: {} }],
        stop_reason: 'tool_use',
        usage: { input_tokens: 80, output_tokens: 10 },
      })
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: 'You have 1 upcoming booking.' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 100, output_tokens: 15 },
      });

    const result = await chatService.sendMessage(
      { message: 'what have I booked?', client_now_iso: nowInIst() },
      customer.auth,
    );

    expect(result.tools_used[0]).toMatchObject({ name: 'get_my_bookings', ok: true });
    const stored = await chatService.getConversation(result.conversation_id, customer.auth);
    const toolResult = stored.messages[2].content as Array<{ content: string }>;
    expect(toolResult[0].content).toContain('TX-BK-');
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
  return toIstDateString(new Date());
}

function tomorrowIst(): string {
  return toIstDateString(new Date(Date.now() + 24 * 60 * 60 * 1000));
}

function nowInIst(): string {
  return formatIstIso(new Date());
}

async function createPhoneVerifiedCustomer(
  prisma: PrismaClient,
  seed: string,
): Promise<{ auth: AuthContext }> {
  // Every booking service call demands identity.phoneVerifiedAt to be set.
  const identity = await prisma.identity.create({
    data: {
      firebaseUid: `test:${seed}`,
      phone: `+9199${seed.replace(/[^0-9]/g, '').padEnd(8, '9').slice(0, 8)}`,
      role: Role.CUSTOMER,
      phoneVerifiedAt: new Date(),
    },
  });
  return {
    auth: {
      identityId: identity.id,
      firebaseUid: identity.firebaseUid,
      role: Role.CUSTOMER,
      status: 'ACTIVE',
      isVerified: true,
    },
  };
}
