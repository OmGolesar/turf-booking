import { Injectable } from '@nestjs/common';
import type { Notification } from '@prisma/client';
import type { NotificationProvider, RecipientTarget, SendResult } from './provider.types';

// In-app notifications don't need an external hop: inserting the row is
// the delivery. The dispatcher still calls send() so the state transition
// (PENDING → SENT) goes through the same code path.
@Injectable()
export class InAppProvider implements NotificationProvider {
  readonly channel = 'IN_APP' as const;

  async send(_notification: Notification, _target: RecipientTarget): Promise<SendResult> {
    return { status: 'sent' };
  }
}
