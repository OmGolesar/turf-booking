import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BookingStatus, NotificationCategory, NotificationChannel, NotificationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { JobRegistry } from '../job.registry';
import type { JobHandler } from '../job.types';

const JOB_NAME = 'SendBookingReminders';
const BATCH_SIZE = 500;
const REMINDER_LEAD_MINUTES = 120; // T-2h per Part 3.4 §18

// Creates BOOKING_REMINDER notifications ~2 hours before booking start
// (IST). Idempotent: `WHERE NOT EXISTS ... category='BOOKING_REMINDER'
// AND related_resource_id = booking.id` guards against duplicate reminders
// even if the job overshoots its interval.
@Injectable()
export class SendBookingRemindersJob implements JobHandler, OnModuleInit {
  private readonly logger = new Logger(SendBookingRemindersJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: JobRegistry,
  ) {}

  onModuleInit(): void {
    this.registry.register(JOB_NAME, this);
  }

  async run(): Promise<void> {
    // Find CONFIRMED bookings whose start (in IST) is within the next 2h,
    // and which don't yet have a BOOKING_REMINDER notification.
    //
    // Time model: booking_date is DATE, start_time is TIME — both stored as
    // naive IST. Compose (booking_date::text || ' ' || start_time)::timestamp
    // and cast to Asia/Kolkata → UTC for comparison with NOW().
    const rows = await this.prisma.$queryRaw<Array<CandidateRow>>(Prisma.sql`
      SELECT b.id, b.identity_id, b.reference_code, b.venue_id, b.ground_id,
             b.booking_date, b.start_time,
             ((b.booking_date::text || ' ' || b.start_time::text)::timestamp AT TIME ZONE 'Asia/Kolkata') AS start_utc
        FROM bookings b
       WHERE b.booking_status = 'CONFIRMED'
         AND b.deleted_at IS NULL
         AND ((b.booking_date::text || ' ' || b.start_time::text)::timestamp AT TIME ZONE 'Asia/Kolkata')
                 BETWEEN NOW() AND NOW() + INTERVAL '${Prisma.raw(String(REMINDER_LEAD_MINUTES))} minutes'
         AND NOT EXISTS (
               SELECT 1 FROM notifications n
                WHERE n.related_resource_type = 'Booking'
                  AND n.related_resource_id = b.id
                  AND n.category = 'BOOKING_REMINDER'
             )
       LIMIT ${BATCH_SIZE}
    `);
    if (rows.length === 0) return;

    // Two channels by default (push + in-app); email/sms only if user opted
    // in (checked later by DispatchNotifications). We keep the reminder-
    // creation code path simple — enumerate default channels here.
    const channels = [NotificationChannel.PUSH, NotificationChannel.IN_APP];

    const now = new Date();
    const created: Prisma.NotificationCreateManyInput[] = [];
    for (const b of rows) {
      const startUtcISO = new Date(b.start_utc).toISOString();
      const title = 'Booking reminder';
      const body = `Your booking ${b.reference_code} starts at ${fmtTime(b.start_time)}. See you soon!`;
      const data = {
        booking_id: b.id,
        booking_reference: b.reference_code,
        starts_at: startUtcISO,
        route: `/bookings/${b.id}`,
      } as Prisma.InputJsonValue;
      for (const ch of channels) {
        created.push({
          identityId: b.identity_id,
          channel: ch,
          category: NotificationCategory.BOOKING_REMINDER,
          title,
          body,
          data,
          relatedResourceType: 'Booking',
          relatedResourceId: b.id,
          status: NotificationStatus.PENDING,
          scheduledFor: null, // ready now — dispatcher fires on the next tick
        });
      }
    }

    if (created.length === 0) return;
    await this.prisma.notification.createMany({ data: created });
    void now;
    this.logger.log(
      `[SendBookingReminders] bookings=${rows.length} notifications=${created.length}`,
    );
  }
}

interface CandidateRow {
  id: string;
  identity_id: string;
  reference_code: string;
  venue_id: string;
  ground_id: string;
  booking_date: Date;
  start_time: Date;
  start_utc: Date;
}

function fmtTime(t: Date): string {
  return new Date(t).toISOString().slice(11, 16);
}
