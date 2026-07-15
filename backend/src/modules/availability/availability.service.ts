import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { DomainException } from '../../shared/errors/domain.exception';
import { generateSlots, Slot } from './slot-generator';
import { AvailabilityCache, key } from './availability.cache';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface AvailabilityResult {
  ground_id: string;
  date: string;
  day_of_week: number;
  timezone: 'Asia/Kolkata';
  slots: Slot[];
}

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService, private readonly cache: AvailabilityCache) {}

  async getSlots(groundId: string, date: string, durationOverride?: number): Promise<AvailabilityResult> {
    if (!DATE_RE.test(date)) throw new DomainException('AVAILABILITY_INVALID_DATE');
    const cached = this.cache.get<AvailabilityResult>(key(groundId, date, durationOverride ?? null));
    if (cached) return cached;

    const ground = await this.prisma.ground.findFirst({
      where: { id: groundId, deletedAt: null },
      include: { configuration: true },
    });
    if (!ground) throw new DomainException('GROUND_NOT_FOUND');
    if (ground.status !== 'ACTIVE' && ground.status !== 'MAINTENANCE') {
      throw new DomainException('GROUND_NOT_ACTIVE');
    }

    const now = new Date();
    this.assertWithinBookingWindow(ground.configuration?.maxAdvanceBookingDays ?? 30, date, now);

    const day = dayOfWeek(date);
    const [operatingHour, exceptions, maintenance, pricingRules, existingBookings, activeBookingSessions] = await Promise.all([
      this.prisma.operatingHour.findFirst({ where: { groundId, dayOfWeek: day, deletedAt: null } }),
      this.prisma.availabilityException.findMany({
        where: { groundId, exceptionDate: new Date(`${date}T00:00:00Z`), deletedAt: null },
      }),
      this.prisma.maintenanceBlock.findMany({
        where: {
          groundId,
          deletedAt: null,
          // rough band; slot generator applies overlap on minute-level
          startDatetime: { lte: new Date(`${date}T23:59:59+05:30`) },
          endDatetime: { gte: new Date(`${date}T00:00:00+05:30`) },
        },
      }),
      this.prisma.pricingRule.findMany({ where: { groundId, deletedAt: null } }),
      this.prisma.booking.findMany({
        where: { groundId, bookingDate: new Date(`${date}T00:00:00Z`) },
      }),
      this.prisma.bookingSession.findMany({
        where: { groundId, bookingDate: new Date(`${date}T00:00:00Z`), status: 'ACTIVE' },
      }),
    ]);

    const slots = generateSlots({
      ground: { id: ground.id, status: ground.status },
      configuration: ground.configuration,
      operatingHour,
      exceptions,
      maintenance,
      pricingRules,
      existingBookings,
      activeBookingSessions,
      date,
      now,
      durationOverrideMinutes: durationOverride,
    });

    const result: AvailabilityResult = {
      ground_id: ground.id,
      date,
      day_of_week: day,
      timezone: 'Asia/Kolkata',
      slots,
    };
    this.cache.set(key(groundId, date, durationOverride ?? null), result);
    return result;
  }

  // Written by booking / scheduling flows after mutations. The outbox-driven
  // subscriber (Phase 4) will call this via events; until then, callers who
  // mutate the underlying rows should also call this directly.
  invalidate(groundId: string, date?: string): void {
    this.cache.invalidate(groundId, date);
  }

  private assertWithinBookingWindow(maxAdvanceDays: number, date: string, now: Date): void {
    const target = new Date(`${date}T00:00:00+05:30`);
    const nowDay = new Date(now.toISOString().slice(0, 10) + 'T00:00:00+05:30');
    const diffDays = Math.floor((target.getTime() - nowDay.getTime()) / 86_400_000);
    if (diffDays < 0) throw new DomainException('AVAILABILITY_OUTSIDE_WINDOW');
    if (diffDays > maxAdvanceDays) throw new DomainException('AVAILABILITY_OUTSIDE_WINDOW');
  }
}

function dayOfWeek(dateStr: string): number {
  const d = new Date(`${dateStr}T00:00:00+05:30`);
  return ((d.getUTCDay() + 6) % 7) + 1;
}
