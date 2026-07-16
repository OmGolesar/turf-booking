import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { JobRegistry } from '../job.registry';
import type { JobHandler } from '../job.types';

const JOB_NAME = 'ArchivePublishedOutbox';
const RETENTION_DAYS = 30;
const BATCH_SIZE = 5_000;

// Deletes outbox_events that have been PUBLISHED for at least 30 days.
// The outbox is a delivery log, not the source of truth for domain state —
// once every subscriber has ack'd the row we're safe to prune. A separate
// archive table isn't part of the MVP; delete is fine per Part 2.5.3.
@Injectable()
export class ArchivePublishedOutboxJob implements JobHandler, OnModuleInit {
  private readonly logger = new Logger(ArchivePublishedOutboxJob.name);

  constructor(private readonly prisma: PrismaService, private readonly registry: JobRegistry) {}

  onModuleInit(): void {
    this.registry.register(JOB_NAME, this);
  }

  async run(): Promise<void> {
    // Batched delete — CTE keeps the WHERE selective on the partial index
    // and bounds the transaction size.
    let totalDeleted = 0;
    // Loop until a batch clears fewer than BATCH_SIZE rows (or nothing).
    // Guard against a runaway loop with a hard cap.
    for (let iter = 0; iter < 10; iter++) {
      const result = await this.prisma.$executeRaw(Prisma.sql`
        WITH candidates AS (
          SELECT id FROM outbox_events
           WHERE status = 'PUBLISHED'
             AND published_at < NOW() - INTERVAL '${Prisma.raw(String(RETENTION_DAYS))} days'
           LIMIT ${BATCH_SIZE}
        )
        DELETE FROM outbox_events
         WHERE id IN (SELECT id FROM candidates)
      `);
      totalDeleted += Number(result);
      if (Number(result) < BATCH_SIZE) break;
    }
    this.logger.log(`[ArchivePublishedOutbox] deleted=${totalDeleted} retention_days=${RETENTION_DAYS}`);
  }
}
