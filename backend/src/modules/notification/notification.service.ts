import { Injectable } from '@nestjs/common';
import { AppSettingType, NotificationCategory, NotificationChannel, Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import type { AuthContext } from '../../shared/auth/auth-context';

// Per Part 3.5 §3 — categories exposed to the client and their default channels.
const DEFAULT_PREFS: Record<string, Record<string, boolean>> = {
  BOOKING_CONFIRMATION: { push: true, sms: true, email: true, in_app: true },
  BOOKING_REMINDER:     { push: true, sms: true, email: false, in_app: true },
  BOOKING_CANCELLATION: { push: true, sms: true, email: true, in_app: true },
  PAYMENT_SUCCESS:      { push: true, sms: false, email: true, in_app: true },
  PAYMENT_FAILURE:      { push: true, sms: true, email: true, in_app: true },
  REFUND_PROCESSED:     { push: true, sms: true, email: true, in_app: true },
  REVIEW_REQUEST:       { push: true, sms: false, email: false, in_app: true },
  PROMOTION:            { push: false, sms: false, email: true, in_app: true },
  SYSTEM_ANNOUNCEMENT:  { push: true, sms: false, email: false, in_app: true },
};

// Part 3.5 §4 — cannot be opted out of.
const LOCKED_ON: Array<[string, string]> = [
  ['BOOKING_CONFIRMATION', 'push'],
  ['PAYMENT_SUCCESS', 'email'],
  ['REFUND_PROCESSED', 'sms'],
];

const ALLOWED_CATEGORIES = new Set(Object.keys(DEFAULT_PREFS));
const ALLOWED_CHANNELS = new Set(['push', 'sms', 'email', 'in_app']);

const UNREAD_CACHE_TTL_MS = 15_000;

@Injectable()
export class NotificationService {
  private unreadCache = new Map<string, { at: number; value: UnreadResult }>();

  constructor(private readonly prisma: PrismaService) {}

  async getPreferences(ctx: AuthContext) {
    const stored = await this.readStored(ctx.identityId);
    return { preferences: mergeWithDefaults(stored) };
  }

  async updatePreferences(ctx: AuthContext, patch: Record<string, Record<string, boolean>>) {
    const stored = await this.readStored(ctx.identityId);
    const merged = mergeWithDefaults(stored);

    for (const [category, channels] of Object.entries(patch)) {
      if (!ALLOWED_CATEGORIES.has(category)) continue; // silently ignore unknown
      for (const [channel, on] of Object.entries(channels)) {
        if (!ALLOWED_CHANNELS.has(channel)) continue;
        if (LOCKED_ON.some(([c, ch]) => c === category && ch === channel)) continue; // locked
        merged[category][channel] = Boolean(on);
      }
    }

    await this.writeStored(ctx.identityId, merged, ctx.identityId);
    return { preferences: merged };
  }

  async unreadCount(ctx: AuthContext): Promise<UnreadResult> {
    const cached = this.unreadCache.get(ctx.identityId);
    if (cached && Date.now() - cached.at < UNREAD_CACHE_TTL_MS) return cached.value;

    // Match the identity-notifications endpoint: readAt IS NULL == "unread".
    const groups = await this.prisma.notification.groupBy({
      by: ['category'],
      where: { identityId: ctx.identityId, readAt: null },
      _count: { _all: true },
    });

    const by_category: Partial<Record<NotificationCategory, number>> = {};
    let total = 0;
    for (const g of groups) {
      by_category[g.category] = g._count._all;
      total += g._count._all;
    }

    const value: UnreadResult = { unread_count: total, by_category };
    this.unreadCache.set(ctx.identityId, { at: Date.now(), value });
    return value;
  }

  private async readStored(identityId: string): Promise<Record<string, Record<string, boolean>>> {
    const row = await this.prisma.appSetting.findFirst({
      where: { key: `notifications.preferences.${identityId}`, partnerId: null },
    });
    if (!row) return {};
    const v = row.value as unknown;
    return isPrefShape(v) ? v : {};
  }

  private async writeStored(identityId: string, prefs: Record<string, Record<string, boolean>>, actor: string) {
    const key = `notifications.preferences.${identityId}`;
    // app_settings has no composite unique on (key, partner_id NULL) — upsert manually.
    const existing = await this.prisma.appSetting.findFirst({ where: { key, partnerId: null } });
    if (existing) {
      await this.prisma.appSetting.update({
        where: { id: existing.id },
        data: { value: prefs as unknown as Prisma.InputJsonValue, updatedBy: actor },
      });
    } else {
      await this.prisma.appSetting.create({
        data: {
          key,
          partnerId: null,
          value: prefs as unknown as Prisma.InputJsonValue,
          valueType: AppSettingType.JSON,
          description: 'Per-identity notification preferences',
          isSecret: false,
          updatedBy: actor,
        },
      });
    }
  }
}

export interface UnreadResult {
  unread_count: number;
  by_category: Partial<Record<NotificationCategory, number>>;
}

function mergeWithDefaults(stored: Record<string, Record<string, boolean>>): Record<string, Record<string, boolean>> {
  const merged: Record<string, Record<string, boolean>> = {};
  for (const [cat, defaults] of Object.entries(DEFAULT_PREFS)) {
    merged[cat] = { ...defaults, ...(stored[cat] ?? {}) };
  }
  // Force locked channels on regardless of what may be stored.
  for (const [cat, ch] of LOCKED_ON) merged[cat][ch] = true;
  return merged;
}

function isPrefShape(v: unknown): v is Record<string, Record<string, boolean>> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

// Exported for the self-check.
export const __internals = { DEFAULT_PREFS, LOCKED_ON, mergeWithDefaults };
export type { NotificationChannel };
