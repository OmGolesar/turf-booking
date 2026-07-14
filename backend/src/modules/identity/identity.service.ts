import { Injectable, Logger } from '@nestjs/common';
import { Prisma, DeviceToken, Notification, NotificationCategory, AppVariant, BookingStatus } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { FirebaseService } from '../../shared/auth/firebase.service';
import { OutboxService } from '../../shared/outbox/outbox.service';
import { AuditService } from '../../shared/audit/audit.service';
import { DomainException } from '../../shared/errors/domain.exception';
import { paginate } from '../../shared/pagination/paginate';
import { toIdentityResource, toProfileResource } from '../auth/dtos/identity-response';
import type { AuthContext } from '../../shared/auth/auth-context';
import type { UpdateProfileDto } from './dtos/update-profile.dto';
import type { RegisterDeviceTokenDto } from './dtos/register-device-token.dto';
import type { ListNotificationsDto } from './dtos/list-notifications.dto';

interface RequestMeta {
  requestId?: string;
  route?: string;
  sourceIp?: string;
  userAgent?: string;
}

export interface NotificationsPage {
  data: NotificationResource[];
  pagination: import('../../shared/response/envelope').PaginationMeta;
  unread_count: number;
}

export interface NotificationResource {
  id: string;
  category: NotificationCategory;
  channel: Notification['channel'];
  title: string;
  body: string;
  data: Notification['data'];
  status: Notification['status'];
  read_at: string | null;
  created_at: string;
}

@Injectable()
export class IdentityService {
  private readonly logger = new Logger(IdentityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly firebase: FirebaseService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
  ) {}

  // ── PATCH /identity/profile ─────────────────────────────────────────────
  async updateProfile(ctx: AuthContext, dto: UpdateProfileDto, meta: RequestMeta) {
    const changes: Record<string, { before: unknown; after: unknown }> = {};

    const result = await this.prisma.$transaction(async (tx) => {
      const before = await tx.identityProfile.findUnique({ where: { identityId: ctx.identityId } });
      if (!before) throw new DomainException('IDENTITY_NOT_FOUND');

      const data: Prisma.IdentityProfileUpdateInput = {};
      if (dto.first_name !== undefined && dto.first_name !== before.firstName) {
        changes.first_name = { before: before.firstName, after: dto.first_name };
        data.firstName = dto.first_name;
      }
      if (dto.last_name !== undefined && dto.last_name !== before.lastName) {
        changes.last_name = { before: before.lastName, after: dto.last_name };
        data.lastName = dto.last_name;
      }
      if (dto.avatar_url !== undefined && dto.avatar_url !== before.avatarUrl) {
        changes.avatar_url = { before: before.avatarUrl, after: dto.avatar_url };
        data.avatarUrl = dto.avatar_url;
      }
      if (dto.city !== undefined && dto.city !== before.city) {
        changes.city = { before: before.city, after: dto.city };
        data.city = dto.city;
      }
      if (dto.language !== undefined && dto.language !== before.language) {
        changes.language = { before: before.language, after: dto.language };
        data.language = dto.language;
      }

      if (Object.keys(data).length === 0) return before;
      data.updatedBy = ctx.identityId;
      const after = await tx.identityProfile.update({ where: { identityId: ctx.identityId }, data });

      await this.audit.record(tx, {
        actorIdentityId: ctx.identityId,
        actorRole: ctx.role,
        action: 'IdentityProfileUpdated',
        resourceType: 'IdentityProfile',
        resourceId: after.id,
        changes,
        context: meta,
      });
      await this.outbox.emit(tx, {
        aggregateType: 'Identity',
        aggregateId: ctx.identityId,
        eventType: 'IdentityProfileUpdated',
        payload: { identity_id: ctx.identityId, changes },
        correlationId: meta.requestId,
      });
      return after;
    });

    return toProfileResource(result);
  }

  // ── POST /identity/phone/request-verification ──────────────────────────
  // Rate limiting is enforced by the route decorator (per-identity 5/hr).
  // Recording intent lets us cross-check phone-per-hour caps later.
  async requestPhoneVerification(ctx: AuthContext, phone: string): Promise<{ throttle_seconds: number }> {
    this.logger.log({ identity_id: ctx.identityId, phone_last4: phone.slice(-4) }, 'phone verification requested');
    return { throttle_seconds: 60 };
  }

  // ── POST /identity/phone/confirm ────────────────────────────────────────
  async confirmPhone(ctx: AuthContext, bearer: string, meta: RequestMeta) {
    const token = extractBearer(bearer);
    if (!token) throw new DomainException('AUTH_TOKEN_MISSING');
    let decoded;
    try {
      decoded = await this.firebase.verifyIdToken(token);
    } catch {
      throw new DomainException('AUTH_TOKEN_INVALID');
    }
    if (!decoded.phone_number) throw new DomainException('IDENTITY_PHONE_CLAIM_MISSING');

    const phone = decoded.phone_number;
    const identity = await this.prisma.$transaction(async (tx) => {
      const other = await tx.identity.findFirst({ where: { phone, id: { not: ctx.identityId } } });
      if (other) throw new DomainException('IDENTITY_PHONE_TAKEN');

      const updated = await tx.identity.update({
        where: { id: ctx.identityId },
        data: { phone, phoneVerifiedAt: new Date() },
      });

      await this.audit.record(tx, {
        actorIdentityId: ctx.identityId,
        actorRole: ctx.role,
        action: 'IdentityPhoneVerified',
        resourceType: 'Identity',
        resourceId: ctx.identityId,
        resourceReferenceCode: updated.referenceCode ?? undefined,
        changes: { phone: { before: null, after: maskPhone(phone) } },
        context: meta,
      });
      await this.outbox.emit(tx, {
        aggregateType: 'Identity',
        aggregateId: ctx.identityId,
        eventType: 'IdentityPhoneVerified',
        payload: { identity_id: ctx.identityId, phone: maskPhone(phone) },
        correlationId: meta.requestId,
      });
      return updated;
    });

    return { phone: identity.phone, phone_verified: true };
  }

  // ── GET /identity/customer-code ─────────────────────────────────────────
  async customerCode(ctx: AuthContext) {
    if (ctx.role !== 'CUSTOMER') throw new DomainException('IDENTITY_NOT_CUSTOMER');
    const identity = await this.prisma.identity.findUnique({ where: { id: ctx.identityId } });
    if (!identity?.referenceCode) throw new DomainException('IDENTITY_NOT_CUSTOMER');
    return {
      reference_code: identity.referenceCode,
      share_text: `My TurfX customer ID: ${identity.referenceCode}`,
    };
  }

  // ── POST /identity/device-tokens ────────────────────────────────────────
  async registerDeviceToken(
    ctx: AuthContext,
    dto: RegisterDeviceTokenDto,
    xDeviceId: string | undefined,
    appVariant: AppVariant,
    meta: RequestMeta,
  ) {
    if (xDeviceId && xDeviceId !== dto.device_id) throw new DomainException('DEVICE_ID_MISMATCH');

    const row = await this.prisma.$transaction(async (tx) => {
      // Deactivate any existing token for the same device+variant on this identity.
      await tx.deviceToken.updateMany({
        where: { identityId: ctx.identityId, deviceId: dto.device_id, appVariant, isActive: true },
        data: { isActive: false },
      });
      // Also deactivate the exact token if it belongs to a different identity (device handoff).
      await tx.deviceToken.updateMany({
        where: { token: dto.token, NOT: { identityId: ctx.identityId } },
        data: { isActive: false },
      });

      const created = await tx.deviceToken.upsert({
        where: { token: dto.token },
        create: {
          identityId: ctx.identityId,
          token: dto.token,
          platform: dto.platform,
          appVariant,
          deviceId: dto.device_id,
          appVersion: dto.app_version ?? null,
          osVersion: dto.os_version ?? null,
          isActive: true,
        },
        update: {
          identityId: ctx.identityId,
          platform: dto.platform,
          appVariant,
          deviceId: dto.device_id,
          appVersion: dto.app_version ?? null,
          osVersion: dto.os_version ?? null,
          isActive: true,
          lastUsedAt: new Date(),
        },
      });

      await this.audit.record(tx, {
        actorIdentityId: ctx.identityId,
        actorRole: ctx.role,
        action: 'IdentityDeviceTokenRegistered',
        resourceType: 'DeviceToken',
        resourceId: created.id,
        changes: { platform: { before: null, after: created.platform } },
        context: meta,
      });
      return created;
    });

    return this.serializeDeviceToken(row);
  }

  // ── DELETE /identity/device-tokens/:id ─────────────────────────────────
  async deactivateDeviceToken(ctx: AuthContext, id: string, meta: RequestMeta) {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.deviceToken.findUnique({ where: { id } });
      if (!existing || existing.identityId !== ctx.identityId) throw new DomainException('DEVICE_TOKEN_NOT_FOUND');
      if (!existing.isActive) return existing;
      const updated = await tx.deviceToken.update({ where: { id }, data: { isActive: false } });
      await this.audit.record(tx, {
        actorIdentityId: ctx.identityId,
        actorRole: ctx.role,
        action: 'IdentityDeviceTokenRemoved',
        resourceType: 'DeviceToken',
        resourceId: updated.id,
        context: meta,
      });
      return updated;
    });
    return null;
  }

  // ── GET /identity/notifications ────────────────────────────────────────
  async listNotifications(ctx: AuthContext, dto: ListNotificationsDto): Promise<NotificationsPage> {
    const where: Prisma.NotificationWhereInput = { identityId: ctx.identityId };
    if (dto.unread_only) where.readAt = null;
    if (dto.category) where.category = dto.category;

    const page = await paginate<Notification, { createdAt: string; id: string }>(
      { cursor: dto.cursor ?? null, limit: dto.limit ?? 20 },
      async ({ limit, cursor }) => {
        const cursorWhere: Prisma.NotificationWhereInput | undefined = cursor
          ? {
              OR: [
                { createdAt: { lt: new Date(cursor.createdAt) } },
                { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
              ],
            }
          : undefined;
        return this.prisma.notification.findMany({
          where: cursorWhere ? { AND: [where, cursorWhere] } : where,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: limit,
        });
      },
      (row) => ({ createdAt: row.createdAt.toISOString(), id: row.id }),
    );

    const unreadCount = await this.prisma.notification.count({
      where: { identityId: ctx.identityId, readAt: null },
    });

    return {
      data: page.data.map((n) => this.serializeNotification(n)),
      pagination: page.pagination,
      unread_count: unreadCount,
    };
  }

  // ── POST /identity/notifications/:id/actions/mark-read ─────────────────
  async markNotificationRead(ctx: AuthContext, id: string) {
    const n = await this.prisma.notification.findUnique({ where: { id } });
    if (!n || n.identityId !== ctx.identityId) throw new DomainException('NOTIFICATION_NOT_FOUND');
    if (n.readAt) {
      return { id: n.id, read_at: n.readAt.toISOString(), status: n.status };
    }
    const updated = await this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date(), status: 'READ' },
    });
    return { id: updated.id, read_at: updated.readAt!.toISOString(), status: updated.status };
  }

  // ── POST /identity/notifications/actions/mark-all-read ─────────────────
  async markAllNotificationsRead(ctx: AuthContext): Promise<{ marked_count: number }> {
    const now = new Date();
    const res = await this.prisma.notification.updateMany({
      where: { identityId: ctx.identityId, readAt: null },
      data: { readAt: now, status: 'READ' },
    });
    return { marked_count: res.count };
  }

  // ── POST /identity/actions/logout ──────────────────────────────────────
  async logout(ctx: AuthContext, deviceId: string, appVariant: AppVariant, meta: RequestMeta) {
    await this.prisma.$transaction(async (tx) => {
      await tx.deviceToken.updateMany({
        where: { identityId: ctx.identityId, deviceId, appVariant, isActive: true },
        data: { isActive: false },
      });
      await this.audit.record(tx, {
        actorIdentityId: ctx.identityId,
        actorRole: ctx.role,
        action: 'IdentityLoggedOut',
        resourceType: 'Identity',
        resourceId: ctx.identityId,
        changes: { device_id: { before: deviceId, after: null } },
        context: meta,
      });
      await this.outbox.emit(tx, {
        aggregateType: 'Identity',
        aggregateId: ctx.identityId,
        eventType: 'IdentityLoggedOut',
        payload: { identity_id: ctx.identityId, device_id: deviceId, app_variant: appVariant },
        correlationId: meta.requestId,
      });
    });
    return null;
  }

  // ── DELETE /identity ───────────────────────────────────────────────────
  async requestDeletion(ctx: AuthContext, meta: RequestMeta) {
    const RETENTION_NOTICE =
      'Booking and payment records are retained for 7 years per Indian financial regulations.';

    await this.prisma.$transaction(async (tx) => {
      const active = await tx.booking.count({
        where: {
          identityId: ctx.identityId,
          bookingStatus: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
          bookingDate: { gte: new Date() },
        },
      });
      if (active > 0) throw new DomainException('IDENTITY_HAS_ACTIVE_BOOKINGS');

      const now = new Date();
      const identity = await tx.identity.update({
        where: { id: ctx.identityId },
        data: { status: 'DELETED' },
      });
      // Anonymise profile.
      await tx.identityProfile.update({
        where: { identityId: ctx.identityId },
        data: {
          firstName: 'Deleted',
          lastName: null,
          avatarUrl: null,
          city: null,
          state: null,
          deletedAt: now,
          deletedBy: ctx.identityId,
        },
      });
      await tx.deviceToken.updateMany({
        where: { identityId: ctx.identityId, isActive: true },
        data: { isActive: false },
      });

      await this.audit.record(tx, {
        actorIdentityId: ctx.identityId,
        actorRole: ctx.role,
        action: 'IdentityDeleted',
        resourceType: 'Identity',
        resourceId: ctx.identityId,
        resourceReferenceCode: identity.referenceCode ?? undefined,
        context: meta,
      });
      await this.outbox.emit(tx, {
        aggregateType: 'Identity',
        aggregateId: ctx.identityId,
        eventType: 'IdentityDeleted',
        payload: { identity_id: ctx.identityId, retention_notice: RETENTION_NOTICE },
        correlationId: meta.requestId,
      });
    });

    return { status: 'DELETED' as const, retention_notice: RETENTION_NOTICE };
  }

  // ── serializers ────────────────────────────────────────────────────────

  private serializeDeviceToken(row: DeviceToken) {
    return {
      id: row.id,
      token: row.token,
      platform: row.platform,
      app_variant: row.appVariant,
      device_id: row.deviceId,
      is_active: row.isActive,
    };
  }

  private serializeNotification(n: Notification): NotificationResource {
    return {
      id: n.id,
      category: n.category,
      channel: n.channel,
      title: n.title,
      body: n.body,
      data: n.data,
      status: n.status,
      read_at: n.readAt ? n.readAt.toISOString() : null,
      created_at: n.createdAt.toISOString(),
    };
  }
}

function extractBearer(header: string | undefined): string | null {
  if (!header) return null;
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token || null;
}

function maskPhone(phone: string): string {
  return `${phone.slice(0, phone.length - 4).replace(/\d/g, '*')}${phone.slice(-4)}`;
}

// Silence unused-import lint until the me() helper needs it.
void toIdentityResource;
