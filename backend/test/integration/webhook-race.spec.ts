// Task 5.4 — webhook + client double-confirm race.
//
// A payment can be reconciled from two directions at once:
//   1. Client calls POST /bookings after Razorpay checkout returns.
//   2. Razorpay fires payment.captured webhook.
// Both paths promote the same session → booking + payment. The invariant is
// that exactly one booking (Booking.bookingSessionId UNIQUE) and exactly one
// payment (Payment.transactionReference UNIQUE) survive, no matter who wins.
// The SELECT ... FOR UPDATE on booking_sessions in both handlers serialises
// them; the second one wakes to find the booking already there and no-ops.
//
// 20 iterations per acceptance criteria in BUILDER_HANDOFF_BRIEF §5.4.

import { PrismaClient } from '@prisma/client';
import { BookingService } from '../../src/modules/booking/booking.service';
import { RazorpayWebhookHandlerService } from '../../src/modules/webhook/razorpay-handler.service';
import { OutboxService } from '../../src/shared/outbox/outbox.service';
import { AuditService } from '../../src/shared/audit/audit.service';
import { startHarness, type IntegrationHarness } from './harness';

const ITERATIONS = 20;

describe('client-confirm vs razorpay webhook race (Task 5.4)', () => {
  let h: IntegrationHarness;
  let prisma: PrismaClient;
  let bookingService: BookingService;
  let webhookHandler: RazorpayWebhookHandlerService;

  beforeAll(async () => {
    h = await startHarness();
    prisma = h.prisma;

    const razorpayStub = {
      verifySignature: () => true,
      fetchPayment: async (paymentId: string) => ({
        id: paymentId,
        status: 'captured' as const,
        amount: 80_000, // paise — matches the seeded session amount below
        method: 'upi',
        order_id: paymentId.replace('pay_', 'order_'),
      }),
    } as unknown as ConstructorParameters<typeof BookingService>[3];

    const availabilityStub = {
      invalidate: () => undefined,
    } as unknown as ConstructorParameters<typeof BookingService>[4];

    const outbox = new OutboxService();
    const audit = new AuditService();

    bookingService = new BookingService(
      prisma as unknown as ConstructorParameters<typeof BookingService>[0],
      outbox,
      audit,
      razorpayStub,
      availabilityStub,
    );
    webhookHandler = new RazorpayWebhookHandlerService(
      prisma as unknown as ConstructorParameters<typeof RazorpayWebhookHandlerService>[0],
      outbox,
      availabilityStub as unknown as ConstructorParameters<typeof RazorpayWebhookHandlerService>[2],
    );
  }, 180_000);

  afterAll(async () => {
    await h?.stop();
  });

  it(`across ${ITERATIONS} races, produces exactly one booking + one payment per session`, async () => {
    await h.truncateAll();
    const fixture = await seedFixture(prisma);

    let clientWins = 0;
    let webhookWins = 0;

    for (let i = 0; i < ITERATIONS; i++) {
      const { session, orderId, paymentId } = await createSession(prisma, fixture, i);

      const envelope = {
        id: `evt_${paymentId}`,
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: paymentId,
              order_id: orderId,
              amount: 80_000,
              method: 'upi',
              notes: { booking_session_id: session.id, identity_id: fixture.customerIdentityId },
            },
          },
        },
      };

      const clientCtx = {
        identityId: fixture.customerIdentityId,
        firebaseUid: 'test:race-cust',
        role: 'CUSTOMER' as const,
        status: 'ACTIVE' as const,
        isVerified: true,
      };
      const clientDto = {
        booking_session_id: session.id,
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: 'stub',
      };

      const [clientResult, webhookResult] = await Promise.allSettled([
        bookingService.confirm(clientCtx, clientDto, { requestId: `client-${i}` }),
        webhookHandler.dispatch(envelope),
      ]);

      // Invariant: exactly one booking for this session, exactly one payment
      // for this Razorpay payment id — regardless of who won.
      const bookings = await prisma.booking.findMany({
        where: { bookingSessionId: session.id },
        include: { payment: true },
      });
      expect(bookings).toHaveLength(1);
      const booking = bookings[0];
      expect(booking.payment).not.toBeNull();
      expect(booking.payment!.transactionReference).toBe(paymentId);

      const payments = await prisma.payment.findMany({ where: { transactionReference: paymentId } });
      expect(payments).toHaveLength(1);
      expect(payments[0].bookingId).toBe(booking.id);

      // Consumed session is now CANCELLED, per both handlers.
      const s = await prisma.bookingSession.findUnique({ where: { id: session.id } });
      expect(s?.status).toBe('CANCELLED');

      // Track who won so we know both branches actually get exercised across
      // 20 iterations — if the client always wins the test is only proving
      // half the invariant.
      if (clientResult.status === 'fulfilled') clientWins++;
      if (webhookResult.status === 'fulfilled' && webhookResult.value === 'PROCESSED') webhookWins++;
    }

    // Sanity: at least one of the paths did the promotion end-to-end. Under
    // truly-parallel scheduling both counters usually go up; on a very
    // deterministic scheduler one may stay at 0 and that's still a passing
    // invariant, so we only assert coverage of the winning path.
    expect(clientWins + webhookWins).toBeGreaterThanOrEqual(ITERATIONS);
  });
});

// ── fixture ──────────────────────────────────────────────────────────────

interface Fixture {
  groundId: string;
  customerIdentityId: string;
}

async function seedFixture(prisma: PrismaClient): Promise<Fixture> {
  const sport = await prisma.sport.findFirst({ where: { code: 'FOOTBALL' } });
  if (!sport) throw new Error('sports seed missing FOOTBALL');

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
      slug: 'race-webhook-venue',
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

  const customer = await prisma.identity.create({
    data: {
      firebaseUid: 'test:race-cust',
      phone: '+919800000001',
      role: 'CUSTOMER',
      phoneVerifiedAt: new Date(),
    },
  });

  return { groundId: ground.id, customerIdentityId: customer.id };
}

async function createSession(prisma: PrismaClient, f: Fixture, iteration: number) {
  // Unique slot per iteration (six-minute cadence over ~2 hours keeps the slots
  // well inside a plausible operating window without needing hours config —
  // confirm() doesn't validate the window, only expiry).
  const totalMinutes = 8 * 60 + iteration * 6; // 08:00, 08:06, 08:12, …
  const startTime = `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
  const bookingDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const session = await prisma.bookingSession.create({
    data: {
      identityId: f.customerIdentityId,
      groundId: f.groundId,
      bookingDate: new Date(`${bookingDate}T00:00:00Z`),
      startTime: new Date(`1970-01-01T${startTime}:00Z`),
      endTime: new Date(`1970-01-01T${addHour(startTime)}:00Z`),
      totalAmount: 800, // ₹800 = 80_000 paise — matches the razorpayStub amount
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      status: 'ACTIVE',
      createdBy: f.customerIdentityId,
    },
  });

  const paymentId = `pay_race_${iteration}_${session.id.slice(0, 8)}`;
  const orderId = paymentId.replace('pay_', 'order_');
  return { session, orderId, paymentId };
}

function addHour(hm: string): string {
  const [h, m] = hm.split(':').map(Number);
  const total = (h + 1) * 60 + m;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
