// Task 5.3 — concurrency invariant for POST /booking-sessions.
//
// The DB enforces "one ACTIVE session per (ground, date, start_time)" via the
// partial unique index `uq_active_booking_session` (migration 0007). The
// service translates the 23505 into DomainException('BOOKING_SLOT_UNAVAILABLE').
// This spec races N would-be bookers on the same slot and asserts exactly one
// wins — repeated across iterations so a lucky serialisation doesn't hide a
// real race.
//
// The full Nest DI graph would drag in ConfigService + Firebase + Razorpay
// creds. We only need Prisma + Outbox + Audit real; Razorpay and
// AvailabilityService.invalidate are stubbed (they're pure side-effects on
// the happy path and don't affect the invariant we're testing).

import { PrismaClient } from '@prisma/client';
import { BookingSessionService } from '../../src/modules/booking/booking-session.service';
import { OutboxService } from '../../src/shared/outbox/outbox.service';
import { AuditService } from '../../src/shared/audit/audit.service';
import { DomainException } from '../../src/shared/errors/domain.exception';
import { startHarness, type IntegrationHarness } from './harness';

const CONCURRENT_ATTEMPTS = 50;

describe('booking-session concurrency (Task 5.3)', () => {
  let h: IntegrationHarness;
  let service: BookingSessionService;
  let prisma: PrismaClient;

  beforeAll(async () => {
    h = await startHarness();
    prisma = h.prisma;

    // Minimal stubs — the two dependencies we don't need real for this test.
    const razorpayStub = {
      createOrder: async (amountPaise: number, receipt: string) => ({
        id: `order_test_${receipt}`,
        amount: amountPaise,
        currency: 'INR',
      }),
      keyId: () => 'rzp_test_stub',
    } as unknown as ConstructorParameters<typeof BookingSessionService>[3];

    const availabilityStub = {
      invalidate: () => undefined,
    } as unknown as ConstructorParameters<typeof BookingSessionService>[4];

    service = new BookingSessionService(
      prisma as unknown as ConstructorParameters<typeof BookingSessionService>[0],
      new OutboxService(),
      new AuditService(),
      razorpayStub,
      availabilityStub,
    );
  }, 180_000);

  afterAll(async () => {
    await h?.stop();
  });

  it(`awards the slot to exactly one of ${CONCURRENT_ATTEMPTS} concurrent creators, ${CONCURRENT_ATTEMPTS - 1} lose with BOOKING_SLOT_UNAVAILABLE`, async () => {
    await h.truncateAll();
    const { groundId, identityIds, bookingDate, startTime } = await seedRace(prisma, CONCURRENT_ATTEMPTS);

    const results = await Promise.allSettled(
      identityIds.map((identityId) =>
        service.create(
          {
            identityId,
            firebaseUid: `test:race-cust-${identityId}`,
            role: 'CUSTOMER',
            status: 'ACTIVE',
            isVerified: true,
          },
          { ground_id: groundId, booking_date: bookingDate, start_time: startTime },
          { requestId: `race-${identityId}` },
        ),
      ),
    );

    const winners = results.filter((r) => r.status === 'fulfilled');
    const losers = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];

    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(CONCURRENT_ATTEMPTS - 1);
    for (const l of losers) {
      expect(l.reason).toBeInstanceOf(DomainException);
      expect((l.reason as DomainException).code).toBe('BOOKING_SLOT_UNAVAILABLE');
    }

    // Confirm the DB agrees: exactly one ACTIVE row for the raced slot.
    const active = await prisma.bookingSession.count({
      where: {
        groundId,
        bookingDate: new Date(`${bookingDate}T00:00:00Z`),
        startTime: new Date(`1970-01-01T${startTime}:00Z`),
        status: 'ACTIVE',
      },
    });
    expect(active).toBe(1);
  });
});

// ── fixture ──────────────────────────────────────────────────────────────

async function seedRace(prisma: PrismaClient, participants: number) {
  const sport = await prisma.sport.findFirst({ where: { code: 'FOOTBALL' } });
  if (!sport) throw new Error('sports seed missing FOOTBALL');

  // Partner identity + partner.
  const partnerIdentity = await prisma.identity.create({
    data: { firebaseUid: 'test:race-partner', phone: '+919000000000', role: 'PARTNER' },
  });
  const partner = await prisma.partner.create({
    data: {
      identityId: partnerIdentity.id,
      businessName: 'Race Test Sports',
      displayName: 'Race Test',
      phone: '+919000000000',
      address: '1 Test Rd, Nashik',
      city: 'Nashik',
      state: 'Maharashtra',
      status: 'ACTIVE',
      isVerified: true,
    },
  });
  const venue = await prisma.venue.create({
    data: {
      partnerId: partner.id,
      name: 'Race Test Venue',
      slug: 'race-test-venue',
      address: '1 Test Rd, Nashik',
      city: 'Nashik',
      state: 'Maharashtra',
      postalCode: '422013',
      latitude: 20.0059,
      longitude: 73.7784,
      amenities: [],
      status: 'PUBLISHED',
    },
  });
  const ground = await prisma.ground.create({
    data: {
      venueId: venue.id,
      sportId: sport.id,
      name: 'Race Ground',
      surfaceType: 'ARTIFICIAL_TURF',
      maxPlayers: 12,
      lighting: true,
      status: 'ACTIVE',
    },
  });
  await prisma.groundConfiguration.create({
    data: {
      groundId: ground.id,
      bookingDuration: 60,
      bookingInterval: 60,
      maxAdvanceBookingDays: 30,
      minNoticeMinutes: 30,
      cancellationWindowHours: 4,
    },
  });
  await prisma.pricingRule.create({
    data: {
      groundId: ground.id,
      name: 'flat',
      dayOfWeek: null,
      startTime: new Date('1970-01-01T00:00:00Z'),
      endTime: new Date('1970-01-01T23:59:00Z'),
      pricePerSlot: 800,
      priority: 1,
      active: true,
    },
  });

  // Customers — one per would-be racer, all phone-verified so
  // assertPhoneVerified() passes.
  const identityIds: string[] = [];
  for (let i = 0; i < participants; i++) {
    const c = await prisma.identity.create({
      data: {
        firebaseUid: `test:race-cust-${i}`,
        phone: `+9198000${String(i).padStart(5, '0')}`,
        role: 'CUSTOMER',
        phoneVerifiedAt: new Date(),
      },
    });
    identityIds.push(c.id);
  }

  // Slot: tomorrow at 12:00 IST — safely past min-notice (30m) and within
  // the max-advance window (30d). Same date/start_time for every racer.
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const bookingDate = tomorrow.toISOString().slice(0, 10);
  const startTime = '12:00';

  return { groundId: ground.id, identityIds, bookingDate, startTime };
}
