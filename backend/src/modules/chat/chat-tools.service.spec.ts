import { ChatToolsService } from './chat-tools.service';
import { DomainException } from '../../shared/errors/domain.exception';

// Tools are thin adapters. What we care about:
//   1. Routing: name → correct downstream call, with coerced args.
//   2. Compaction: LLM-facing payload is small (no image URLs, media rows, etc.).
//   3. Error wrapping: a DomainException becomes { ok: false, error: {...} }.
//   4. Unknown tool → { ok: false, error.code: UNKNOWN_TOOL }.

describe('ChatToolsService', () => {
  function build(overrides: {
    discovery?: any;
    availability?: any;
    recommender?: any;
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
        id: 'v1',
        name: 'V1',
        slug: 'v1',
        area: 'Panchavati',
        address: '...',
        average_rating: 4.5,
        total_reviews: 30,
        starting_price_paise: 60000,
        amenities: [],
        operating_summary: { typical_hours: '06:00 – 23:00', closed_days: [] },
        grounds: [
          {
            id: 'g1',
            name: 'G1',
            sport: { code: 'CRICKET' },
            indoor: false,
            max_players: 22,
            starting_price_paise: 60000,
          },
        ],
      }),
    };
    const availability = overrides.availability ?? {
      getSlots: jest.fn().mockResolvedValue({
        ground_id: 'g1',
        date: '2026-08-04',
        day_of_week: 1,
        timezone: 'Asia/Kolkata',
        slots: [
          { start_time: '19:00', end_time: '20:00', state: 'AVAILABLE', price_paise: 60000, matched_pricing_rule_id: 'p1' },
          { start_time: '20:00', end_time: '21:00', state: 'BOOKED', price_paise: 60000, matched_pricing_rule_id: 'p1' },
        ],
      }),
    };
    const recommender = overrides.recommender ?? {
      recommend: jest.fn().mockResolvedValue([{ venue_id: 'v1', venue_name: 'V1', score: 0.8 }]),
    };
    return {
      svc: new ChatToolsService(discovery, availability, recommender),
      discovery,
      availability,
      recommender,
    };
  }

  it('search_venues → discovery.listVenues with sport array + limit', async () => {
    const { svc, discovery } = build();
    const r = await svc.execute('search_venues', { q: 'panchavati', sport: 'CRICKET', limit: 3 });
    expect(discovery.listVenues).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'panchavati', sport: ['CRICKET'], limit: 3 }),
    );
    expect(r.ok).toBe(true);
  });

  it('find_nearby_venues → discovery.listVenues with near param', async () => {
    const { svc, discovery } = build();
    const r = await svc.execute('find_nearby_venues', { lat: 20.0, lng: 73.78, sport: 'FOOTBALL' });
    expect(discovery.listVenues).toHaveBeenCalledWith(
      expect.objectContaining({ near: '20,73.78', sport: ['FOOTBALL'] }),
    );
    expect(r.ok).toBe(true);
    expect((r.data as any).venues[0]).toHaveProperty('sports', ['CRICKET']);
  });

  it('find_nearby_venues → missing lat/lng returns validation error, not exception', async () => {
    const { svc } = build();
    const r = await svc.execute('find_nearby_venues', { lng: 73.78 });
    expect(r.ok).toBe(false);
    expect(r.error?.code).toBe('VALIDATION_FAILED');
  });

  it('get_venue_details → discovery.venueDetail with null auth ctx', async () => {
    const { svc, discovery } = build();
    const r = await svc.execute('get_venue_details', { venue_id_or_slug: 'v1' });
    expect(discovery.venueDetail).toHaveBeenCalledWith('v1', null);
    expect(r.ok).toBe(true);
  });

  it('check_availability → availability.getSlots with duration override', async () => {
    const { svc, availability } = build();
    const r = await svc.execute('check_availability', { ground_id: 'g1', date: '2026-08-04', duration_minutes: 90 });
    expect(availability.getSlots).toHaveBeenCalledWith('g1', '2026-08-04', 90);
    expect(r.ok).toBe(true);
    expect((r.data as any).available_count).toBe(1);
  });

  it('recommend_best → recommender.recommend passes filters through', async () => {
    const { svc, recommender } = build();
    const r = await svc.execute('recommend_best', {
      lat: 20,
      lng: 73.78,
      date: '2026-08-04',
      sport_code: 'CRICKET',
      max_price_rupees: 800,
    });
    expect(recommender.recommend).toHaveBeenCalledWith(
      expect.objectContaining({ lat: 20, lng: 73.78, sport_code: 'CRICKET', max_price_rupees: 800 }),
    );
    expect(r.ok).toBe(true);
  });

  it('wraps DomainException as { ok: false, error: {...} }', async () => {
    const discovery = {
      listVenues: jest.fn().mockRejectedValue(new DomainException('VENUE_NOT_FOUND')),
    };
    const { svc } = build({ discovery });
    const r = await svc.execute('search_venues', {});
    expect(r.ok).toBe(false);
    expect(r.error?.code).toBe('VENUE_NOT_FOUND');
  });

  it('unknown tool returns { ok: false, error.code: UNKNOWN_TOOL }', async () => {
    const { svc } = build();
    const r = await svc.execute('drop_database', {});
    expect(r.ok).toBe(false);
    expect(r.error?.code).toBe('UNKNOWN_TOOL');
  });
});
