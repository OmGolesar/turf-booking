// Task 5.5 — customer golden path E2E.
//
// Drives the full customer flow over real HTTP against the real Nest app:
//   register (POST /auth/session) →
//   browse    (GET  /discovery/venues) →
//   availability (GET /discovery/grounds/:id/availability) →
//   hold slot (POST /booking-sessions) →
//   confirm   (POST /bookings)         [Razorpay payment stubbed] →
//   cancel + refund (POST /bookings/:id/actions/cancel).
//
// Uses the 5.2 testcontainers Postgres. FirebaseService + RazorpayService are
// overridden so no external credentials are required. Blueprint §12 calls for
// "docker-compose in CI"; running the AppModule in-process against a real
// Postgres container gives us the same layer coverage (routes → interceptors →
// guards → services → Prisma) without the compose orchestration overhead.

// firebase-admin transitively imports `jose` (ESM). ts-jest can't parse it
// and we don't need the real SDK — FirebaseService is overridden below.
// jest.mock is hoisted, so these run before AppModule's import chain loads
// firebase-admin.
jest.mock('firebase-admin/app', () => ({
  cert: () => ({}),
  getApps: () => [],
  initializeApp: () => ({}),
}));
jest.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ verifyIdToken: async () => ({ uid: 'unused' }) }),
}));

import type { AddressInfo } from 'net';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../../src/app.module';
import { FirebaseService } from '../../src/shared/auth/firebase.service';
import { RazorpayService } from '../../src/shared/razorpay/razorpay.service';
import { ValidationPipe } from '../../src/shared/validation/validation.pipe';
import { startHarness, type IntegrationHarness } from '../integration/harness';

const CUSTOMER_UID = 'e2e:customer';
const CUSTOMER_EMAIL = 'e2e.customer@example.invalid';
const CUSTOMER_PHONE = '+919812345678';

describe('customer golden path E2E (Task 5.5)', () => {
  let h: IntegrationHarness;
  let app: INestApplication;
  let baseUrl: string;
  let prisma: PrismaClient;
  let fixture: { venueId: string; groundId: string };

  beforeAll(async () => {
    h = await startHarness();
    prisma = h.prisma;
    // AppModule instantiates PrismaService via new PrismaClient() which reads
    // DATABASE_URL from process.env — point it at the testcontainer.
    process.env.DATABASE_URL = h.databaseUrl;

    const firebaseStub = {
      // Any non-empty bearer minted here maps to our fake customer. The auth
      // service and guard both call verifyIdToken(); one implementation covers
      // both call sites.
      verifyIdToken: async () => ({
        uid: CUSTOMER_UID,
        email: CUSTOMER_EMAIL,
        phone_number: CUSTOMER_PHONE,
        email_verified: true,
        name: 'E2E Customer',
      }),
    };

    const razorpayStub = {
      keyId: () => 'rzp_test_e2e',
      createOrder: async (amountPaise: number, receipt: string) => ({
        id: `order_e2e_${receipt}`,
        amount: amountPaise,
        currency: 'INR',
      }),
      fetchPayment: async (paymentId: string) => ({
        id: paymentId,
        status: 'captured' as const,
        amount: 80_000,
        method: 'upi',
        order_id: paymentId.replace(/^pay_/, 'order_'),
      }),
      createRefund: async (paymentId: string, amountPaise: number) => ({
        id: `rfnd_${paymentId}`,
        amount: amountPaise,
        status: 'processed',
      }),
      verifySignature: () => true,
      verifyWebhookSignature: () => true,
    };

    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(FirebaseService).useValue(firebaseStub)
      .overrideProvider(RazorpayService).useValue(razorpayStub)
      .compile();

    app = module.createNestApplication({ rawBody: true });
    app.setGlobalPrefix('v1', { exclude: ['health'] });
    app.useGlobalPipes(new ValidationPipe());
    await app.listen(0);
    const port = (app.getHttpServer().address() as AddressInfo).port;
    baseUrl = `http://127.0.0.1:${port}`;

    fixture = await seedFixture(prisma);
  }, 240_000);

  afterAll(async () => {
    await app?.close();
    await h?.stop();
  });

  it('registers → browses → holds → confirms → cancels + refunds end-to-end', async () => {
    // 1. Register (provision Identity from the fake Firebase token).
    const session = await http<{ identity: { id: string; role: string }; is_first_session: boolean }>(
      'POST',
      '/v1/auth/session',
      { intended_role: 'CUSTOMER' },
      { Authorization: 'Bearer fake-customer-token' },
    );
    expect(session.data.identity.role).toBe('CUSTOMER');
    expect(session.data.is_first_session).toBe(true);

    // 2. Browse — seeded venue should be listed.
    const venues = await http<Array<{ id: string; name: string }>>('GET', '/v1/discovery/venues');
    expect(venues.data.some((v) => v.id === fixture.venueId)).toBe(true);

    // 3. Availability — pick tomorrow so we clear the 30-min notice window.
    const bookingDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const availability = await http<{ slots: Array<{ start_time: string; state: string }> }>(
      'GET',
      `/v1/discovery/grounds/${fixture.groundId}/availability?date=${bookingDate}`,
    );
    const openSlot = availability.data.slots.find((s) => s.state === 'AVAILABLE');
    if (!openSlot) throw new Error(`no AVAILABLE slot for ${bookingDate}`);

    // 4. Hold the slot.
    const held = await http<{
      session: { id: string };
      payment_order: { order_id: string };
    }>(
      'POST',
      '/v1/booking-sessions',
      { ground_id: fixture.groundId, booking_date: bookingDate, start_time: openSlot.start_time },
      { Authorization: 'Bearer fake-customer-token', 'Idempotency-Key': randomUUID() },
    );
    const bookingSessionId = held.data.session.id;
    const orderId = held.data.payment_order.order_id;

    // 5. Confirm — Razorpay signature/fetch are stubbed to succeed. Encode
    // the order id inside the payment id so the fetchPayment stub returns a
    // matching order_id and BookingService.confirm's cross-check passes.
    const paymentId = orderId.replace(/^order_/, 'pay_');
    const confirmed = await http<{
      booking: { id: string; booking_status: string; reference_code: string };
      payment: { status: string };
    }>(
      'POST',
      '/v1/bookings',
      {
        booking_session_id: bookingSessionId,
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: 'stub-signature',
      },
      { Authorization: 'Bearer fake-customer-token', 'Idempotency-Key': randomUUID() },
    );
    const bookingId = confirmed.data.booking.id;
    expect(confirmed.data.booking.booking_status).toBe('CONFIRMED');
    expect(confirmed.data.payment.status).toBe('SUCCESS');

    // 6. Cancel + refund — refund happens inside the cancel tx.
    const cancelled = await http<{
      booking: { booking_status: string };
      refund: { amount_paise: number; reference: string | null };
    }>(
      'POST',
      `/v1/bookings/${bookingId}/actions/cancel`,
      { reason: 'e2e change of plans' },
      { Authorization: 'Bearer fake-customer-token', 'Idempotency-Key': randomUUID() },
    );
    expect(cancelled.data.booking.booking_status).toBe('CANCELLED');
    expect(cancelled.data.refund.amount_paise).toBe(80_000);
    expect(cancelled.data.refund.reference).toMatch(/^rfnd_pay_/);

    // Ground-truth: DB agrees.
    const dbBooking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { payment: true } });
    expect(dbBooking?.bookingStatus).toBe('CANCELLED');
    expect(dbBooking?.cancellationReason).toBe('e2e change of plans');
    expect(dbBooking?.payment?.paymentStatus).toBe('REFUNDED');
  }, 120_000);

  // ── mini HTTP client ────────────────────────────────────────────────────

  interface Envelope<T> {
    success: boolean;
    data: T;
    error?: { code: string; message: string };
  }

  async function http<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<Envelope<T>> {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(headers ?? {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const json = (await res.json()) as Envelope<T>;
    if (!res.ok || !json.success) {
      throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(json.error ?? json)}`);
    }
    return json;
  }
});

// ── fixture ──────────────────────────────────────────────────────────────

async function seedFixture(prisma: PrismaClient): Promise<{ venueId: string; groundId: string }> {
  const sport = await prisma.sport.findFirst({ where: { code: 'FOOTBALL' } });
  if (!sport) throw new Error('sports seed missing FOOTBALL');

  const partnerIdentity = await prisma.identity.create({
    data: { firebaseUid: 'e2e:partner', phone: '+919000000010', role: 'PARTNER' },
  });
  const partner = await prisma.partner.create({
    data: {
      identityId: partnerIdentity.id,
      businessName: 'E2E Turf Pvt Ltd',
      displayName: 'E2E Turf',
      phone: '+919000000010',
      address: '10 E2E Rd, Nashik',
      city: 'Nashik',
      state: 'Maharashtra',
      status: 'ACTIVE',
      isVerified: true,
    },
  });
  const venue = await prisma.venue.create({
    data: {
      partnerId: partner.id,
      name: 'E2E Turf Venue',
      slug: 'e2e-turf-venue',
      description: 'Fixture for customer-golden E2E',
      address: '10 E2E Rd, Nashik',
      city: 'Nashik',
      state: 'Maharashtra',
      postalCode: '422013',
      latitude: 20.0059,
      longitude: 73.7784,
      amenities: ['parking', 'washroom'],
      status: 'PUBLISHED',
    },
  });
  const ground = await prisma.ground.create({
    data: {
      venueId: venue.id,
      sportId: sport.id,
      name: 'E2E Ground A',
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
      pricePerSlot: 800, // matches razorpayStub fetchPayment amount (80_000 paise)
      priority: 1,
      active: true,
    },
  });
  // Open 06:00-22:00 every day so tomorrow always has AVAILABLE slots.
  for (let dow = 1; dow <= 7; dow++) {
    await prisma.operatingHour.create({
      data: {
        groundId: ground.id,
        dayOfWeek: dow,
        openingTime: new Date('1970-01-01T06:00:00Z'),
        closingTime: new Date('1970-01-01T22:00:00Z'),
        isClosed: false,
      },
    });
  }

  return { venueId: venue.id, groundId: ground.id };
}
