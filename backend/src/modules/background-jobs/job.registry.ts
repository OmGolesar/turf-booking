import { Injectable, Logger } from '@nestjs/common';
import type { JobHandler } from './job.types';

// Handler registry. Feature modules call `register(name, handler)` in their
// onModuleInit so the scheduler can look them up by `background_jobs.job_name`.
// A seeded row with no registered handler is skipped (no orphan RUNNING rows).
@Injectable()
export class JobRegistry {
  private readonly logger = new Logger(JobRegistry.name);
  private readonly handlers = new Map<string, JobHandler>();

  register(name: string, handler: JobHandler): void {
    if (this.handlers.has(name)) {
      throw new Error(`Job handler already registered for '${name}'`);
    }
    this.handlers.set(name, handler);
    this.logger.log(`Registered job handler '${name}'`);
  }

  get(name: string): JobHandler | undefined {
    return this.handlers.get(name);
  }

  names(): string[] {
    return [...this.handlers.keys()];
  }
}
