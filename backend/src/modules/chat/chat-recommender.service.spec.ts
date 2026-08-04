import { ChatRecommenderService } from './chat-recommender.service';

// The recommender's scoring is pure once you feed it candidates + availability.
// We stub Prisma's raw candidate query and AvailabilityService.getSlots so we
// don't need a live DB. This locks in the ranking contract:
//   1. Availability filter drops candidates with no free slot.
//   2. Rankings favor closer + higher-rated + cheaper.
//   3. Budget cap drops over-price candidates entirely.

describe('ChatRecommenderService', () => {
  function build(candidates: any[], slotsByGround: Record<string, any>) {
    const prisma = { $queryRaw: jest.fn().mockResolvedValue(candidates) } as any;
    const availability = {
      getSlots: jest.fn(async (groundId: string) => {
        const slots = slotsByGround[groundId];
        if (!slots) throw new Error('no ground');
        return { ground_id: groundId, date: '2026-08-04', day_of_week: 1, timezone: 'Asia/Kolkata', slots };
      }),
    } as any;
    return new ChatRecommenderService(prisma, availability);
  }

  const candidate = (over: Partial<any>) => ({
    venue_id: 'v-' + over.name,
    venue_name: over.name ?? 'V',
    venue_slug: 'v-' + over.name,
    average_rating: 4,
    total_reviews: 20,
    ground_id: 'g-' + over.name,
    ground_name: 'G',
    sport_code: 'CRICKET',
    distance_km: 1,
    ...over,
  });

  const slot = (over: Partial<any>) => ({
    start_time: '19:00',
    end_time: '20:00',
    state: 'AVAILABLE',
    price_paise: 60000,
    ...over,
  });

  it('returns top 3 by weighted score', async () => {
    const svc = build(
      [
        candidate({ name: 'Close', distance_km: 0.5, average_rating: 4.5 }),
        candidate({ name: 'Far', distance_km: 8, average_rating: 5 }),
        candidate({ name: 'Mid', distance_km: 3, average_rating: 4 }),
        candidate({ name: 'FarBad', distance_km: 9, average_rating: 2 }),
      ],
      {
        'g-Close': [slot({})],
        'g-Far': [slot({})],
        'g-Mid': [slot({})],
        'g-FarBad': [slot({})],
      },
    );
    const out = await svc.recommend({ lat: 20, lng: 73, date: '2026-08-04' });
    expect(out).toHaveLength(3);
    expect(out[0].venue_name).toBe('Close'); // wins on distance
  });

  it('drops candidates whose ground has no AVAILABLE slot at the requested time', async () => {
    const svc = build(
      [
        candidate({ name: 'A', distance_km: 1 }),
        candidate({ name: 'B', distance_km: 2 }),
      ],
      {
        'g-A': [slot({ start_time: '19:00', state: 'BOOKED' })],
        'g-B': [slot({ start_time: '19:00', state: 'AVAILABLE' })],
      },
    );
    const out = await svc.recommend({ lat: 20, lng: 73, date: '2026-08-04', start_time: '19:00' });
    expect(out.map((r) => r.venue_name)).toEqual(['B']);
  });

  it('respects max_price_rupees', async () => {
    const svc = build(
      [
        candidate({ name: 'Cheap', distance_km: 5 }),
        candidate({ name: 'Pricey', distance_km: 1 }),
      ],
      {
        'g-Cheap': [slot({ price_paise: 40000 })], // ₹400
        'g-Pricey': [slot({ price_paise: 120000 })], // ₹1200
      },
    );
    const out = await svc.recommend({
      lat: 20,
      lng: 73,
      date: '2026-08-04',
      max_price_rupees: 800,
    });
    expect(out.map((r) => r.venue_name)).toEqual(['Cheap']);
  });

  it('returns empty list when no candidates within radius', async () => {
    const svc = build([], {});
    expect(await svc.recommend({ lat: 20, lng: 73, date: '2026-08-04' })).toEqual([]);
  });

  it('produces a rationale string with distance, rating, price, and slot start', async () => {
    const svc = build(
      [candidate({ name: 'Only', distance_km: 1.2, average_rating: 4.6, total_reviews: 50 })],
      { 'g-Only': [slot({ price_paise: 80000, start_time: '19:30' })] },
    );
    const [r] = await svc.recommend({ lat: 20, lng: 73, date: '2026-08-04' });
    expect(r.rationale).toMatch(/1\.2km/);
    expect(r.rationale).toMatch(/4\.6★/);
    expect(r.rationale).toMatch(/₹800/);
    expect(r.rationale).toMatch(/19:30/);
  });

  it('skips a ground whose availability call throws (no operating hours etc.)', async () => {
    const svc = build(
      [
        candidate({ name: 'A', distance_km: 1 }),
        candidate({ name: 'B', distance_km: 2 }),
      ],
      { 'g-B': [slot({})] },
    );
    const out = await svc.recommend({ lat: 20, lng: 73, date: '2026-08-04' });
    expect(out.map((r) => r.venue_name)).toEqual(['B']);
  });
});
