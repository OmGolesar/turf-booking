import { Injectable, Logger } from '@nestjs/common';
import type { OutboxSubscriber } from './subscriber.types';

// Subscribers self-register (same pattern as JobRegistry). Order is
// insertion order — the publisher dispatches to every matching subscriber
// per event, all-or-nothing (first-failure aborts the dispatch and the
// row goes back to PENDING with backoff).
@Injectable()
export class SubscriberRegistry {
  private readonly logger = new Logger(SubscriberRegistry.name);
  private readonly subscribers: OutboxSubscriber[] = [];

  register(subscriber: OutboxSubscriber): void {
    if (this.subscribers.some((s) => s.name === subscriber.name)) {
      throw new Error(`Subscriber already registered: ${subscriber.name}`);
    }
    this.subscribers.push(subscriber);
    this.logger.log(`Registered outbox subscriber '${subscriber.name}'`);
  }

  all(): readonly OutboxSubscriber[] {
    return this.subscribers;
  }
}
