import { Global, Module } from '@nestjs/common';
import { IdempotencyService, idempotencyStoreProvider } from './idempotency.service';
import { IdempotencyInterceptor } from './idempotency.interceptor';

@Global()
@Module({
  providers: [idempotencyStoreProvider, IdempotencyService, IdempotencyInterceptor],
  exports: [IdempotencyService, IdempotencyInterceptor],
})
export class IdempotencyModule {}
