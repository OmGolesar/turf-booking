import { Module } from '@nestjs/common';
import { JobRegistry } from './job.registry';
import { JobRunnerService } from './job-runner.service';
import { JobSchedulerService } from './job-scheduler.service';

@Module({
  providers: [JobRegistry, JobRunnerService, JobSchedulerService],
  exports: [JobRegistry, JobSchedulerService],
})
export class BackgroundJobsModule {}
