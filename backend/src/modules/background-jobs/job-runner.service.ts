import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import parser from 'cron-parser';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { JobRegistry } from './job.registry';

const LOCK_LEASE_MINUTES = 5;
const IST_TZ = 'Asia/Kolkata';

interface ClaimedJob {
  id: string;
  job_name: string;
  schedule_cron: string | null;
  payload: unknown;
  run_count: number;
  failure_count: number;
}

// Owns one job's claim → execute → release lifecycle. The scheduler decides
// *when* to try; the runner atomically claims (or backs off) and runs the
// handler if a worker won the lock.
@Injectable()
export class JobRunnerService {
  private readonly logger = new Logger(JobRunnerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: JobRegistry,
  ) {}

  async tryRun(jobName: string, workerId: string): Promise<'ran' | 'skipped' | 'no-handler'> {
    const handler = this.registry.get(jobName);
    if (!handler) return 'no-handler';

    const claimed = await this.claim(jobName, workerId);
    if (!claimed) return 'skipped';

    const attempt = claimed.run_count + 1;
    this.logger.log(`[${jobName}] claimed by ${workerId} (attempt ${attempt})`);

    try {
      await handler.run(claimed.payload);
      await this.markSuccess(claimed);
      this.logger.log(`[${jobName}] success`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.markFailure(claimed, message);
      // Log with stack for observability; the DB carries the short message.
      this.logger.error(`[${jobName}] failed: ${message}`, err instanceof Error ? err.stack : undefined);
    }
    return 'ran';
  }

  // Atomic claim per Part 2.5.3 §Table 8 §Locking Contract, extended to allow
  // reruns from FAILED and re-acquisition of stale RUNNING leases.
  private async claim(jobName: string, workerId: string): Promise<ClaimedJob | null> {
    const rows = await this.prisma.$queryRaw<ClaimedJob[]>(Prisma.sql`
      UPDATE background_jobs
         SET status       = 'RUNNING',
             locked_by    = ${workerId},
             locked_until = NOW() + (${LOCK_LEASE_MINUTES}::text || ' minutes')::interval,
             last_run_at  = NOW(),
             updated_at   = NOW()
       WHERE job_name = ${jobName}
         AND (
           (status IN ('IDLE', 'FAILED')
             AND (next_run_at IS NULL OR next_run_at <= NOW()))
           OR (status = 'RUNNING' AND locked_until < NOW())
         )
      RETURNING id, job_name, schedule_cron, payload, run_count, failure_count
    `);
    return rows[0] ?? null;
  }

  private async markSuccess(job: ClaimedJob): Promise<void> {
    const next = computeNextRunAt(job.schedule_cron);
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE background_jobs
         SET status          = 'IDLE',
             locked_by       = NULL,
             locked_until    = NULL,
             last_success_at = NOW(),
             next_run_at     = ${next},
             run_count       = run_count + 1,
             last_error      = NULL,
             updated_at      = NOW()
       WHERE id = ${job.id}::uuid
    `);
  }

  private async markFailure(job: ClaimedJob, message: string): Promise<void> {
    const next = computeNextRunAt(job.schedule_cron);
    // Truncate to keep row modest; full stack is already in the logs.
    const trimmed = message.length > 2000 ? message.slice(0, 2000) : message;
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE background_jobs
         SET status          = 'FAILED',
             locked_by       = NULL,
             locked_until    = NULL,
             last_failure_at = NOW(),
             last_error      = ${trimmed},
             run_count       = run_count + 1,
             failure_count   = failure_count + 1,
             next_run_at     = ${next},
             updated_at      = NOW()
       WHERE id = ${job.id}::uuid
    `);
  }
}

// Exported for the self-check.
export function computeNextRunAt(cron: string | null): Date | null {
  if (!cron) return null;
  try {
    // IST for interpretation (e.g. `0 3 * * *` = 03:00 IST). All storage is UTC.
    const interval = parser.parseExpression(cron, { tz: IST_TZ });
    return interval.next().toDate();
  } catch {
    return null;
  }
}

export const __internals = { computeNextRunAt };
