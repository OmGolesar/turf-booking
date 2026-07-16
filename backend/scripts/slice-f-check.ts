// Slice F pure-function self-checks. Run: `npx ts-node scripts/slice-f-check.ts`.
// One assertion per branch that would silently break if the logic drifted.
// Not a framework — just asserts. Task 5.1 will bring proper jest scaffolding.
/* eslint-disable no-console */
import assert from 'node:assert/strict';

import { __internals as notif } from '../src/modules/notification/notification.service';
import { __internals as support } from '../src/modules/support/support.service';
import { __internals as platform } from '../src/modules/platform/platform.service';
import { __internals as webhook } from '../src/modules/webhook/razorpay.controller';
import { __internals as jobs } from '../src/modules/background-jobs/job-runner.service';
import { __internals as outbox } from '../src/modules/background-jobs/jobs/publish-outbox.job';
import { __internals as dispatch } from '../src/modules/background-jobs/jobs/dispatch-notifications.job';
import { __internals as notifSub } from '../src/modules/background-jobs/subscribers/notification.subscriber';
import { NotificationCategory, NotificationChannel } from '@prisma/client';

// 1. Notification prefs: LOCKED_ON channels stay true even if stored says false.
{
  const merged = notif.mergeWithDefaults({
    BOOKING_CONFIRMATION: { push: false }, // spec: cannot opt out
    PROMOTION: { push: true }, // free to override
  });
  assert.equal(merged.BOOKING_CONFIRMATION.push, true, 'locked push must stay true');
  assert.equal(merged.PAYMENT_SUCCESS.email, true, 'locked email must stay true');
  assert.equal(merged.REFUND_PROCESSED.sms, true, 'locked sms must stay true');
  assert.equal(merged.PROMOTION.push, true, 'non-locked override wins');
  assert.equal(merged.BOOKING_REMINDER.email, false, 'default retained when absent');
}

// 2. Support code regex: accepts every documented prefix, rejects malformed.
{
  for (const c of ['TX-PT-00001', 'TX-VN-2026-ABCD', 'TX-GR-XYZ', 'TX-BK-20260716000001', 'TX-PY-20260716000001', 'TX-CS-00042']) {
    assert.ok(support.CODE_RE.test(c), `expected match: ${c}`);
  }
  for (const c of ['tx-bk-1', 'TX-XX-1', 'TX-BK-', 'BK-00001', 'random string']) {
    assert.ok(!support.CODE_RE.test(c), `expected no match: ${c}`);
  }
}

// 3. Semver comparator: signs correct across major/minor/patch and pre-release.
{
  assert.ok(platform.cmp('1.0.0', '1.0.0') === 0, 'equal');
  assert.ok(platform.cmp('1.0.0', '1.0.1') < 0, 'patch below');
  assert.ok(platform.cmp('1.1.0', '1.0.9') > 0, 'minor above patch');
  assert.ok(platform.cmp('2.0.0', '1.9.9') > 0, 'major above minor');
  assert.ok(platform.cmp('1.2.3-beta', '1.2.3') === 0, 'pre-release ignored');
}

// 4. Webhook event-id extraction: real id used verbatim, else synthetic id
// stays stable across identical payloads (dedup lever).
{
  const withId = webhook.extractEventId({ id: 'evt_ABC', event: 'payment.captured' });
  assert.equal(withId, 'evt_ABC', 'real id used verbatim');

  const noId1 = webhook.extractEventId({
    event: 'payment.captured',
    created_at: 1737123456,
    payload: { payment: { entity: { id: 'pay_xyz' } } },
  });
  const noId2 = webhook.extractEventId({
    event: 'payment.captured',
    created_at: 1737123456,
    payload: { payment: { entity: { id: 'pay_xyz' } } },
  });
  assert.equal(noId1, noId2, 'synthetic id is deterministic for identical payloads');
  assert.ok(noId1.startsWith('synth:payment.captured:'), 'synthetic id has expected shape');

  const diff = webhook.extractEventId({ event: 'payment.captured', created_at: 999, payload: { payment: { entity: { id: 'pay_xyz' } } } });
  assert.notEqual(noId1, diff, 'different created_at yields different synthetic id');
}

// 5. Cron next-run: returns null for null/invalid; monotonic future for valid.
{
  assert.equal(jobs.computeNextRunAt(null), null, 'null cron → null');
  assert.equal(jobs.computeNextRunAt('not a cron'), null, 'invalid cron → null');
  const next = jobs.computeNextRunAt('*/1 * * * *');
  assert.ok(next instanceof Date && next.getTime() > Date.now() - 1000, 'valid cron yields a near-future date');
  const daily = jobs.computeNextRunAt('0 3 * * *');
  assert.ok(daily instanceof Date && daily.getTime() > Date.now(), 'daily cron yields a future date');
}

// 6. Outbox backoff: monotonic, capped at 30 min.
{
  assert.equal(outbox.computeBackoffMs(1), 30_000, 'first retry = 30s');
  assert.equal(outbox.computeBackoffMs(2), 60_000, 'second retry = 60s');
  assert.equal(outbox.computeBackoffMs(3), 120_000, 'third retry = 2m');
  assert.equal(outbox.computeBackoffMs(4), 240_000, 'fourth retry = 4m');
  assert.equal(outbox.computeBackoffMs(7), 30 * 60_000, 'seventh retry capped at 30m');
  assert.equal(outbox.computeBackoffMs(100), 30 * 60_000, 'huge attempts still capped');
}

// 7. Notification prefs vs LOCKED_ON:
{
  const prefs = { BOOKING_CONFIRMATION: { push: false, sms: false, email: false, in_app: false } };
  // Push for BOOKING_CONFIRMATION is locked-on — always allowed.
  assert.ok(
    notifSub.channelAllowed(NotificationCategory.BOOKING_CONFIRMATION, NotificationChannel.PUSH, prefs),
    'locked-on push bypasses opt-out',
  );
  // SMS for BOOKING_CONFIRMATION is NOT locked, and user disabled it — denied.
  assert.ok(
    !notifSub.channelAllowed(NotificationCategory.BOOKING_CONFIRMATION, NotificationChannel.SMS, prefs),
    'non-locked channel respects opt-out',
  );
  // Dispatch's copy of LOCKED_ON should match (defence in depth).
  assert.ok(
    dispatch.channelAllowed(NotificationCategory.PAYMENT_SUCCESS, NotificationChannel.EMAIL, { PAYMENT_SUCCESS: { email: false } }),
    'dispatch: payment_success.email locked-on bypasses opt-out',
  );
}

console.log('slice-f-check: OK');
