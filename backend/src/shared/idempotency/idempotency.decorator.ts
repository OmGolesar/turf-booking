import { SetMetadata, UseInterceptors, applyDecorators } from '@nestjs/common';
import { IdempotencyInterceptor } from './idempotency.interceptor';

export const IDEMPOTENT_KEY = 'idempotent_endpoint';

// @Idempotent()          → header is required (booking, payment, webhooks)
// @Idempotent({optional: true}) → honoured if present, not required
export function Idempotent(opts: { optional?: boolean } = {}): MethodDecorator & ClassDecorator {
  return applyDecorators(
    SetMetadata(IDEMPOTENT_KEY, { required: !opts.optional }),
    UseInterceptors(IdempotencyInterceptor),
  );
}
