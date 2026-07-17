// Integration test harness.
//
// Boots a fresh PostGIS 17-3.4 container, runs `prisma migrate deploy`, then
// runs `prisma/seed.ts` (so migration-level seeds + the demo partner are
// present). Returns a Prisma client + a `truncateAll()` helper for per-test
// isolation.
//
// Isolation model
// ---------------
// Blueprint §12 asks for "each test wraps in a Prisma transaction rolled back
// at teardown". We can't do that: OutboxService, booking confirm, and the
// refund flow already run inside `prisma.$transaction`, and Prisma doesn't
// support nested interactive transactions. A wrapping tx would either
// deadlock or defeat the isolation the app is trying to guarantee.
//
// Instead, `truncateAll()`:
//   1. TRUNCATE ... CASCADE every app table (all schema-level tables minus
//      `_prisma_migrations` and PostGIS's `spatial_ref_sys`).
//   2. Re-INSERT rows for REFERENCE_TABLES from a snapshot captured at boot,
//      so tests always see the same reference dataset. Tests that need a
//      demo partner/venue must recreate it themselves — only sports,
//      app_settings, and background_jobs survive between tests.
//
// ponytail: per-suite (per-file) container. Reusing one container across all
// integration suites via Testcontainers `.withReuse()` is possible; add when
// suite count grows enough for boot cost to matter.

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { PrismaClient } from '@prisma/client';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

// ponytail: Colima on macOS puts its docker socket under ~/.colima/... and
// testcontainers only looks at /var/run/docker.sock + $DOCKER_HOST. Auto-fill
// DOCKER_HOST if it's obviously Colima. No-op on Linux CI, Docker Desktop, or
// when the user has already exported DOCKER_HOST themselves.
if (!process.env.DOCKER_HOST) {
  const colimaSock = `${homedir()}/.colima/default/docker.sock`;
  if (existsSync(colimaSock)) {
    process.env.DOCKER_HOST = `unix://${colimaSock}`;
    // Testcontainers on Colima also needs:
    //  - host override so the client can reach exposed ports from outside the VM
    //  - a docker-socket path Ryuk (the reaper container) can bind-mount from
    //    _inside_ the VM. The host path (~/.colima/...) doesn't exist there;
    //    inside the VM the socket is the standard /var/run/docker.sock.
    process.env.TESTCONTAINERS_HOST_OVERRIDE ??= '127.0.0.1';
    process.env.TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE ??= '/var/run/docker.sock';
  }
}

// Tables whose contents are seeded once at boot and MUST survive per-test
// truncate. We snapshot their rows on startup and re-insert after each
// TRUNCATE CASCADE — this is more reliable than trying to skip them during
// truncate, because Postgres cascades FKs at the schema level and a nullable
// FK is enough to drag a "reference" table into the cascade set.
const REFERENCE_TABLES = ['sports', 'app_settings', 'background_jobs'] as const;

export interface IntegrationHarness {
  prisma: PrismaClient;
  container: StartedPostgreSqlContainer;
  databaseUrl: string;
  truncateAll(): Promise<void>;
  stop(): Promise<void>;
}

type Snapshot = Map<string, Record<string, unknown>[]>;

export async function startHarness(): Promise<IntegrationHarness> {
  const container = await new PostgreSqlContainer('postgis/postgis:17-3.4')
    .withDatabase('turfx_test')
    .withUsername('turfx')
    .withPassword('turfx')
    .withStartupTimeout(120_000)
    .start();

  const databaseUrl = container.getConnectionUri();

  execSync('npx prisma migrate deploy', {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  });

  execSync('npx ts-node prisma/seed.ts', {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  });

  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  await prisma.$connect();

  const allTables = await listAppTables(prisma);
  const referenceSnapshot = await snapshotReferenceTables(prisma);

  return {
    prisma,
    container,
    databaseUrl,
    truncateAll: () => resetToSeed(prisma, allTables, referenceSnapshot),
    async stop() {
      await prisma.$disconnect();
      await container.stop();
    },
  };
}

async function listAppTables(prisma: PrismaClient): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE '\\_prisma\\_%' ESCAPE '\\'
      AND tablename <> 'spatial_ref_sys'
  `;
  return rows.map((r) => r.tablename);
}

async function snapshotReferenceTables(prisma: PrismaClient): Promise<Snapshot> {
  const snap: Snapshot = new Map();
  for (const t of REFERENCE_TABLES) {
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM "${t}"`,
    );
    snap.set(t, rows);
  }
  return snap;
}

async function resetToSeed(
  prisma: PrismaClient,
  allTables: string[],
  snapshot: Snapshot,
): Promise<void> {
  const quoted = allTables.map((t) => `"${t}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`);
  // Restore reference-table content. We shove the whole row-set through
  // `jsonb_populate_recordset(NULL::"table", $1::jsonb)` so Postgres casts each
  // column back to its declared type — otherwise Prisma sends parameters as
  // text and uuid/jsonb/enum columns reject them.
  for (const table of REFERENCE_TABLES) {
    const rows = snapshot.get(table) ?? [];
    if (rows.length === 0) continue;
    await prisma.$executeRawUnsafe(
      `INSERT INTO "${table}" SELECT * FROM jsonb_populate_recordset(NULL::"${table}", $1::jsonb)`,
      JSON.stringify(rows),
    );
  }
}
