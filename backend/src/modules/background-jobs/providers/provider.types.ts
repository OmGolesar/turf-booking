import type { Notification } from '@prisma/client';

export type SendStatus = 'sent' | 'unregistered' | 'invalid_recipient' | 'error';

export interface SendResult {
  status: SendStatus;
  providerMessageId?: string;
  error?: string;
}

// A recipient target for a channel. For push, this is one FCM token (a
// notification may fan out to many tokens — the dispatcher iterates and
// aggregates). For SMS/email, this is one number/address.
export interface RecipientTarget {
  identityId: string;
  target: string; // FCM token / phone / email / '' for in-app
  tokenId?: string; // device_tokens.id for push, so we can deactivate on UNREGISTERED
}

export interface NotificationProvider {
  readonly channel: 'PUSH' | 'SMS' | 'EMAIL' | 'IN_APP';
  send(notification: Notification, target: RecipientTarget): Promise<SendResult>;
}
