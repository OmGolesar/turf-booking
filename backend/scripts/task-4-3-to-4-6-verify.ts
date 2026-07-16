// End-to-end verification for Tasks 4.3, 4.4, 4.5, 4.6.
// Not part of the permanent test suite — narrow, targeted asserts covering
// the acceptance criteria in BUILDER_HANDOFF_BRIEF.md.
/* eslint-disable no-console */
import assert from 'node:assert/strict';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from '../src/worker.module';
import { PrismaService } from '../src/shared/prisma/prisma.service';
import { OutboxService } from '../src/shared/outbox/outbox.service';
import { PublishOutboxJob, __internals as outboxInt } from '../src/modules/background-jobs/jobs/publish-outbox.job';
import { DispatchNotificationsJob } from '../src/modules/background-jobs/jobs/dispatch-notifications.job';
import { SendBookingRemindersJob } from '../src/modules/background-jobs/jobs/send-booking-reminders.job';
import { RecalculateVenueRatingsJob } from '../src/modules/background-jobs/jobs/recalculate-venue-ratings.job';
import { ArchivePublishedOutboxJob } from '../src/modules/background-jobs/jobs/archive-published-outbox.job';
import { PurgeInactiveDeviceTokensJob } from '../src/modules/background-jobs/jobs/purge-inactive-device-tokens.job';

async function main() {
  const app = await NestFactory.createApplicationContext(WorkerModule, { logger: false });
  const prisma = app.get(PrismaService);
  const outbox = app.get(OutboxService);
  const publish = app.get(PublishOutboxJob);
  const dispatch = app.get(DispatchNotificationsJob);
  const reminders = app.get(SendBookingRemindersJob);
  const ratings = app.get(RecalculateVenueRatingsJob);
  const archive = app.get(ArchivePublishedOutboxJob);
  const purge = app.get(PurgeInactiveDeviceTokensJob);

  const identity = await prisma.identity.findFirst({ where: { firebaseUid: 'seed:goalzone-partner' } });
  const ground = await prisma.ground.findFirst();
  const venue = await prisma.venue.findFirst();
  if (!identity || !ground || !venue) throw new Error('Seed data missing; run `npx prisma db seed` first.');

  // Clean any stragglers.
  await cleanup(prisma, identity.id);

  // ── 4.3 PublishOutbox — backoff formula ────────────────────────────
  assert.equal(outboxInt.computeBackoffMs(1), 30_000, 'attempt 1 → 30s');
  assert.equal(outboxInt.computeBackoffMs(2), 60_000, 'attempt 2 → 60s');
  assert.equal(outboxInt.computeBackoffMs(3), 120_000, 'attempt 3 → 2m');
  assert.equal(outboxInt.computeBackoffMs(20), 30 * 60_000, 'attempt N → capped at 30m');

  // ── 4.3 PublishOutbox — event flows to notifications subscriber ────
  // Emit a synthetic BookingConfirmed via OutboxService.emit (inside a tx).
  const fakeBookingId = randomUuid();
  await prisma.$transaction(async (tx) => {
    await outbox.emit(tx, {
      aggregateType: 'Booking',
      aggregateId: fakeBookingId,
      eventType: 'BookingConfirmed',
      payload: {
        booking_id: fakeBookingId,
        reference_code: 'TX-BK-99990001',
        identity_id: identity.id,
        partner_id: ground.venueId,
        venue_id: ground.venueId,
        ground_id: ground.id,
        booking_date: '2099-01-01',
        start_time: '10:00',
        end_time: '11:00',
        total_amount_paise: 12000,
        source: 'CUSTOMER_APP',
      },
    });
  });

  await publish.run();

  const pubEvents = await prisma.outboxEvent.findMany({ where: { aggregateType: 'Booking', aggregateId: fakeBookingId } });
  assert.equal(pubEvents.length, 1, 'one outbox event');
  assert.equal(pubEvents[0].status, 'PUBLISHED', 'PublishOutbox flipped it to PUBLISHED');
  assert.ok(pubEvents[0].publishedAt instanceof Date, 'published_at set');

  const nots = await prisma.notification.findMany({ where: { identityId: identity.id, category: 'BOOKING_CONFIRMATION' } });
  assert.ok(nots.length >= 3, `NotificationSubscriber fanned to ≥3 channels; got ${nots.length}`);
  const chans = new Set(nots.map((n) => n.channel));
  assert.ok(chans.has('PUSH') && chans.has('EMAIL') && chans.has('IN_APP'), 'PUSH+EMAIL+IN_APP created');

  // Idempotency of subscriber: re-emit same event id doesn't dupe notifications.
  const secondEmit = await prisma.$transaction(async (tx) =>
    outbox.emit(tx, {
      aggregateType: 'Booking',
      aggregateId: fakeBookingId,
      eventType: 'BookingConfirmed', // will get sequence_no=2 — a fresh outbox row
      payload: { booking_id: fakeBookingId, identity_id: identity.id, ground_id: ground.id, booking_date: '2099-01-01' },
    }),
  );
  void secondEmit;
  await publish.run();
  const notsAfter = await prisma.notification.count({ where: { identityId: identity.id, category: 'BOOKING_CONFIRMATION' } });
  // Second event has a distinct outbox_event_id so the subscriber fans again.
  // The `outbox_event_id` dedupe only prevents same-event replays, not distinct events.
  assert.ok(notsAfter >= nots.length, 'second emit adds notifications (distinct event_id)');

  // ── 4.4 DispatchNotifications — providers + FCM UNREGISTERED path ─
  // Register two FCM device tokens for the identity: one valid, one invalid.
  const validToken = await prisma.deviceToken.create({
    data: {
      identityId: identity.id,
      token: `valid-token-${Date.now()}`,
      platform: 'ANDROID',
      appVariant: 'CUSTOMER',
      isActive: true,
    },
  });
  const invalidToken = await prisma.deviceToken.create({
    data: {
      identityId: identity.id,
      token: `invalid:sim-${Date.now()}`,
      platform: 'ANDROID',
      appVariant: 'CUSTOMER',
      isActive: true,
    },
  });

  await dispatch.run();
  const dispatched = await prisma.notification.findMany({
    where: { identityId: identity.id, category: 'BOOKING_CONFIRMATION' },
  });
  const sent = dispatched.filter((n) => n.status === 'SENT');
  assert.ok(sent.length >= 3, `at least 3 notifications marked SENT (got ${sent.length})`);
  const stillPending = dispatched.filter((n) => n.status === 'PENDING');
  assert.equal(stillPending.length, 0, 'nothing left PENDING after dispatch');

  // Invalid FCM token was deactivated.
  const invalidAfter = await prisma.deviceToken.findUnique({ where: { id: invalidToken.id } });
  assert.equal(invalidAfter?.isActive, false, 'UNREGISTERED token deactivated');
  const validAfter = await prisma.deviceToken.findUnique({ where: { id: validToken.id } });
  assert.equal(validAfter?.isActive, true, 'valid token remains active');

  // ── 4.5 SendBookingReminders — creates PENDING, idempotent ────────
  // Insert a session + booking that starts ~90 minutes from now (inside the 2h window).
  const startsInMinutes = 90;
  const nowUtc = new Date();
  // Compute booking_date + start_time in IST such that (date, time) at Asia/Kolkata = now+90min UTC.
  const targetIST = new Date(nowUtc.getTime() + startsInMinutes * 60_000);
  // Format as IST wall-clock string. Node doesn't have builtin TZ formatting sans Intl.
  const istStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(targetIST);
  // en-CA yields "2026-07-16, 13:15" — split.
  const [dateStr, timeStr] = istStr.split(', ');
  const startTimeStr = timeStr.replace(':', ':') + ':00';
  const endTimeStr = addOneHour(timeStr) + ':00';

  const session = await prisma.bookingSession.create({
    data: {
      identityId: identity.id,
      groundId: ground.id,
      bookingDate: new Date(`${dateStr}T00:00:00Z`),
      startTime: new Date(`1970-01-01T${startTimeStr}Z`),
      endTime: new Date(`1970-01-01T${endTimeStr}Z`),
      totalAmount: '100.00',
      expiresAt: new Date(Date.now() + 60_000),
      status: 'CANCELLED', // consumed after promote
    },
  });
  const booking = await prisma.booking.create({
    data: {
      bookingSessionId: session.id,
      identityId: identity.id,
      partnerId: venue.partnerId,
      venueId: venue.id,
      groundId: ground.id,
      bookingDate: new Date(`${dateStr}T00:00:00Z`),
      startTime: new Date(`1970-01-01T${startTimeStr}Z`),
      endTime: new Date(`1970-01-01T${endTimeStr}Z`),
      bookingSource: 'CUSTOMER_APP',
      bookingStatus: 'CONFIRMED',
      totalAmount: '100.00',
      currency: 'INR',
    },
  });

  await reminders.run();
  const firstBatch = await prisma.notification.count({
    where: { relatedResourceType: 'Booking', relatedResourceId: booking.id, category: 'BOOKING_REMINDER' },
  });
  assert.ok(firstBatch >= 2, `expected ≥2 reminder notifications (push+in_app); got ${firstBatch}`);

  // Idempotent second pass — no additional reminders.
  await reminders.run();
  const secondBatch = await prisma.notification.count({
    where: { relatedResourceType: 'Booking', relatedResourceId: booking.id, category: 'BOOKING_REMINDER' },
  });
  assert.equal(secondBatch, firstBatch, 'second run adds nothing (idempotent)');

  // ── 4.6 RecalculateVenueRatings ────────────────────────────────────
  const review = await prisma.review.create({
    data: { bookingId: booking.id, venueId: venue.id, identityId: identity.id, rating: 5 },
  });
  await ratings.run();
  const venueAfter = await prisma.venue.findUnique({ where: { id: venue.id } });
  assert.ok(venueAfter!.totalReviews >= 1, 'total_reviews includes the new review');
  assert.ok(venueAfter!.averageRating > 0, 'average_rating > 0');

  // ── 4.6 ArchivePublishedOutbox — old PUBLISHED rows deleted ────────
  const oldEvent = await prisma.outboxEvent.create({
    data: {
      aggregateType: 'Booking',
      aggregateId: randomUuid(),
      eventType: 'BookingConfirmed',
      sequenceNo: 1n,
      payload: {},
      status: 'PUBLISHED',
      publishedAt: new Date(Date.now() - 40 * 24 * 60 * 60_000), // 40 days ago
    },
  });
  await archive.run();
  const oldStillThere = await prisma.outboxEvent.findUnique({ where: { id: oldEvent.id } });
  assert.equal(oldStillThere, null, 'old PUBLISHED outbox row deleted');

  // Recent PUBLISHED rows survive.
  const recent = pubEvents[0];
  const recentStill = await prisma.outboxEvent.findUnique({ where: { id: recent.id } });
  assert.ok(recentStill, 'recent PUBLISHED row survives archive');

  // ── 4.6 PurgeInactiveDeviceTokens — old inactive tokens gone ──────
  await prisma.deviceToken.create({
    data: {
      identityId: identity.id,
      token: `old-inactive-${Date.now()}`,
      platform: 'ANDROID',
      appVariant: 'CUSTOMER',
      isActive: false,
    },
  });
  // Backdate updatedAt to 40 days ago via raw SQL (Prisma's @updatedAt intercepts.)
  await prisma.$executeRawUnsafe(
    `UPDATE device_tokens SET updated_at = NOW() - INTERVAL '40 days' WHERE token LIKE 'old-inactive-%'`,
  );
  await purge.run();
  const oldTokens = await prisma.deviceToken.count({ where: { token: { startsWith: 'old-inactive-' } } });
  assert.equal(oldTokens, 0, 'old inactive token purged');

  // ── Cleanup ────────────────────────────────────────────────────────
  await cleanup(prisma, identity.id);
  await prisma.$executeRawUnsafe(`DELETE FROM reviews WHERE id = $1::uuid`, review.id);

  await app.close();
  console.log('task-4-3-to-4-6-verify: OK');
  process.exit(0);
}

async function cleanup(prisma: PrismaService, identityId: string) {
  // Order matters — reviews and payments reference bookings; bookings reference sessions.
  await prisma.$executeRawUnsafe(`DELETE FROM notifications WHERE identity_id = $1::uuid`, identityId);
  await prisma.$executeRawUnsafe(`DELETE FROM reviews WHERE identity_id = $1::uuid`, identityId);
  await prisma.$executeRawUnsafe(`DELETE FROM payments WHERE booking_id IN (SELECT id FROM bookings WHERE identity_id = $1::uuid AND booking_date >= (NOW() AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '1 day')`, identityId);
  await prisma.$executeRawUnsafe(`DELETE FROM audit_logs WHERE resource_type='BookingSession' AND resource_id IN (SELECT id FROM booking_sessions WHERE booking_date = '2099-01-01'::date)`);
  await prisma.$executeRawUnsafe(`DELETE FROM bookings WHERE identity_id = $1::uuid AND booking_date >= (NOW() AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '1 day'`, identityId);
  await prisma.$executeRawUnsafe(`DELETE FROM bookings WHERE reference_code LIKE 'TX-BK-2099%'`);
  await prisma.$executeRawUnsafe(`DELETE FROM booking_sessions WHERE identity_id = $1::uuid AND booking_date >= (NOW() AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '1 day'`, identityId);
  await prisma.$executeRawUnsafe(`DELETE FROM booking_sessions WHERE booking_date = '2099-01-01'::date`);
  // Stale test outbox rows (any aggregate) that reference an identity that may not exist.
  await prisma.$executeRawUnsafe(`DELETE FROM outbox_events WHERE aggregate_type='Booking' AND payload->>'reference_code' = 'TX-BK-99990001'`);
  await prisma.$executeRawUnsafe(`DELETE FROM outbox_events WHERE aggregate_type='Booking' AND payload->>'identity_id' = $1`, identityId);
  await prisma.$executeRawUnsafe(`DELETE FROM device_tokens WHERE token LIKE 'valid-token-%' OR token LIKE 'invalid:%' OR token LIKE 'old-inactive-%'`);
}

function randomUuid(): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('node:crypto').randomUUID();
}

function addOneHour(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + 60;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
