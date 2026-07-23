// Task 5.6 — partner golden path E2E.
//
// Drives the full partner onboarding + operations flow over real HTTP:
//   partner /auth/session  →  POST /partners
//   → POST /venues (DRAFT)
//   → POST /venues/:v/grounds (DRAFT)
//   → PUT  /grounds/:g/configuration
//   → PUT  /grounds/:g/operating-hours
//   → POST /grounds/:g/pricing-rules
//   → POST /grounds/:g/actions/activate
//   → POST /venues/:v/actions/submit-for-review
//   → [admin flip] venue → PUBLISHED  (no HTTP admin endpoint yet)
//   → customer /auth/session
//   → customer books via booking-sessions + bookings
//   → GET  /partners/me/bookings                   (partner observes)
//
// Boots the real AppModule in-process (same pattern as 5.5) against the 5.2
// testcontainers Postgres. FirebaseService + RazorpayService overridden; the
// firebase stub picks partner vs customer identity by the bearer value.

// See 5.5 for the jose/firebase-admin story — same fix here.
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

const PARTNER_TOKEN = 'partner-token';
const CUSTOMER_TOKEN = 'customer-token';

const PARTNER_CLAIMS = {
  uid: 'e2e:partner',
  email: 'e2e.partner@example.invalid',
  phone_number: '+919000000042',
  email_verified: true,
  name: 'Partner E2E',
};
const CUSTOMER_CLAIMS = {
  uid: 'e2e:partner-flow-customer',
  email: 'e2e.pfcust@example.invalid',
  phone_number: '+919812340042',
  email_verified: true,
  name: 'Customer E2E',
};

describe('partner golden path E2E (Task 5.6)', () => {
  let h: IntegrationHarness;
  let app: INestApplication;
  let baseUrl: string;
  let prisma: PrismaClient;

  beforeAll(async () => {
    h = await startHarness();
    prisma = h.prisma;
    process.env.DATABASE_URL = h.databaseUrl;

    const firebaseStub = {
      // Token → claims mapping is the whole auth surface these tests need.
      verifyIdToken: async (token: string) => {
        if (token === PARTNER_TOKEN) return PARTNER_CLAIMS;
        if (token === CUSTOMER_TOKEN) return CUSTOMER_CLAIMS;
        throw new Error(`unrecognised test token: ${token}`);
      },
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
        amount: 90_000, // 900 rupees matches the pricing rule we create below
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
  }, 240_000);

  afterAll(async () => {
    await app?.close();
    await h?.stop();
  });

  it('onboards partner → catalog → hours + pricing → activate → publish → customer books → partner sees it', async () => {
    // 1. Partner registers. X-App-Variant + verified email + phone are what
    // let the auth service assign role=PARTNER (see resolveIntendedRole).
    const authPartner = await http<{ identity: { id: string; role: string } }>(
      'POST',
      '/v1/auth/session',
      { intended_role: 'PARTNER' },
      { Authorization: `Bearer ${PARTNER_TOKEN}`, 'X-App-Variant': 'PARTNER' },
    );
    expect(authPartner.data.identity.role).toBe('PARTNER');

    // 2. Create partner record.
    const partner = await http<{ id: string }>(
      'POST',
      '/v1/partners',
      {
        business_name: 'E2E Partner Sports Pvt Ltd',
        display_name: 'E2E Partner Sports',
        email: PARTNER_CLAIMS.email,
        phone: PARTNER_CLAIMS.phone_number,
        address: '2 Partner Rd, Nashik',
        city: 'Nashik',
        state: 'Maharashtra',
      },
      partnerHeaders(),
    );
    const partnerId = partner.data.id;

    // 3. Create venue (DRAFT).
    const venue = await http<{ id: string; status: string; slug: string }>(
      'POST',
      '/v1/venues',
      {
        name: 'E2E Partner Venue',
        slug: `e2e-partner-venue-${randomUUID().slice(0, 8)}`,
        description: 'Fixture for partner-golden E2E',
        address: '2 Partner Rd, Nashik',
        city: 'Nashik',
        state: 'Maharashtra',
        postal_code: '422013',
        latitude: 20.0059,
        longitude: 73.7784,
        amenities: ['parking', 'washroom'],
      },
      partnerHeaders(),
    );
    const venueId = venue.data.id;
    expect(venue.data.status).toBe('DRAFT');

    // 4. Create ground (DRAFT).
    const sport = await prisma.sport.findFirstOrThrow({ where: { code: 'FOOTBALL' } });
    const ground = await http<{ id: string; status: string }>(
      'POST',
      `/v1/venues/${venueId}/grounds`,
      {
        name: 'E2E Ground Alpha',
        sport_id: sport.id,
        surface_type: 'ARTIFICIAL_TURF',
        max_players: 12,
        lighting: true,
      },
      partnerHeaders(),
    );
    const groundId = ground.data.id;
    expect(ground.data.status).toBe('DRAFT');

    // 5. Ground configuration.
    await http('PUT', `/v1/grounds/${groundId}/configuration`, {
      booking_duration: 60,
      booking_interval: 60,
      max_advance_booking_days: 30,
      min_notice_minutes: 30,
      cancellation_window_hours: 4,
    }, partnerHeaders());

    // 6. Operating hours — open 06:00-22:00 every day.
    await http('PUT', `/v1/grounds/${groundId}/operating-hours`, {
      hours: Array.from({ length: 7 }, (_, i) => ({
        day_of_week: i + 1,
        opening_time: '06:00',
        closing_time: '22:00',
        is_closed: false,
      })),
    }, partnerHeaders());

    // 7. Pricing rule — flat ₹900 all day.
    await http('POST', `/v1/grounds/${groundId}/pricing-rules`, {
      name: 'flat',
      start_time: '00:00',
      end_time: '23:59',
      price_per_slot: 900,
      priority: 1,
      active: true,
    }, partnerHeaders());

    // 8. Activate ground. Service checks config + hours + pricing all exist.
    const activated = await http<{ status: string }>(
      'POST',
      `/v1/grounds/${groundId}/actions/activate`,
      {},
      partnerHeaders(),
    );
    expect(activated.data.status).toBe('ACTIVE');

    // 9. Submit venue for review.
    const submitted = await http<{ status: string }>(
      'POST',
      `/v1/venues/${venueId}/actions/submit-for-review`,
      {},
      partnerHeaders(),
    );
    expect(submitted.data.status).toBe('UNDER_REVIEW');

    // 10. Admin publish. No HTTP admin endpoint yet — flip the row directly
    // (blueprint task 5.6 explicitly names this as "via test admin").
    // ponytail: replace with an admin action call when that route lands.
    await prisma.venue.update({ where: { id: venueId }, data: { status: 'PUBLISHED' } });

    // 11. Customer registers (separate identity, separate bearer).
    const authCustomer = await http<{ identity: { role: string } }>(
      'POST',
      '/v1/auth/session',
      { intended_role: 'CUSTOMER' },
      { Authorization: `Bearer ${CUSTOMER_TOKEN}` },
    );
    expect(authCustomer.data.identity.role).toBe('CUSTOMER');

    // 12. Customer books through the newly-published venue.
    const bookingDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const availability = await http<{ slots: Array<{ start_time: string; state: string }> }>(
      'GET',
      `/v1/discovery/grounds/${groundId}/availability?date=${bookingDate}`,
    );
    const openSlot = availability.data.slots.find((s) => s.state === 'AVAILABLE');
    if (!openSlot) throw new Error(`no AVAILABLE slot on ${bookingDate}`);

    const held = await http<{ session: { id: string }; payment_order: { order_id: string } }>(
      'POST',
      '/v1/booking-sessions',
      { ground_id: groundId, booking_date: bookingDate, start_time: openSlot.start_time },
      customerHeaders({ 'Idempotency-Key': randomUUID() }),
    );
    const paymentId = held.data.payment_order.order_id.replace(/^order_/, 'pay_');
    const booking = await http<{ booking: { id: string; booking_status: string; reference_code: string } }>(
      'POST',
      '/v1/bookings',
      {
        booking_session_id: held.data.session.id,
        razorpay_order_id: held.data.payment_order.order_id,
        razorpay_payment_id: paymentId,
        razorpay_signature: 'stub',
      },
      customerHeaders({ 'Idempotency-Key': randomUUID() }),
    );
    expect(booking.data.booking.booking_status).toBe('CONFIRMED');
    const bookingId = booking.data.booking.id;
    const bookingRef = booking.data.booking.reference_code;

    // 13. Partner observes the booking on their inbox.
    const partnerBookings = await http<
      Array<{ id: string; reference_code: string; booking_status: string; ground: { id: string } }>
    >('GET', '/v1/partners/me/bookings', undefined, partnerHeaders());

    const found = partnerBookings.data.find((b) => b.id === bookingId);
    expect(found).toBeDefined();
    expect(found!.reference_code).toBe(bookingRef);
    expect(found!.booking_status).toBe('CONFIRMED');
    expect(found!.ground.id).toBe(groundId);

    // Belt-and-suspenders: DB agrees on ownership.
    const dbBooking = await prisma.booking.findUnique({ where: { id: bookingId } });
    expect(dbBooking?.partnerId).toBe(partnerId);
    expect(dbBooking?.venueId).toBe(venueId);
    expect(dbBooking?.groundId).toBe(groundId);
  }, 180_000);

  // ── mini HTTP client (same shape as 5.5) ────────────────────────────────

  interface Envelope<T> {
    success: boolean;
    data: T;
    error?: { code: string; message: string };
  }

  async function http<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH',
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

  function partnerHeaders(extra?: Record<string, string>): Record<string, string> {
    return { Authorization: `Bearer ${PARTNER_TOKEN}`, 'X-App-Variant': 'PARTNER', ...(extra ?? {}) };
  }
  function customerHeaders(extra?: Record<string, string>): Record<string, string> {
    return { Authorization: `Bearer ${CUSTOMER_TOKEN}`, ...(extra ?? {}) };
  }
});
