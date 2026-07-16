import { Injectable } from '@nestjs/common';
import { NotificationCategory, NotificationChannel, NotificationStatus, Role } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { OutboxService } from '../../shared/outbox/outbox.service';
import { AuditService } from '../../shared/audit/audit.service';
import { DomainException } from '../../shared/errors/domain.exception';
import type { AuthContext } from '../../shared/auth/auth-context';
import type { CreateSupportTicketDto } from './dtos/support.dto';

interface RequestMeta { requestId?: string; route?: string; sourceIp?: string; userAgent?: string }

// Reference-code prefixes we resolve. TX-PY is a booking-scoped payment lookup.
const CODE_RE = /^TX-(PT|VN|GR|BK|PY|CS)-([A-Z0-9-]+)$/;

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
  ) {}

  // GET /support/lookup?code=TX-…
  async lookup(ctx: AuthContext, code: string) {
    const m = code.trim().match(CODE_RE);
    if (!m) throw new DomainException('SUPPORT_CODE_INVALID');
    const prefix = m[1];

    switch (prefix) {
      case 'BK': return this.lookupBooking(ctx, code);
      case 'PY': return this.lookupPayment(ctx, code);
      case 'VN': return this.lookupVenue(ctx, code);
      case 'GR': return this.lookupGround(ctx, code);
      case 'PT': return this.lookupPartner(ctx, code);
      case 'CS': return this.lookupCustomer(ctx, code);
      default: throw new DomainException('SUPPORT_CODE_INVALID');
    }
  }

  // POST /support/tickets — stub. Persist an in-app notification to admin.
  async createTicket(ctx: AuthContext, dto: CreateSupportTicketDto, meta: RequestMeta) {
    // Fan out to every admin identity as an IN_APP notification. Small user base
    // makes this fine; when admin count grows past ~20 move to a support-inbox table.
    const admins = await this.prisma.identity.findMany({
      where: { role: Role.ADMIN, status: 'ACTIVE' },
      select: { id: true },
    });

    await this.prisma.$transaction(async (tx) => {
      if (admins.length) {
        await tx.notification.createMany({
          data: admins.map((a) => ({
            identityId: a.id,
            channel: NotificationChannel.IN_APP,
            category: NotificationCategory.SYSTEM_ANNOUNCEMENT,
            title: `Support: ${dto.category}`,
            body: dto.description.slice(0, 500),
            data: {
              from_identity_id: ctx.identityId,
              reference_code: dto.reference_code ?? null,
              attachments: dto.attachments ?? [],
            },
            status: NotificationStatus.SENT,
            sentAt: new Date(),
          })),
        });
      }
      await this.audit.record(tx, {
        actorIdentityId: ctx.identityId,
        actorRole: ctx.role,
        action: 'SupportTicketCreated',
        resourceType: 'SupportTicket',
        // No dedicated table yet — use the audit_logs id as the resource id.
        resourceId: ctx.identityId,
        context: meta,
      });
      await this.outbox.emit(tx, {
        aggregateType: 'SupportTicket',
        aggregateId: ctx.identityId,
        eventType: 'SupportTicketCreated',
        payload: {
          from_identity_id: ctx.identityId,
          category: dto.category,
          reference_code: dto.reference_code ?? null,
        },
        correlationId: meta.requestId,
      });
    });

    return { status: 'ACCEPTED' as const, message: 'Support ticket queued for review.' };
  }

  // ── lookups ────────────────────────────────────────────────────────────

  private async lookupBooking(ctx: AuthContext, code: string) {
    const b = await this.prisma.booking.findFirst({
      where: { referenceCode: code, deletedAt: null },
      include: {
        payment: true,
        venue: { select: { referenceCode: true, name: true } },
        ground: { select: { referenceCode: true, name: true } },
        identity: {
          select: {
            referenceCode: true,
            phone: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!b) throw new DomainException('SUPPORT_CODE_NOT_FOUND');
    this.assertOwner(ctx, { identityId: b.identityId, partnerId: b.partnerId });
    return {
      type: 'BOOKING' as const,
      resource_id: b.id,
      summary: {
        booking_reference: b.referenceCode,
        status: b.bookingStatus,
        customer: {
          reference_code: b.identity.referenceCode,
          name: shortName(b.identity.profile),
          phone: b.identity.phone,
        },
        venue: { reference_code: b.venue.referenceCode, name: b.venue.name },
        ground: { reference_code: b.ground.referenceCode, name: b.ground.name },
        booking_date: b.bookingDate.toISOString().slice(0, 10),
        start_time: fmtTime(b.startTime),
        end_time: fmtTime(b.endTime),
        amount_paise: Math.round(Number(b.totalAmount) * 100),
        payment_reference: b.payment?.referenceCode ?? null,
        payment_status: b.payment?.paymentStatus ?? null,
      },
    };
  }

  private async lookupPayment(ctx: AuthContext, code: string) {
    const p = await this.prisma.payment.findFirst({
      where: { referenceCode: code },
      include: {
        booking: {
          include: {
            venue: { select: { referenceCode: true, name: true } },
            ground: { select: { referenceCode: true, name: true } },
            identity: {
              select: {
                referenceCode: true,
                phone: true,
                profile: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });
    if (!p) throw new DomainException('SUPPORT_CODE_NOT_FOUND');
    this.assertOwner(ctx, { identityId: p.booking.identityId, partnerId: p.booking.partnerId });
    return {
      type: 'PAYMENT' as const,
      resource_id: p.id,
      summary: {
        payment_reference: p.referenceCode,
        provider: p.paymentProvider,
        transaction_reference: p.transactionReference,
        amount_paise: Math.round(Number(p.amount) * 100),
        status: p.paymentStatus,
        booking_reference: p.booking.referenceCode,
        customer: {
          reference_code: p.booking.identity.referenceCode,
          name: shortName(p.booking.identity.profile),
          phone: p.booking.identity.phone,
        },
        venue: { reference_code: p.booking.venue.referenceCode, name: p.booking.venue.name },
        ground: { reference_code: p.booking.ground.referenceCode, name: p.booking.ground.name },
      },
    };
  }

  private async lookupVenue(ctx: AuthContext, code: string) {
    const v = await this.prisma.venue.findFirst({
      where: { referenceCode: code, deletedAt: null },
      select: { id: true, referenceCode: true, name: true, partnerId: true, status: true, city: true },
    });
    if (!v) throw new DomainException('SUPPORT_CODE_NOT_FOUND');
    this.assertOwner(ctx, { partnerId: v.partnerId });
    return {
      type: 'VENUE' as const,
      resource_id: v.id,
      summary: { reference_code: v.referenceCode, name: v.name, status: v.status, city: v.city, partner_id: v.partnerId },
    };
  }

  private async lookupGround(ctx: AuthContext, code: string) {
    const g = await this.prisma.ground.findFirst({
      where: { referenceCode: code, deletedAt: null },
      include: { venue: { select: { partnerId: true, referenceCode: true, name: true } } },
    });
    if (!g) throw new DomainException('SUPPORT_CODE_NOT_FOUND');
    this.assertOwner(ctx, { partnerId: g.venue.partnerId });
    return {
      type: 'GROUND' as const,
      resource_id: g.id,
      summary: {
        reference_code: g.referenceCode,
        name: g.name,
        status: g.status,
        venue: { reference_code: g.venue.referenceCode, name: g.venue.name },
      },
    };
  }

  private async lookupPartner(ctx: AuthContext, code: string) {
    const p = await this.prisma.partner.findFirst({
      where: { referenceCode: code, deletedAt: null },
      select: { id: true, referenceCode: true, businessName: true, city: true, status: true, identityId: true },
    });
    if (!p) throw new DomainException('SUPPORT_CODE_NOT_FOUND');
    this.assertOwner(ctx, { partnerId: p.id });
    return {
      type: 'PARTNER' as const,
      resource_id: p.id,
      summary: {
        reference_code: p.referenceCode,
        business_name: p.businessName,
        city: p.city,
        status: p.status,
      },
    };
  }

  private async lookupCustomer(ctx: AuthContext, code: string) {
    const c = await this.prisma.identity.findFirst({
      where: { referenceCode: code, role: Role.CUSTOMER },
      select: {
        id: true,
        referenceCode: true,
        phone: true,
        status: true,
        profile: { select: { firstName: true, lastName: true } },
      },
    });
    if (!c) throw new DomainException('SUPPORT_CODE_NOT_FOUND');
    this.assertOwner(ctx, { identityId: c.id });
    return {
      type: 'CUSTOMER' as const,
      resource_id: c.id,
      summary: {
        reference_code: c.referenceCode,
        name: shortName(c.profile),
        phone: c.phone,
        status: c.status,
      },
    };
  }

  // Non-admins can only resolve resources they own. 404 (not 403) — never leak existence.
  private assertOwner(ctx: AuthContext, resource: { identityId?: string; partnerId?: string }) {
    if (ctx.role === Role.ADMIN) return;
    if (resource.identityId && resource.identityId === ctx.identityId) return;
    if (resource.partnerId && ctx.partnerId && resource.partnerId === ctx.partnerId) return;
    throw new DomainException('SUPPORT_CODE_NOT_FOUND');
  }
}

function fmtTime(t: Date): string {
  return t.toISOString().slice(11, 16);
}

function shortName(profile: { firstName: string; lastName: string | null } | null): string {
  if (!profile) return 'Customer';
  const last = profile.lastName?.trim();
  return last ? `${profile.firstName} ${last[0]}.` : profile.firstName;
}

export const __internals = { CODE_RE };
