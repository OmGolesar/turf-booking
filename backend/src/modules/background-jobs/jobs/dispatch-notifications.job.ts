import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  Notification,
  NotificationCategory,
  NotificationChannel,
  NotificationStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { NotificationService } from '../../notification/notification.service';
import { JobRegistry } from '../job.registry';
import { FcmProvider } from '../providers/fcm.provider';
import { InAppProvider } from '../providers/in-app.provider';
import { Msg91SmsProvider } from '../providers/msg91-sms.provider';
import { SendGridEmailProvider } from '../providers/sendgrid-email.provider';
import type { NotificationProvider, RecipientTarget, SendResult } from '../providers/provider.types';
import type { JobHandler } from '../job.types';

const JOB_NAME = 'DispatchNotifications';
const BATCH_SIZE = 200;
const MAX_ATTEMPTS = 5;
const FALLBACK_AFTER_ATTEMPTS = 3;

// Push→SMS fallback fires for these categories when push attempts exceed
// FALLBACK_AFTER_ATTEMPTS. Matches Part 2.5.3 §Table 5 Business Rules.
const FALLBACK_CATEGORIES = new Set<NotificationCategory>([
  NotificationCategory.BOOKING_CONFIRMATION,
  NotificationCategory.PAYMENT_SUCCESS,
  NotificationCategory.REFUND_PROCESSED,
]);

// LOCKED_ON (category, channel) pairs that bypass user opt-out — matches
// notification.service.ts LOCKED_ON.
const LOCKED_ON: Array<[NotificationCategory, NotificationChannel]> = [
  [NotificationCategory.BOOKING_CONFIRMATION, NotificationChannel.PUSH],
  [NotificationCategory.PAYMENT_SUCCESS, NotificationChannel.EMAIL],
  [NotificationCategory.REFUND_PROCESSED, NotificationChannel.SMS],
];

const CHANNEL_TO_PREF_KEY: Record<NotificationChannel, string | null> = {
  [NotificationChannel.PUSH]: 'push',
  [NotificationChannel.SMS]: 'sms',
  [NotificationChannel.EMAIL]: 'email',
  [NotificationChannel.IN_APP]: 'in_app',
  [NotificationChannel.WHATSAPP]: null,
};

@Injectable()
export class DispatchNotificationsJob implements JobHandler, OnModuleInit {
  private readonly logger = new Logger(DispatchNotificationsJob.name);
  private readonly providers: Record<NotificationChannel, NotificationProvider | null>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
    private readonly registry: JobRegistry,
    fcm: FcmProvider,
    sms: Msg91SmsProvider,
    email: SendGridEmailProvider,
    inApp: InAppProvider,
  ) {
    this.providers = {
      [NotificationChannel.PUSH]: fcm,
      [NotificationChannel.SMS]: sms,
      [NotificationChannel.EMAIL]: email,
      [NotificationChannel.IN_APP]: inApp,
      [NotificationChannel.WHATSAPP]: null, // deferred
    };
  }

  onModuleInit(): void {
    this.registry.register(JOB_NAME, this);
  }

  async run(): Promise<void> {
    // Batch: PENDING and (scheduled_for is NULL or in the past). Ordered by
    // scheduled_for (oldest first) so time-critical reminders don't starve.
    const rows = await this.prisma.notification.findMany({
      where: {
        status: NotificationStatus.PENDING,
        OR: [{ scheduledFor: null }, { scheduledFor: { lte: new Date() } }],
      },
      orderBy: [{ scheduledFor: 'asc' }, { createdAt: 'asc' }],
      take: BATCH_SIZE,
      include: {
        identity: { include: { profile: true } },
      },
    });
    if (rows.length === 0) return;

    let sent = 0;
    let failed = 0;
    let retried = 0;
    let fallbackFired = 0;

    for (const n of rows) {
      const outcome = await this.dispatchOne(n);
      if (outcome === 'sent') sent++;
      else if (outcome === 'failed') failed++;
      else if (outcome === 'retried') retried++;
      if (outcome === 'sent-and-fallback' || outcome === 'failed-and-fallback') {
        if (outcome === 'sent-and-fallback') sent++;
        else failed++;
        fallbackFired++;
      }
    }

    this.logger.log(
      `[DispatchNotifications] batch=${rows.length} sent=${sent} retried=${retried} failed=${failed} fallback_fired=${fallbackFired}`,
    );
  }

  private async dispatchOne(
    n: Notification & { identity: { phone: string | null; email: string | null; profile: { firstName: string | null } | null } },
  ): Promise<'sent' | 'retried' | 'failed' | 'sent-and-fallback' | 'failed-and-fallback'> {
    // Defence in depth: re-check preferences at send time. NotificationSubscriber
    // already filters at creation, but prefs can change between then and now.
    const prefs = await this.notifications.getPreferencesForIdentity(n.identityId);
    if (!channelAllowed(n.category, n.channel, prefs)) {
      await this.markFailed(n.id, 'user_opted_out', /*bumpAttempt*/ false);
      return 'failed';
    }

    const targets = await this.resolveTargets(n);
    if (targets.length === 0) {
      await this.markFailed(n.id, 'no_target', /*bumpAttempt*/ false);
      return 'failed';
    }

    // For SMS/EMAIL/IN_APP there's one target; for PUSH we fan out to all
    // active device tokens. A single hard failure still leaves the row FAILED
    // only when *every* target failed — if any target succeeds, we mark SENT.
    const results: Array<{ target: RecipientTarget; result: SendResult }> = [];
    const provider = this.providers[n.channel];
    if (!provider) {
      await this.markFailed(n.id, `no_provider:${n.channel}`, false);
      return 'failed';
    }

    for (const t of targets) {
      const r = await provider.send(n, t);
      results.push({ target: t, result: r });

      // Deactivate FCM tokens that came back UNREGISTERED so we stop trying.
      if (n.channel === NotificationChannel.PUSH && r.status === 'unregistered' && t.tokenId) {
        await this.prisma.deviceToken.update({
          where: { id: t.tokenId },
          data: { isActive: false },
        });
        this.logger.log(`[DispatchNotifications] deactivated FCM token tokenId=${t.tokenId}`);
      }
    }

    const anySent = results.some((r) => r.result.status === 'sent');
    const anyTransient = results.some((r) => r.result.status === 'error');
    const nextAttempt = n.attempts + 1;

    if (anySent) {
      await this.markSent(n.id, results);
      return 'sent';
    }

    // No success. Decide: retry or terminal-fail?
    if (nextAttempt >= MAX_ATTEMPTS || !anyTransient) {
      await this.markFailed(n.id, summarise(results), /*bumpAttempt*/ true);
      const fired = await this.maybeFireFallback(n, nextAttempt);
      return fired ? 'failed-and-fallback' : 'failed';
    }

    // Transient failure — bump attempts, backoff via scheduled_for.
    await this.markRetry(n.id, summarise(results), nextAttempt);
    const fired = await this.maybeFireFallback(n, nextAttempt);
    return fired ? 'sent-and-fallback' : 'retried';
  }

  private async resolveTargets(
    n: Notification & { identity: { phone: string | null; email: string | null } },
  ): Promise<RecipientTarget[]> {
    switch (n.channel) {
      case NotificationChannel.PUSH: {
        const tokens = await this.prisma.deviceToken.findMany({
          where: { identityId: n.identityId, isActive: true },
          select: { id: true, token: true },
        });
        return tokens.map((t) => ({ identityId: n.identityId, target: t.token, tokenId: t.id }));
      }
      case NotificationChannel.SMS:
        return n.identity.phone ? [{ identityId: n.identityId, target: n.identity.phone }] : [];
      case NotificationChannel.EMAIL:
        return n.identity.email ? [{ identityId: n.identityId, target: n.identity.email }] : [];
      case NotificationChannel.IN_APP:
        return [{ identityId: n.identityId, target: '' }];
      default:
        return [];
    }
  }

  private async markSent(id: string, results: Array<{ target: RecipientTarget; result: SendResult }>): Promise<void> {
    const providerId = results.find((r) => r.result.status === 'sent')?.result.providerMessageId ?? null;
    await this.prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.SENT,
        attempts: { increment: 1 },
        sentAt: new Date(),
        lastError: null,
        data: providerId
          ? ({
              provider_message_id: providerId,
            } as Prisma.InputJsonValue)
          : undefined,
      },
    });
  }

  private async markRetry(id: string, message: string, attempts: number): Promise<void> {
    const backoffMinutes = Math.min(2 ** Math.max(0, attempts - 1), 15);
    const scheduledFor = new Date(Date.now() + backoffMinutes * 60_000);
    await this.prisma.notification.update({
      where: { id },
      data: {
        attempts,
        lastError: trim(message),
        scheduledFor,
      },
    });
  }

  private async markFailed(id: string, message: string, bumpAttempt: boolean): Promise<void> {
    await this.prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.FAILED,
        attempts: bumpAttempt ? { increment: 1 } : undefined,
        lastError: trim(message),
      },
    });
  }

  private async maybeFireFallback(n: Notification, attempts: number): Promise<boolean> {
    if (n.channel !== NotificationChannel.PUSH) return false;
    if (attempts !== FALLBACK_AFTER_ATTEMPTS) return false; // exactly once
    if (!FALLBACK_CATEGORIES.has(n.category)) return false;

    // Only fire the fallback if there isn't already an SMS for this event.
    const eventId =
      typeof (n.data as Prisma.JsonObject | null)?.outbox_event_id === 'string'
        ? ((n.data as Prisma.JsonObject).outbox_event_id as string)
        : null;
    if (eventId) {
      const dupe = await this.prisma.$queryRaw<Array<{ n: bigint }>>(Prisma.sql`
        SELECT COUNT(*) AS n FROM notifications
         WHERE identity_id = ${n.identityId}::uuid
           AND channel = 'SMS'
           AND category = ${n.category}::"NotificationCategory"
           AND data ->> 'outbox_event_id' = ${eventId}
      `);
      if ((dupe[0]?.n ?? 0n) > 0n) return false;
    }

    await this.prisma.notification.create({
      data: {
        identityId: n.identityId,
        channel: NotificationChannel.SMS,
        category: n.category,
        title: n.title,
        body: n.body,
        data: {
          fallback_from_push: true,
          original_notification_id: n.id,
          outbox_event_id: eventId,
        } as Prisma.InputJsonValue,
        relatedResourceType: n.relatedResourceType,
        relatedResourceId: n.relatedResourceId,
        status: NotificationStatus.PENDING,
      },
    });
    this.logger.log(`[DispatchNotifications] push→SMS fallback fired for ${n.category} id=${n.id}`);
    return true;
  }
}

function channelAllowed(
  category: NotificationCategory,
  channel: NotificationChannel,
  prefs: Record<string, Record<string, boolean>>,
): boolean {
  if (LOCKED_ON.some(([c, ch]) => c === category && ch === channel)) return true;
  const key = CHANNEL_TO_PREF_KEY[channel];
  if (!key) return false;
  return prefs[category]?.[key] === true;
}

function summarise(results: Array<{ target: RecipientTarget; result: SendResult }>): string {
  return results
    .map((r) => `${r.result.status}${r.result.error ? `:${r.result.error}` : ''}`)
    .slice(0, 5)
    .join('; ');
}

function trim(s: string): string {
  return s.length > 2000 ? s.slice(0, 2000) : s;
}

export const __internals = { channelAllowed, FALLBACK_CATEGORIES, LOCKED_ON };
