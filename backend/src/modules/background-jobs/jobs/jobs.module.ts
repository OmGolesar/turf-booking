import { Module } from '@nestjs/common';
import { AvailabilityModule } from '../../availability/availability.module';
import { NotificationModule } from '../../notification/notification.module';
import { RazorpayModule } from '../../../shared/razorpay/razorpay.module';
import { BackgroundJobsModule } from '../background-jobs.module';
import { CacheInvalidatorSubscriber } from '../subscribers/cache-invalidator.subscriber';
import { NotificationSubscriber } from '../subscribers/notification.subscriber';
import { FcmProvider } from '../providers/fcm.provider';
import { InAppProvider } from '../providers/in-app.provider';
import { Msg91SmsProvider } from '../providers/msg91-sms.provider';
import { SendGridEmailProvider } from '../providers/sendgrid-email.provider';
import { DispatchNotificationsJob } from './dispatch-notifications.job';
import { ExpireBookingSessionsJob } from './expire-booking-sessions.job';
import { PublishOutboxJob } from './publish-outbox.job';
import { SendBookingRemindersJob } from './send-booking-reminders.job';
import { RecalculateVenueRatingsJob } from './recalculate-venue-ratings.job';
import { ArchivePublishedOutboxJob } from './archive-published-outbox.job';
import { PurgeInactiveDeviceTokensJob } from './purge-inactive-device-tokens.job';
import { VerifyPaymentReconciliationJob } from './verify-payment-reconciliation.job';

// Aggregates job handlers + subscribers and the feature modules they depend
// on. Kept separate from BackgroundJobsModule so the scheduler/runner stay
// decoupled from feature-module wiring. New handlers/subscribers register
// themselves via onModuleInit — no forRoot boilerplate.
@Module({
  imports: [BackgroundJobsModule, AvailabilityModule, NotificationModule, RazorpayModule],
  providers: [
    // Jobs
    ExpireBookingSessionsJob,
    PublishOutboxJob,
    DispatchNotificationsJob,
    SendBookingRemindersJob,
    RecalculateVenueRatingsJob,
    ArchivePublishedOutboxJob,
    PurgeInactiveDeviceTokensJob,
    VerifyPaymentReconciliationJob,
    // Outbox subscribers
    CacheInvalidatorSubscriber,
    NotificationSubscriber,
    // Notification providers
    FcmProvider,
    Msg91SmsProvider,
    SendGridEmailProvider,
    InAppProvider,
  ],
})
export class WorkerJobsModule {}
