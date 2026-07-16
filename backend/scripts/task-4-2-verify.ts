// Task 4.2 verification: ExpireBookingSessions flips ACTIVE+expired sessions
// to EXPIRED, emits BookingSessionExpired per row, and leaves anything else
// alone. Not part of the permanent test suite.
/* eslint-disable no-console */
import assert from 'node:assert/strict';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from '../src/worker.module';
import { PrismaService } from '../src/shared/prisma/prisma.service';
import { ExpireBookingSessionsJob } from '../src/modules/background-jobs/jobs/expire-booking-sessions.job';

async function main() {
  const app = await NestFactory.createApplicationContext(WorkerModule, { logger: false });
  const prisma = app.get(PrismaService);
  const job = app.get(ExpireBookingSessionsJob);

  // Seeded ground (from prisma/seed.ts) + demo partner identity.
  const ground = await prisma.ground.findFirst();
  const identity = await prisma.identity.findFirst({ where: { firebaseUid: 'seed:goalzone-partner' } });
  if (!ground || !identity) {
    console.error('Missing seeded ground / identity. Run `npx prisma db seed` first.');
    process.exit(1);
  }

  const testMarker = 'task-4-2-verify';

  // Different (booking_date, start_time) per row so uq_active_booking_session doesn't reject.
  // Use dates in the future so we never collide with real bookings from other test runs.
  const baseDate = '2099-01-01';
  const sessions = [
    { label: 'expired-1',   status: 'ACTIVE'   as const, offset: -60_000, start: '10:00' },
    { label: 'expired-2',   status: 'ACTIVE'   as const, offset: -60_000, start: '11:00' },
    { label: 'expired-3',   status: 'ACTIVE'   as const, offset: -60_000, start: '12:00' },
    { label: 'still-live',  status: 'ACTIVE'   as const, offset: 10 * 60_000, start: '13:00' },
    { label: 'cancelled',   status: 'CANCELLED' as const, offset: -60_000, start: '14:00' },
  ];

  // Clean any stragglers from a prior run.
  await prisma.$executeRawUnsafe(
    `DELETE FROM outbox_events WHERE aggregate_type='BookingSession' AND payload->>'session_id' IN (SELECT id::text FROM booking_sessions WHERE booking_date = $1::date)`,
    baseDate,
  );
  await prisma.$executeRawUnsafe(
    `DELETE FROM audit_logs WHERE resource_type='BookingSession' AND resource_id IN (SELECT id FROM booking_sessions WHERE booking_date = $1::date)`,
    baseDate,
  );
  await prisma.$executeRawUnsafe(`DELETE FROM booking_sessions WHERE booking_date = $1::date`, baseDate);

  const now = Date.now();
  const ids: Record<string, string> = {};
  for (const s of sessions) {
    const row = await prisma.bookingSession.create({
      data: {
        identityId: identity.id,
        groundId: ground.id,
        bookingDate: new Date(`${baseDate}T00:00:00Z`),
        startTime: new Date(`1970-01-01T${s.start}:00Z`),
        endTime: new Date(`1970-01-01T${addOneHour(s.start)}:00Z`),
        totalAmount: '100.00',
        expiresAt: new Date(now + s.offset),
        status: s.status,
      },
    });
    ids[s.label] = row.id;
  }

  await job.run();

  const after = await prisma.bookingSession.findMany({
    where: { id: { in: Object.values(ids) } },
    select: { id: true, status: true },
  });
  const statusById = Object.fromEntries(after.map((r) => [r.id, r.status]));

  assert.equal(statusById[ids['expired-1']], 'EXPIRED', 'expired-1 → EXPIRED');
  assert.equal(statusById[ids['expired-2']], 'EXPIRED', 'expired-2 → EXPIRED');
  assert.equal(statusById[ids['expired-3']], 'EXPIRED', 'expired-3 → EXPIRED');
  assert.equal(statusById[ids['still-live']], 'ACTIVE', 'future expires_at untouched');
  assert.equal(statusById[ids['cancelled']], 'CANCELLED', 'CANCELLED session untouched');

  // Outbox: one BookingSessionExpired per expired row, with sequence_no starting at 1
  // (fresh aggregate — no prior events on these test sessions).
  for (const label of ['expired-1', 'expired-2', 'expired-3']) {
    const events = await prisma.outboxEvent.findMany({
      where: { aggregateType: 'BookingSession', aggregateId: ids[label], eventType: 'BookingSessionExpired' },
    });
    assert.equal(events.length, 1, `${label} should emit exactly one BookingSessionExpired`);
    assert.equal(events[0].sequenceNo, 1n, `${label} first event has sequence_no=1`);
  }

  const noEvents = await prisma.outboxEvent.count({
    where: {
      aggregateType: 'BookingSession',
      aggregateId: { in: [ids['still-live'], ids['cancelled']] },
      eventType: 'BookingSessionExpired',
    },
  });
  assert.equal(noEvents, 0, 'no expiry event for untouched sessions');

  // Audit trail: SYSTEM entries for the three expired rows.
  const audits = await prisma.auditLog.findMany({
    where: { resourceType: 'BookingSession', action: 'BookingSessionExpired', resourceId: { in: [ids['expired-1'], ids['expired-2'], ids['expired-3']] } },
  });
  assert.equal(audits.length, 3, 'three SYSTEM audit rows');
  assert.ok(audits.every((a) => a.actorIdentityId === null && a.actorRole === 'SYSTEM'), 'all audits are SYSTEM');

  // Idempotency: running again should be a no-op (no more transitions, no new events).
  const before = await prisma.outboxEvent.count({ where: { aggregateType: 'BookingSession', eventType: 'BookingSessionExpired' } });
  await job.run();
  const afterSecond = await prisma.outboxEvent.count({ where: { aggregateType: 'BookingSession', eventType: 'BookingSessionExpired' } });
  assert.equal(afterSecond, before, 'second run emits no additional events (already EXPIRED)');

  // Cleanup so the test rows don't accumulate.
  const testIds = Object.values(ids);
  await prisma.$executeRawUnsafe(
    `DELETE FROM outbox_events WHERE aggregate_type='BookingSession' AND aggregate_id = ANY($1::uuid[])`,
    testIds,
  );
  await prisma.$executeRawUnsafe(
    `DELETE FROM audit_logs WHERE resource_type='BookingSession' AND resource_id = ANY($1::uuid[])`,
    testIds,
  );
  await prisma.$executeRawUnsafe(`DELETE FROM booking_sessions WHERE id = ANY($1::uuid[])`, testIds);

  await app.close();
  console.log('task-4-2-verify: OK');
  process.exit(0);
}

function addOneHour(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + 60;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
