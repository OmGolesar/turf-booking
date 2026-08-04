import { BookingSource, Role } from '@prisma/client';
import { ChatToolsService } from './chat-tools.service';
import { DomainException } from '../../shared/errors/domain.exception';
import type { AuthContext } from '../../shared/auth/auth-context';

// Tools are thin adapters. What we care about:
//   1. Routing: name → correct downstream call, with coerced args.
//   2. Compaction: LLM-facing payload is small.
//   3. Error wrapping: DomainException → { ok: false, error: {...} }.
//   4. Unknown tool → { ok: false, error.code: UNKNOWN_TOOL }.
//   5. Auth: booking tools reject guests with CHAT_AUTH_REQUIRED.
//   6. Handoff: hold_slot returns a Razorpay handoff at the top level.

const customerAuth: AuthContext = {
  identityId: '00000000-0000-0000-0000-000000000001',
  firebaseUid: 'test:cust',
  role: Role.CUSTOMER,
  status: 'ACTIVE',
  isVerified: true,
};

const guestCtx = { auth: null, requestId: 'req-1' };
const customerCtx = { auth: customerAuth, requestId: 'req-1' };

describe('ChatToolsService', () => {
  function build(overrides: {
    discovery?: any;
    availability?: any;
    recommender?: any;
    bookingSessions?: any;
    bookings?: any;
    customers?: any;
  } = {}) {
    const discovery = overrides.discovery ?? {
      listVenues: jest.fn().mockResolvedValue({
        data: [
          {
            id: 'v1',
            name: 'V1',
            slug: 'v1',
            area: 'Panchavati',
            address: '...',
            average_rating: 4.5,
            total_reviews: 30,
            starting_price_paise: 60000,
            supported_sports: [{ code: 'CRICKET', display_name: 'Cricket', icon_url: null }],
            distance_km: 1.2,
          },
        ],
        pagination: { cursor: null, next_cursor: null, has_more: false, total: null },
      }),
      venueDetail: jest.fn().mockResolvedValue({
        id: 'v1', name: 'V1', slug: 'v1', area: 'Panchavati', address: '...',
        average_rating: 4.5, total_reviews: 30, starting_price_paise: 60000,
        amenities: [], operating_summary: { typical_hours: '06:00 – 23:00', closed_days: [] },
        grounds: [{ id: 'g1', name: 'G1', sport: { code: 'CRICKET' }, indoor: false, max_players: 22, starting_price_paise: 60000 }],
      }),
    };
    const availability = overrides.availability ?? {
      getSlots: jest.fn().mockResolvedValue({
        ground_id: 'g1', date: '2026-08-04', day_of_week: 1, timezone: 'Asia/Kolkata',
        slots: [
          { start_time: '19:00', end_time: '20:00', state: 'AVAILABLE', price_paise: 60000, matched_pricing_rule_id: 'p1' },
        ],
      }),
    };
    const recommender = overrides.recommender ?? {
      recommend: jest.fn().mockResolvedValue([{ venue_id: 'v1', score: 0.8 }]),
    };
    const bookingSessions = overrides.bookingSessions ?? {
      create: jest.fn().mockResolvedValue({
        session: {
          id: 'sess-1', identity_id: customerAuth.identityId, ground_id: 'g1',
          booking_date: '2026-08-04', start_time: '19:00', end_time: '20:00',
          total_amount_paise: 60000, currency: 'INR', expires_at: '2026-08-04T13:40:00Z',
          status: 'ACTIVE', matched_pricing_rule_id: 'p1',
        },
        payment_order: {
          provider: 'RAZORPAY', order_id: 'order_test_1', amount_paise: 60000,
          currency: 'INR', razorpay_key_id: 'rzp_test_key',
        },
        customer: { identity_id: customerAuth.identityId, reference_code: null, name: null, phone: '+91', email: null },
      }),
    };
    const bookings = overrides.bookings ?? {
      cancel: jest.fn().mockResolvedValue({
        booking: { id: 'book-1', booking_status: 'CANCELLED', cancelled_at: '2026-08-04T13:00:00Z', cancellation_reason: null },
        refund: { amount_paise: 60000, expected_settlement_days: 5, reference: 'rfnd_x' },
      }),
    };
    const customers = overrides.customers ?? {
      listMyBookings: jest.fn().mockResolvedValue({
        data: [
          {
            id: 'book-1', reference_code: 'TX-BK-2026000001',
            venue: { id: 'v1', name: 'V1', cover_image_url: null, area: 'X', city: 'Nashik' },
            ground: { id: 'g1', name: 'G1', sport: { code: 'CRICKET', display_name: 'Cricket', icon_url: null } },
            booking_date: '2026-08-10', start_time: '19:00', end_time: '20:00',
            booking_status: 'CONFIRMED', total_amount_paise: 60000,
            payment: null, can_cancel: true, cancel_deadline: null, review: null, created_at: '',
          },
        ],
        pagination: { cursor: null, next_cursor: null, has_more: false, total: null },
      }),
    };
    return {
      svc: new ChatToolsService(discovery, availability, recommender, bookingSessions, bookings, customers),
      discovery, availability, recommender, bookingSessions, bookings, customers,
    };
  }

  // ── Discovery tools (regression) ─────────────────────────────────────

  it('search_venues → discovery.listVenues with sport array + limit', async () => {
    const { svc, discovery } = build();
    const r = await svc.execute('search_venues', { q: 'panchavati', sport: 'CRICKET', limit: 3 }, guestCtx);
    expect(discovery.listVenues).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'panchavati', sport: ['CRICKET'], limit: 3 }),
    );
    expect(r.ok).toBe(true);
  });

  it('find_nearby_venues → discovery.listVenues with near param', async () => {
    const { svc, discovery } = build();
    const r = await svc.execute('find_nearby_venues', { lat: 20.0, lng: 73.78, sport: 'FOOTBALL' }, guestCtx);
    expect(discovery.listVenues).toHaveBeenCalledWith(
      expect.objectContaining({ near: '20,73.78', sport: ['FOOTBALL'] }),
    );
    expect(r.ok).toBe(true);
  });

  it('find_nearby_venues → missing lat/lng returns validation error', async () => {
    const { svc } = build();
    const r = await svc.execute('find_nearby_venues', { lng: 73.78 }, guestCtx);
    expect(r.ok).toBe(false);
    expect(r.error?.code).toBe('VALIDATION_FAILED');
  });

  it('check_availability → availability.getSlots with duration override', async () => {
    const { svc, availability } = build();
    const r = await svc.execute('check_availability', { ground_id: 'g1', date: '2026-08-04', duration_minutes: 90 }, guestCtx);
    expect(availability.getSlots).toHaveBeenCalledWith('g1', '2026-08-04', 90);
    expect(r.ok).toBe(true);
    expect((r.data as any).available_count).toBe(1);
  });

  it('recommend_best → recommender.recommend passes filters through', async () => {
    const { svc, recommender } = build();
    await svc.execute('recommend_best', { lat: 20, lng: 73.78, date: '2026-08-04', sport_code: 'CRICKET' }, guestCtx);
    expect(recommender.recommend).toHaveBeenCalledWith(
      expect.objectContaining({ lat: 20, lng: 73.78, sport_code: 'CRICKET' }),
    );
  });

  it('unknown tool returns UNKNOWN_TOOL', async () => {
    const { svc } = build();
    const r = await svc.execute('drop_database', {}, guestCtx);
    expect(r.ok).toBe(false);
    expect(r.error?.code).toBe('UNKNOWN_TOOL');
  });

  // ── Booking tools ────────────────────────────────────────────────────

  it('hold_slot → bookingSessions.create with CHATBOT source and returns Razorpay handoff', async () => {
    const { svc, bookingSessions } = build();
    const r = await svc.execute(
      'hold_slot',
      { ground_id: 'g1', date: '2026-08-04', start_time: '19:00', duration_minutes: 60 },
      customerCtx,
    );
    expect(bookingSessions.create).toHaveBeenCalledWith(
      customerAuth,
      { ground_id: 'g1', booking_date: '2026-08-04', start_time: '19:00', duration_minutes: 60 },
      expect.objectContaining({ requestId: 'req-1' }),
      BookingSource.CHATBOT,
    );
    expect(r.ok).toBe(true);
    // The handoff carries the payment info the client needs to open Razorpay.
    expect(r.handoff).toEqual({
      type: 'confirm_booking',
      booking_session_id: 'sess-1',
      razorpay_order_id: 'order_test_1',
      razorpay_key_id: 'rzp_test_key',
      amount_paise: 60000,
      expires_at: '2026-08-04T13:40:00Z',
    });
    // The LLM's tool_result should NOT contain the Razorpay key or session id
    // (client-only, keeps token budget lean).
    expect(JSON.stringify(r.data)).not.toContain('rzp_test_key');
    expect(JSON.stringify(r.data)).not.toContain('sess-1');
  });

  it('hold_slot → guest without auth returns CHAT_AUTH_REQUIRED (bookingSessions.create not called)', async () => {
    const { svc, bookingSessions } = build();
    const r = await svc.execute(
      'hold_slot',
      { ground_id: 'g1', date: '2026-08-04', start_time: '19:00' },
      guestCtx,
    );
    expect(r.ok).toBe(false);
    expect(r.error?.code).toBe('CHAT_AUTH_REQUIRED');
    expect(bookingSessions.create).not.toHaveBeenCalled();
    expect(r.handoff).toBeUndefined();
  });

  it('hold_slot → partner role rejected with AUTH_INSUFFICIENT_PERMISSIONS', async () => {
    const { svc } = build();
    const partnerCtx = {
      auth: { ...customerAuth, role: Role.PARTNER },
      requestId: 'req-1',
    };
    const r = await svc.execute('hold_slot', { ground_id: 'g1', date: '2026-08-04', start_time: '19:00' }, partnerCtx);
    expect(r.ok).toBe(false);
    expect(r.error?.code).toBe('AUTH_INSUFFICIENT_PERMISSIONS');
  });

  it('hold_slot → bubbles IDENTITY_PHONE_NOT_VERIFIED from booking service', async () => {
    const bookingSessions = { create: jest.fn().mockRejectedValue(new DomainException('IDENTITY_PHONE_NOT_VERIFIED')) };
    const { svc } = build({ bookingSessions });
    const r = await svc.execute('hold_slot', { ground_id: 'g1', date: '2026-08-04', start_time: '19:00' }, customerCtx);
    expect(r.ok).toBe(false);
    expect(r.error?.code).toBe('IDENTITY_PHONE_NOT_VERIFIED');
  });

  it('get_my_bookings → customers.listMyBookings with defaults', async () => {
    const { svc, customers } = build();
    const r = await svc.execute('get_my_bookings', {}, customerCtx);
    expect(customers.listMyBookings).toHaveBeenCalledWith(
      customerAuth,
      expect.objectContaining({ limit: 5 }),
    );
    expect(r.ok).toBe(true);
    expect((r.data as any).bookings[0].reference_code).toBe('TX-BK-2026000001');
  });

  it('get_my_bookings → guest rejected', async () => {
    const { svc } = build();
    const r = await svc.execute('get_my_bookings', {}, guestCtx);
    expect(r.ok).toBe(false);
    expect(r.error?.code).toBe('CHAT_AUTH_REQUIRED');
  });

  it('cancel_booking → bookings.cancel with reason + refund reported', async () => {
    const { svc, bookings } = build();
    const r = await svc.execute(
      'cancel_booking',
      { booking_id_or_reference: 'TX-BK-2026000001', reason: 'plans changed' },
      customerCtx,
    );
    expect(bookings.cancel).toHaveBeenCalledWith(
      customerAuth,
      'TX-BK-2026000001',
      { reason: 'plans changed' },
      expect.objectContaining({ requestId: 'req-1' }),
    );
    expect(r.ok).toBe(true);
    expect((r.data as any).refund).toEqual({ amount_paise: 60000, expected_settlement_days: 5 });
  });

  it('cancel_booking → guest rejected', async () => {
    const { svc } = build();
    const r = await svc.execute('cancel_booking', { booking_id_or_reference: 'x' }, guestCtx);
    expect(r.ok).toBe(false);
    expect(r.error?.code).toBe('CHAT_AUTH_REQUIRED');
  });

  it('wraps DomainException as { ok: false, error: {...} }', async () => {
    const discovery = { listVenues: jest.fn().mockRejectedValue(new DomainException('VENUE_NOT_FOUND')) };
    const { svc } = build({ discovery });
    const r = await svc.execute('search_venues', {}, guestCtx);
    expect(r.ok).toBe(false);
    expect(r.error?.code).toBe('VENUE_NOT_FOUND');
  });
});
