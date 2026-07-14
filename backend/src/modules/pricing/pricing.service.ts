import { Injectable } from '@nestjs/common';
import { Prisma, PricingRule } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { OutboxService } from '../../shared/outbox/outbox.service';
import { AuditService } from '../../shared/audit/audit.service';
import { DomainException } from '../../shared/errors/domain.exception';
import { GroundService } from '../ground/ground.service';
import type { AuthContext } from '../../shared/auth/auth-context';
import type { CreatePricingRuleDto, UpdatePricingRuleDto } from './dtos/pricing-rule.dto';

interface RequestMeta { requestId?: string; route?: string; sourceIp?: string; userAgent?: string }

export interface PricingRuleResource {
  id: string;
  ground_id: string;
  name: string;
  day_of_week: number | null;
  start_time: string;
  end_time: string;
  price_per_slot: number;
  price_paise: number;
  priority: number;
  active: boolean;
  effective_from: string | null;
  effective_to: string | null;
}

export interface SamplePricingBand {
  day_of_week: number;
  time_range: string;
  price_paise: number;
  matched_rule_id: string | null;
}

@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
    private readonly grounds: GroundService,
  ) {}

  async list(ctx: AuthContext, groundId: string) {
    const g = await this.prisma.ground.findFirst({ where: { id: groundId, deletedAt: null }, include: { venue: true } });
    if (!g) throw new DomainException('GROUND_NOT_FOUND');
    await this.grounds.assertOwnership(ctx, g.venue.partnerId);

    const rules = await this.prisma.pricingRule.findMany({
      where: { groundId, deletedAt: null },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
    return {
      rules: rules.map((r) => this.serialize(r)),
      sample_pricing: this.buildSample(rules),
    };
  }

  async create(ctx: AuthContext, groundId: string, dto: CreatePricingRuleDto, meta: RequestMeta): Promise<PricingRuleResource> {
    if (dto.start_time >= dto.end_time) throw new DomainException('PRICING_INVALID', { message: 'start_time must be < end_time' });
    const priceRupees = this.resolveRupees(dto);

    return this.prisma.$transaction(async (tx) => {
      const g = await tx.ground.findFirst({ where: { id: groundId, deletedAt: null }, include: { venue: true } });
      if (!g) throw new DomainException('GROUND_NOT_FOUND');
      await this.grounds.assertOwnership(ctx, g.venue.partnerId);

      // Priority is UNIQUE per ground at the DB level too; catching upfront gives a nicer error.
      const priorityDup = await tx.pricingRule.findFirst({ where: { groundId, priority: dto.priority, deletedAt: null } });
      if (priorityDup) throw new DomainException('PRICING_PRIORITY_TAKEN');

      const created = await tx.pricingRule.create({
        data: {
          groundId,
          name: dto.name,
          dayOfWeek: dto.day_of_week ?? null,
          startTime: hmToDate(dto.start_time),
          endTime: hmToDate(dto.end_time),
          pricePerSlot: new Prisma.Decimal(priceRupees),
          priority: dto.priority,
          active: dto.active ?? true,
          effectiveFrom: dto.effective_from ? new Date(dto.effective_from) : null,
          effectiveTo: dto.effective_to ? new Date(dto.effective_to) : null,
          createdBy: ctx.identityId,
        },
      });
      await this.audit.record(tx, {
        actorIdentityId: ctx.identityId,
        actorRole: ctx.role,
        action: 'PricingRuleCreated',
        resourceType: 'PricingRule',
        resourceId: created.id,
        context: meta,
      });
      await this.outbox.emit(tx, {
        aggregateType: 'Ground',
        aggregateId: groundId,
        eventType: 'PricingRuleCreated',
        payload: { ground_id: groundId, rule_id: created.id, priority: created.priority },
        correlationId: meta.requestId,
      });
      return this.serialize(created);
    });
  }

  async update(ctx: AuthContext, id: string, dto: UpdatePricingRuleDto, meta: RequestMeta): Promise<PricingRuleResource> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.pricingRule.findFirst({ where: { id, deletedAt: null }, include: { ground: { include: { venue: true } } } });
      if (!existing) throw new DomainException('PRICING_RULE_NOT_FOUND');
      await this.grounds.assertOwnership(ctx, existing.ground.venue.partnerId);

      // Validate combined start/end after applying the patch.
      const nextStart = dto.start_time ?? fmtTime(existing.startTime);
      const nextEnd = dto.end_time ?? fmtTime(existing.endTime);
      if (nextStart >= nextEnd) throw new DomainException('PRICING_INVALID');

      if (dto.priority !== undefined && dto.priority !== existing.priority) {
        const dup = await tx.pricingRule.findFirst({
          where: { groundId: existing.groundId, priority: dto.priority, deletedAt: null, NOT: { id } },
        });
        if (dup) throw new DomainException('PRICING_PRIORITY_TAKEN');
      }

      const data: Prisma.PricingRuleUpdateInput = { updatedBy: ctx.identityId };
      const changes: Record<string, { before: unknown; after: unknown }> = {};

      if (dto.name !== undefined && dto.name !== existing.name) { changes.name = { before: existing.name, after: dto.name }; data.name = dto.name; }
      if (dto.day_of_week !== undefined && dto.day_of_week !== existing.dayOfWeek) {
        changes.day_of_week = { before: existing.dayOfWeek, after: dto.day_of_week };
        data.dayOfWeek = dto.day_of_week;
      }
      if (dto.start_time !== undefined) { changes.start_time = { before: fmtTime(existing.startTime), after: dto.start_time }; data.startTime = hmToDate(dto.start_time); }
      if (dto.end_time !== undefined) { changes.end_time = { before: fmtTime(existing.endTime), after: dto.end_time }; data.endTime = hmToDate(dto.end_time); }
      if (dto.price_per_slot !== undefined || dto.price_paise !== undefined) {
        const rupees = this.resolveRupees(dto);
        changes.price_per_slot = { before: Number(existing.pricePerSlot), after: rupees };
        data.pricePerSlot = new Prisma.Decimal(rupees);
      }
      if (dto.priority !== undefined && dto.priority !== existing.priority) {
        changes.priority = { before: existing.priority, after: dto.priority };
        data.priority = dto.priority;
      }
      if (dto.active !== undefined && dto.active !== existing.active) {
        changes.active = { before: existing.active, after: dto.active };
        data.active = dto.active;
      }
      if (dto.effective_from !== undefined) data.effectiveFrom = dto.effective_from ? new Date(dto.effective_from) : null;
      if (dto.effective_to !== undefined) data.effectiveTo = dto.effective_to ? new Date(dto.effective_to) : null;

      const updated = await tx.pricingRule.update({ where: { id }, data });
      await this.audit.record(tx, {
        actorIdentityId: ctx.identityId,
        actorRole: ctx.role,
        action: 'PricingRuleUpdated',
        resourceType: 'PricingRule',
        resourceId: updated.id,
        changes,
        context: meta,
      });
      return this.serialize(updated);
    });
  }

  async deactivate(ctx: AuthContext, id: string, meta: RequestMeta) {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.pricingRule.findFirst({ where: { id, deletedAt: null }, include: { ground: { include: { venue: true } } } });
      if (!existing) throw new DomainException('PRICING_RULE_NOT_FOUND');
      await this.grounds.assertOwnership(ctx, existing.ground.venue.partnerId);
      await tx.pricingRule.update({
        where: { id },
        data: { active: false, deletedAt: new Date(), deletedBy: ctx.identityId },
      });
      await this.audit.record(tx, {
        actorIdentityId: ctx.identityId,
        actorRole: ctx.role,
        action: 'PricingRuleDeactivated',
        resourceType: 'PricingRule',
        resourceId: id,
        context: meta,
      });
    });
    return null;
  }

  // ── helpers ──

  private resolveRupees(dto: CreatePricingRuleDto | UpdatePricingRuleDto): number {
    if (dto.price_paise !== undefined && dto.price_per_slot !== undefined) {
      if (dto.price_paise !== dto.price_per_slot * 100) {
        throw new DomainException('PRICING_INVALID', { message: 'price_paise and price_per_slot disagree' });
      }
    }
    if (dto.price_per_slot !== undefined) return dto.price_per_slot;
    if (dto.price_paise !== undefined) return dto.price_paise / 100;
    throw new DomainException('PRICING_INVALID', { message: 'price_per_slot or price_paise is required' });
  }

  private serialize(r: PricingRule): PricingRuleResource {
    const rupees = Number(r.pricePerSlot);
    return {
      id: r.id,
      ground_id: r.groundId,
      name: r.name,
      day_of_week: r.dayOfWeek,
      start_time: fmtTime(r.startTime),
      end_time: fmtTime(r.endTime),
      price_per_slot: rupees,
      price_paise: Math.round(rupees * 100),
      priority: r.priority,
      active: r.active,
      effective_from: r.effectiveFrom ? r.effectiveFrom.toISOString() : null,
      effective_to: r.effectiveTo ? r.effectiveTo.toISOString() : null,
    };
  }

  // Produce a per-day contiguous-band breakdown of resolved prices — useful
  // preview for the partner UI. This is a lightweight resolver; the real
  // availability engine will consume the same rule set (Slice C).
  private buildSample(rules: PricingRule[]): SamplePricingBand[] {
    const active = rules.filter((r) => r.active);
    const bands: SamplePricingBand[] = [];
    for (let day = 1; day <= 7; day++) {
      const rulesForDay = active
        .filter((r) => r.dayOfWeek == null || r.dayOfWeek === day)
        .sort((a, b) => b.priority - a.priority); // highest wins

      // Collect edges from every rule's start/end.
      const edges = new Set<string>();
      edges.add('00:00');
      edges.add('23:59');
      for (const r of rulesForDay) {
        edges.add(fmtTime(r.startTime));
        edges.add(fmtTime(r.endTime));
      }
      const sortedEdges = Array.from(edges).sort();
      for (let i = 0; i < sortedEdges.length - 1; i++) {
        const start = sortedEdges[i];
        const end = sortedEdges[i + 1];
        const match = rulesForDay.find((r) => fmtTime(r.startTime) <= start && fmtTime(r.endTime) >= end);
        if (!match) continue;
        bands.push({
          day_of_week: day,
          time_range: `${start}-${end}`,
          price_paise: Math.round(Number(match.pricePerSlot) * 100),
          matched_rule_id: match.id,
        });
      }
    }
    return bands;
  }
}

function hmToDate(hm: string): Date {
  return new Date(`1970-01-01T${hm.length === 5 ? `${hm}:00` : hm}Z`);
}
function fmtTime(t: Date): string {
  return t.toISOString().slice(11, 16);
}
