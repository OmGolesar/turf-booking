import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as os from 'node:os';
import { ulid } from 'ulid';
import { JobRegistry } from './job.registry';
import { JobRunnerService } from './job-runner.service';

const TICK_INTERVAL_MS = 5_000;

// Ticks every 5s; for each registered handler, asks the runner to attempt a
// claim. The DB decides who wins under contention — this service is stateless
// beyond the tick timer, so N worker instances can run safely side by side.
@Injectable()
export class JobSchedulerService implements OnModuleDestroy {
  private readonly logger = new Logger(JobSchedulerService.name);
  private readonly workerId = `${os.hostname()}:${process.pid}:${ulid()}`;
  private timer: NodeJS.Timeout | null = null;
  private ticking = false;
  private stopped = false;

  constructor(
    private readonly registry: JobRegistry,
    private readonly runner: JobRunnerService,
  ) {}

  start(): void {
    if (this.timer) return;
    this.logger.log(`Scheduler starting (worker=${this.workerId}, handlers=[${this.registry.names().join(', ')}])`);
    this.timer = setInterval(() => void this.tick(), TICK_INTERVAL_MS);
    // Fire once immediately so we don't wait 5s on startup.
    setImmediate(() => void this.tick());
  }

  async stop(): Promise<void> {
    if (this.stopped) return;
    this.stopped = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    // Give an in-flight tick a moment to settle before shutdown; jobs
    // that were mid-execution will still commit or roll back on their own.
    while (this.ticking) await sleep(50);
    this.logger.log('Scheduler stopped');
  }

  async onModuleDestroy(): Promise<void> {
    await this.stop();
  }

  private async tick(): Promise<void> {
    if (this.ticking || this.stopped) return;
    this.ticking = true;
    try {
      for (const name of this.registry.names()) {
        if (this.stopped) break;
        try {
          await this.runner.tryRun(name, this.workerId);
        } catch (err) {
          // The runner already logs handler failures; anything reaching here
          // is a scheduler-side bug we don't want to kill the tick loop over.
          this.logger.error(`Tick error for '${name}': ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    } finally {
      this.ticking = false;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
