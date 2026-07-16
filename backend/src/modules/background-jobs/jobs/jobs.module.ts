import { Module } from '@nestjs/common';
import { AvailabilityModule } from '../../availability/availability.module';
import { BackgroundJobsModule } from '../background-jobs.module';
import { ExpireBookingSessionsJob } from './expire-booking-sessions.job';

// Aggregates job handlers and the feature modules they depend on. Kept
// separate from BackgroundJobsModule so the scheduler/runner stay decoupled
// from feature-module wiring. As tasks 4.3–4.6 land, their handlers register
// alongside this one via the same self-registration pattern.
@Module({
  imports: [BackgroundJobsModule, AvailabilityModule],
  providers: [ExpireBookingSessionsJob],
})
export class WorkerJobsModule {}
