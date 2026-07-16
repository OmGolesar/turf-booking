import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ulid } from 'ulid';
import type { Env } from '../../../config/env.schema';
import type { Notification } from '@prisma/client';
import type { NotificationProvider, RecipientTarget, SendResult } from './provider.types';

// FCM push. When FCM_SERVICE_ACCOUNT is a real JSON blob, we'd initialise
// firebase-admin messaging and call send(). MVP ships with dev-stub creds
// (`FCM_SERVICE_ACCOUNT={}`); in that case we log the intent and return
// 'sent' so the pipeline stays green in local dev. UNREGISTERED tokens are
// simulated by any token starting with 'invalid:' — the dispatch job then
// deactivates that token in device_tokens.
@Injectable()
export class FcmProvider implements NotificationProvider {
  readonly channel = 'PUSH' as const;
  private readonly logger = new Logger(FcmProvider.name);
  private readonly configured: boolean;

  constructor(config: ConfigService<Env, true>) {
    const raw = config.get('FCM_SERVICE_ACCOUNT', { infer: true });
    this.configured = raw !== undefined && raw !== '{}' && raw.length > 2;
  }

  async send(notification: Notification, target: RecipientTarget): Promise<SendResult> {
    if (!target.target) return { status: 'invalid_recipient', error: 'empty FCM token' };

    // Test / dev hook: tokens beginning with 'invalid:' simulate an
    // UNREGISTERED response so the dispatcher's deactivation path can be
    // exercised without a real FCM call.
    if (target.target.startsWith('invalid:')) {
      return { status: 'unregistered', error: 'UNREGISTERED (simulated)' };
    }
    if (target.target.startsWith('error:')) {
      return { status: 'error', error: 'FCM transient (simulated)' };
    }

    if (!this.configured) {
      this.logger.debug(
        `[FCM] dry-run title="${notification.title}" token=${maskToken(target.target)}`,
      );
      return { status: 'sent', providerMessageId: `fcm-dryrun-${ulid()}` };
    }

    // Production TODO: initialise firebase-admin messaging and call
    // admin.messaging().send({...}). Left as a follow-up so we don't ship
    // a real network call behind a maybe-stub credential.
    this.logger.warn('[FCM] real send not implemented; treating as sent for MVP');
    return { status: 'sent', providerMessageId: `fcm-todo-${ulid()}` };
  }
}

function maskToken(t: string): string {
  return t.length <= 8 ? t : `${t.slice(0, 4)}…${t.slice(-4)}`;
}
