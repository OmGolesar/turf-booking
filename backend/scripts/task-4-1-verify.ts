// Task 4.1 verification: two workers, one claim per interval + failure path.
// Not part of the permanent test suite; delete after Phase 4 lands proper tests.
/* eslint-disable no-console */
import assert from 'node:assert/strict';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from '../src/worker.module';
import { JobRegistry } from '../src/modules/background-jobs/job.registry';
import { JobRunnerService } from '../src/modules/background-jobs/job-runner.service';
import { PrismaService } from '../src/shared/prisma/prisma.service';

async function bootContext() {
  return NestFactory.createApplicationContext(WorkerModule, { logger: false });
}

async function reset(prisma: PrismaService, jobName: string) {
  await prisma.$executeRawUnsafe(
    `UPDATE background_jobs
        SET status='IDLE', locked_by=NULL, locked_until=NULL,
            last_success_at=NULL, last_failure_at=NULL, last_error=NULL,
            run_count=0, failure_count=0, next_run_at=NOW()
      WHERE job_name=$1`,
    jobName,
  );
}

async function main() {
  // Use an existing seeded job; the registry is per-context so we can bind
  // a fake handler to it without touching real seed data outside of counters.
  const JOB = 'ExpireBookingSessions';

  // --- Contention: two contexts race to claim; only one wins per interval. ---
  const [a, b] = await Promise.all([bootContext(), bootContext()]);
  const prisma = a.get(PrismaService);
  await reset(prisma, JOB);

  let aRuns = 0;
  let bRuns = 0;
  a.get(JobRegistry).register(JOB, {
    run: async () => {
      aRuns++;
      await new Promise((r) => setTimeout(r, 200));
    },
  });
  b.get(JobRegistry).register(JOB, {
    run: async () => {
      bRuns++;
      await new Promise((r) => setTimeout(r, 200));
    },
  });

  const [ra, rb] = await Promise.all([
    a.get(JobRunnerService).tryRun(JOB, 'worker-A'),
    b.get(JobRunnerService).tryRun(JOB, 'worker-B'),
  ]);

  const winners = [ra, rb].filter((r) => r === 'ran').length;
  assert.equal(winners, 1, `expected exactly one winner per interval, got ${winners} (a=${ra}, b=${rb})`);
  assert.equal(aRuns + bRuns, 1, 'exactly one handler should have executed');

  const row1 = await prisma.$queryRawUnsafe<Array<{ status: string; run_count: number; failure_count: number; last_error: string | null; next_run_at: Date | null }>>(
    `SELECT status, run_count, failure_count, last_error, next_run_at FROM background_jobs WHERE job_name=$1`,
    JOB,
  );
  assert.equal(row1[0].status, 'IDLE', 'winning run leaves status IDLE');
  assert.equal(row1[0].run_count, 1, 'run_count bumped to 1');
  assert.equal(row1[0].failure_count, 0, 'failure_count unchanged on success');
  assert.equal(row1[0].last_error, null, 'last_error cleared on success');
  assert.ok(row1[0].next_run_at instanceof Date, 'next_run_at set from cron');

  // --- Failure path: handler throws, row lands in FAILED with details. ---
  await reset(prisma, JOB);
  // Register a boom handler on a fresh context (registry forbids re-register).
  const c = await bootContext();
  c.get(JobRegistry).register(JOB, {
    run: async () => {
      throw new Error('boom');
    },
  });
  const rc = await c.get(JobRunnerService).tryRun(JOB, 'worker-C');
  assert.equal(rc, 'ran', 'failure path still counts as a run');

  const row2 = await prisma.$queryRawUnsafe<Array<{ status: string; run_count: number; failure_count: number; last_error: string | null }>>(
    `SELECT status, run_count, failure_count, last_error FROM background_jobs WHERE job_name=$1`,
    JOB,
  );
  assert.equal(row2[0].status, 'FAILED', 'failure sets status=FAILED');
  assert.equal(row2[0].run_count, 1, 'run_count bumped on failure');
  assert.equal(row2[0].failure_count, 1, 'failure_count bumped');
  assert.equal(row2[0].last_error, 'boom', 'last_error captured');

  // Restore seed row so we don't leave the registry dirty for the real workers.
  await reset(prisma, JOB);

  await Promise.all([a.close(), b.close(), c.close()]);
  console.log('task-4-1-verify: OK');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
