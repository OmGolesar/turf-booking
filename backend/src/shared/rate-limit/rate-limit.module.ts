import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { RateLimitGuard, DEFAULT_RATE_LIMITS } from './rate-limit.guard';

@Global()
@Module({
  imports: [ThrottlerModule.forRoot(DEFAULT_RATE_LIMITS)],
  providers: [{ provide: APP_GUARD, useClass: RateLimitGuard }],
})
export class RateLimitModule {}
