import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OutboxStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { JobRegistry } from '../job.registry';
import { SubscriberRegistry } from '../subscribers/subscriber.registry';
import type { OutboxEventRecord } from '../subscribers/subscriber.types';
import type { JobHandler } from '../job.types';

const JOB_NAME = 'PublishOutbox';
const BATCH_SIZE = 100;
const MAX_ATTEMPTS = 10;
const BASE_BACKOFF_MS = 30_000;      // 30s
const MAX_BACKOFF_MS = 30 * 60_000;  // 30min

// Drains outbox_events per Part 2.5.3 §Table 4 (Publisher Pseudocode).
// Claims PENDING rows with FOR UPDATE SKIP LOCKED, dispatches to every
// matching subscriber, transitions to PUBLISHED on success or reschedules
// with exponential backoff on failure. attempts >= 10 → FAILED.
@Injectable()
export class PublishOutboxJob implements JobHandler, OnModuleInit {
  private readonly logger = new Logger(PublishOutboxJob.name);
  private published = 0;
  private failed = 0;
  private retried = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: JobRegistry,
    private readonly subscribers: SubscriberRegistry,
  ) {}

  onModuleInit(): void {
    this.registry.register(JOB_NAME, this);
  }

  async run(): Promise<void> {
    // The claim + dispatch loop is bounded — even if there's a backlog, we
    // process at most BATCH_SIZE per tick so a single job invocation stays
    // predictable. The next tick picks up the next batch.
    const claimed = await this.claimBatch();
    if (claimed.length === 0) return;

    let published = 0;
    let retried = 0;
    let failed = 0;

    for (const event of claimed) {
      const result = await this.dispatch(event);
      if (result === 'published') published++;
      else if (result === 'failed') failed++;
      else retried++;
    }

    this.published += published;
    this.retried += retried;
    this.failed += failed;
    this.logger.log(
      `[PublishOutbox] batch=${claimed.length} published=${published} retried=${retried} failed=${failed} totals={published=${this.published},retried=${this.retried},failed=${this.failed}}`,
    );
  }

  // Atomic claim: mark PENDING rows as PROCESSING and return the row shape
  // subscribers need. FOR UPDATE SKIP LOCKED lets multiple workers share the
  // load without lock contention (though today only one worker runs the job
  // per interval — the SKIP LOCKED is future-proofing).
  private async claimBatch(): Promise<OutboxEventRecord[]> {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<RawRow>>(Prisma.sql`
        SELECT id, aggregate_type, aggregate_id, event_type, sequence_no,
               payload, correlation_id, attempts, created_at
          FROM outbox_events
         WHERE status = 'PENDING'
           AND available_at <= NOW()
         ORDER BY available_at, sequence_no
         LIMIT ${BATCH_SIZE}
         FOR UPDATE SKIP LOCKED
      `);
      if (rows.length === 0) return [];

      // Flip to PROCESSING + attempts++. Same tx as the SELECT ... FOR UPDATE
      // so the lock survives until we commit.
      const ids = rows.map((r) => r.id);
      await tx.$executeRaw(Prisma.sql`
        UPDATE outbox_events
           SET status = 'PROCESSING',
               attempts = attempts + 1
         WHERE id = ANY(${ids}::uuid[])
      `);

      return rows.map((r) => ({
        id: r.id,
        aggregateType: r.aggregate_type,
        aggregateId: r.aggregate_id,
        eventType: r.event_type,
        sequenceNo: r.sequence_no,
        payload: (r.payload ?? {}) as Record<string, unknown>,
        correlationId: r.correlation_id,
        attempts: r.attempts + 1,
        createdAt: r.created_at,
      }));
    });
  }

  private async dispatch(event: OutboxEventRecord): Promise<'published' | 'retried' | 'failed'> {
    const matching = this.subscribers.all().filter((s) => s.matches(event));
    try {
      for (const s of matching) {
        await s.handle(event);
      }
      await this.markPublished(event.id);
      return 'published';
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `[PublishOutbox] event=${event.eventType}#${event.sequenceNo} id=${event.id} attempt=${event.attempts} error=${message}`,
        err instanceof Error ? err.stack : undefined,
      );
      if (event.attempts >= MAX_ATTEMPTS) {
        await this.markFailed(event.id, message);
        return 'failed';
      }
      const backoff = computeBackoffMs(event.attempts);
      await this.markForRetry(event.id, message, backoff);
      return 'retried';
    }
  }

  private async markPublished(id: string): Promise<void> {
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE outbox_events
         SET status         = 'PUBLISHED',
             published_at   = NOW(),
             last_error     = NULL,
             next_attempt_at = NULL
       WHERE id = ${id}::uuid
    `);
  }

  private async markForRetry(id: string, message: string, backoffMs: number): Promise<void> {
    const trimmed = message.length > 2000 ? message.slice(0, 2000) : message;
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE outbox_events
         SET status          = 'PENDING',
             last_error      = ${trimmed},
             next_attempt_at = NOW() + (${backoffMs}::text || ' milliseconds')::interval,
             available_at    = NOW() + (${backoffMs}::text || ' milliseconds')::interval
       WHERE id = ${id}::uuid
    `);
  }

  private async markFailed(id: string, message: string): Promise<void> {
    const trimmed = message.length > 2000 ? message.slice(0, 2000) : message;
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE outbox_events
         SET status     = 'FAILED',
             last_error = ${trimmed}
       WHERE id = ${id}::uuid
    `);
  }

  // Exposed for metrics/observability & tests.
  metrics() {
    return { published: this.published, retried: this.retried, failed: this.failed };
  }
}

interface RawRow {
  id: string;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  sequence_no: bigint;
  payload: unknown;
  correlation_id: string | null;
  attempts: number;
  created_at: Date;
}

export function computeBackoffMs(attempts: number): number {
  // attempts=1 → 30s, 2 → 60s, 3 → 2m, 4 → 4m, 5 → 8m, 6 → 16m, 7+ → 30m (cap).
  return Math.min(BASE_BACKOFF_MS * Math.pow(2, Math.max(0, attempts - 1)), MAX_BACKOFF_MS);
}

// Suppress unused enum import warning; status constants are the string values.
void OutboxStatus;

export const __internals = { computeBackoffMs };
