import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AvailabilityService } from '../../availability/availability.service';
import { SubscriberRegistry } from './subscriber.registry';
import type { OutboxEventRecord, OutboxSubscriber } from './subscriber.types';

// Backup path for availability cache invalidation. Booking services already
// invalidate inline on success; this subscriber catches any code path that
// forgot, and keeps the cache correct even if the API instance and the
// worker instance run on separate boxes.
@Injectable()
export class CacheInvalidatorSubscriber implements OutboxSubscriber, OnModuleInit {
  readonly name = 'CacheInvalidator';
  private readonly logger = new Logger(CacheInvalidatorSubscriber.name);

  constructor(
    private readonly availability: AvailabilityService,
    private readonly registry: SubscriberRegistry,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  matches(event: OutboxEventRecord): boolean {
    return event.aggregateType === 'Booking' || event.aggregateType === 'BookingSession';
  }

  async handle(event: OutboxEventRecord): Promise<void> {
    const groundId = extract(event.payload, 'ground_id');
    const bookingDate = extract(event.payload, 'booking_date');
    if (!groundId) return;
    this.availability.invalidate(groundId, bookingDate ?? undefined);
    this.logger.debug(
      `[CacheInvalidator] event=${event.eventType} ground=${groundId} date=${bookingDate ?? '*'}`,
    );
  }
}

function extract(payload: Record<string, unknown>, key: string): string | null {
  const v = payload[key];
  return typeof v === 'string' ? v : null;
}
