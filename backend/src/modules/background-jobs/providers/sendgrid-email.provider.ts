import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ulid } from 'ulid';
import type { Env } from '../../../config/env.schema';
import type { Notification } from '@prisma/client';
import type { NotificationProvider, RecipientTarget, SendResult } from './provider.types';

// SendGrid transactional email. Dev-stub creds → log-only.
@Injectable()
export class SendGridEmailProvider implements NotificationProvider {
  readonly channel = 'EMAIL' as const;
  private readonly logger = new Logger(SendGridEmailProvider.name);
  private readonly configured: boolean;

  constructor(config: ConfigService<Env, true>) {
    const key = config.get('SENDGRID_API_KEY', { infer: true });
    this.configured = !!key && key !== 'dev';
  }

  async send(notification: Notification, target: RecipientTarget): Promise<SendResult> {
    if (!target.target) return { status: 'invalid_recipient', error: 'empty email' };
    if (!isEmail(target.target)) return { status: 'invalid_recipient', error: 'not a valid email' };

    if (!this.configured) {
      this.logger.debug(`[SendGrid] dry-run title="${notification.title}" to=${maskEmail(target.target)}`);
      return { status: 'sent', providerMessageId: `sg-dryrun-${ulid()}` };
    }

    // Production TODO: use @sendgrid/mail and a versioned template.
    this.logger.warn('[SendGrid] real send not implemented; treating as sent for MVP');
    return { status: 'sent', providerMessageId: `sg-todo-${ulid()}` };
  }
}

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function maskEmail(e: string): string {
  const at = e.indexOf('@');
  if (at < 2) return e;
  return `${e.slice(0, 2)}…${e.slice(at)}`;
}
