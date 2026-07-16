import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BookingSessionStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { OutboxService } from '../../../shared/outbox/outbox.service';
import { AuditService } from '../../../shared/audit/audit.service';
import { AvailabilityService } from '../../availability/availability.service';
import { JobRegistry } from '../job.registry';
import type { JobHandler } from '../job.types';

const JOB_NAME = 'ExpireBookingSessions';
const BATCH_SIZE = 200;

// Flip ACTIVE booking_sessions whose 10-minute hold has lapsed to EXPIRED
// and emit a BookingSessionExpired event per row. The cron `*/1 * * * *`
// gives at-least-once semantics — safe because the FOR UPDATE re-check
// inside the tx skips rows that a concurrent confirm() already consumed.
@Injectable()
export class ExpireBookingSessionsJob implements JobHandler, OnModuleInit {
  private readonly logger = new Logger(ExpireBookingSessionsJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
    private readonly availability: AvailabilityService,
    private readonly registry: JobRegistry,
  ) {}

  onModuleInit(): void {
    this.registry.register(JOB_NAME, this);
  }

  async run(): Promise<void> {
    // Fetch candidate ids outside the tx. Stale reads are fine: the per-row
    // re-check with FOR UPDATE below is what actually decides eligibility.
    const candidates = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id
        FROM booking_sessions
       WHERE status = 'ACTIVE'
         AND expires_at < NOW()
       LIMIT ${BATCH_SIZE}
    `);
    if (candidates.length === 0) return;

    let expired = 0;
    const invalidations: Array<{ groundId: string; date: string }> = [];

    for (const { id } of candidates) {
      const result = await this.expireOne(id);
      if (result) {
        expired++;
        invalidations.push(result);
      }
    }

    // Bust the availability cache once per (ground, date) pair — freed slots
    // should stop appearing as HELD on the next fetch.
    const seen = new Set<string>();
    for (const inv of invalidations) {
      const key = `${inv.groundId}|${inv.date}`;
      if (seen.has(key)) continue;
      seen.add(key);
      this.availability.invalidate(inv.groundId, inv.date);
    }

    this.logger.log(`[ExpireBookingSessions] scanned=${candidates.length} expired=${expired}`);
  }

  private async expireOne(id: string): Promise<{ groundId: string; date: string } | null> {
    return this.prisma.$transaction(async (tx) => {
      // Row lock. If a concurrent confirm() already promoted this session
      // (status flipped to CANCELLED), the re-check drops the row entirely.
      const rows = await tx.$queryRaw<Array<{ id: string; ground_id: string; booking_date: Date }>>(Prisma.sql`
        SELECT id, ground_id, booking_date
          FROM booking_sessions
         WHERE id = ${id}::uuid
           AND status = 'ACTIVE'
           AND expires_at < NOW()
         FOR UPDATE
      `);
      if (rows.length === 0) return null;
      const row = rows[0];

      await tx.bookingSession.update({
        where: { id: row.id },
        data: { status: BookingSessionStatus.EXPIRED },
      });

      await this.audit.record(tx, {
        actorIdentityId: null,
        actorRole: 'SYSTEM',
        action: 'BookingSessionExpired',
        resourceType: 'BookingSession',
        resourceId: row.id,
        changes: {
          status: { before: BookingSessionStatus.ACTIVE, after: BookingSessionStatus.EXPIRED },
        },
      });

      const dateStr = row.booking_date.toISOString().slice(0, 10);
      await this.outbox.emit(tx, {
        aggregateType: 'BookingSession',
        aggregateId: row.id,
        eventType: 'BookingSessionExpired',
        payload: {
          session_id: row.id,
          ground_id: row.ground_id,
          booking_date: dateStr,
          expired_by: 'SYSTEM',
        },
      });

      return { groundId: row.ground_id, date: dateStr };
    });
  }
}
