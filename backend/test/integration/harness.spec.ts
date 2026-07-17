// Smoke test for the integration harness itself. If this file goes red,
// every other integration spec will too — fix here first.

import { startHarness, type IntegrationHarness } from './harness';

describe('integration harness', () => {
  let h: IntegrationHarness;

  beforeAll(async () => {
    h = await startHarness();
  }, 180_000);

  afterAll(async () => {
    await h?.stop();
  });

  it('boots PostGIS 17-3.4 and reports its version', async () => {
    const rows = await h.prisma.$queryRaw<Array<{ postgis_version: string }>>`
      SELECT postgis_version() AS postgis_version
    `;
    expect(rows[0]?.postgis_version).toMatch(/^3\.4/);
  });

  it('applied every migration up to the current head', async () => {
    const rows = await h.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM _prisma_migrations
      WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
    `;
    // 16 migrations at time of writing (0000..0015). Assert ≥ that; if new
    // migrations land the count grows and this still passes.
    expect(Number(rows[0].count)).toBeGreaterThanOrEqual(16);
  });

  it('seeded the sports reference table', async () => {
    const sports = await h.prisma.sport.findMany();
    expect(sports.length).toBeGreaterThanOrEqual(7);
    expect(sports.map((s) => s.code)).toEqual(
      expect.arrayContaining(['FOOTBALL', 'CRICKET', 'BADMINTON']),
    );
  });

  it('truncateAll wipes non-reference tables but keeps sports + app_settings', async () => {
    const identitiesBefore = await h.prisma.identity.count();
    const sportsBefore = await h.prisma.sport.count();
    const settingsBefore = await h.prisma.appSetting.count();
    expect(identitiesBefore).toBeGreaterThan(0);
    expect(settingsBefore).toBeGreaterThan(0);

    await h.truncateAll();

    expect(await h.prisma.identity.count()).toBe(0);
    expect(await h.prisma.sport.count()).toBe(sportsBefore);
    expect(await h.prisma.appSetting.count()).toBe(settingsBefore);
  });
});
