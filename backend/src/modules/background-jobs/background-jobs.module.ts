import { Module } from '@nestjs/common';
import { JobRegistry } from './job.registry';
import { JobRunnerService } from './job-runner.service';
import { JobSchedulerService } from './job-scheduler.service';
import { SubscriberRegistry } from './subscribers/subscriber.registry';

@Module({
  providers: [JobRegistry, JobRunnerService, JobSchedulerService, SubscriberRegistry],
  exports: [JobRegistry, JobSchedulerService, SubscriberRegistry],
})
export class BackgroundJobsModule {}
