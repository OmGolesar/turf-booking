import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ulid } from 'ulid';
import type { Env } from '../../../config/env.schema';
import type { Notification } from '@prisma/client';
import type { NotificationProvider, RecipientTarget, SendResult } from './provider.types';

// MSG91 transactional SMS. MVP is dev-stub creds; when a real
// MSG91_AUTH_KEY is set we'd POST to https://api.msg91.com/api/v5/flow/.
@Injectable()
export class Msg91SmsProvider implements NotificationProvider {
  readonly channel = 'SMS' as const;
  private readonly logger = new Logger(Msg91SmsProvider.name);
  private readonly configured: boolean;

  constructor(config: ConfigService<Env, true>) {
    const key = config.get('MSG91_AUTH_KEY', { infer: true });
    this.configured = !!key && key !== 'dev';
  }

  async send(notification: Notification, target: RecipientTarget): Promise<SendResult> {
    if (!target.target) return { status: 'invalid_recipient', error: 'empty phone' };
    if (!isE164(target.target)) return { status: 'invalid_recipient', error: 'not E.164' };

    if (target.target.startsWith('+9199990error')) {
      return { status: 'error', error: 'MSG91 transient (simulated)' };
    }

    if (!this.configured) {
      this.logger.debug(`[MSG91] dry-run title="${notification.title}" phone=${maskPhone(target.target)}`);
      return { status: 'sent', providerMessageId: `msg91-dryrun-${ulid()}` };
    }

    // Production TODO: POST to MSG91 Flow API with an approved template.
    this.logger.warn('[MSG91] real send not implemented; treating as sent for MVP');
    return { status: 'sent', providerMessageId: `msg91-todo-${ulid()}` };
  }
}

function isE164(p: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(p);
}

function maskPhone(p: string): string {
  return p.length <= 5 ? p : `${p.slice(0, 3)}…${p.slice(-3)}`;
}
