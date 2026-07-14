import { Module, Controller, Get } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AppConfigModule } from './config/config.module';
import { PrismaModule } from './shared/prisma/prisma.module';
import { LoggerModule } from './shared/logger/logger.module';
import { ResponseInterceptor } from './shared/response/response.interceptor';
import { HttpExceptionFilter } from './shared/errors/http-exception.filter';
import { AuthModule } from './shared/auth/auth.module';
import { OutboxModule } from './shared/outbox/outbox.module';
import { AuditModule } from './shared/audit/audit.module';
import { IdempotencyModule } from './shared/idempotency/idempotency.module';
import { RateLimitModule } from './shared/rate-limit/rate-limit.module';
import { AuthEndpointsModule } from './modules/auth/auth.module';
import { IdentityModule } from './modules/identity/identity.module';
import { PartnerModule } from './modules/partner/partner.module';
import { VenueModule } from './modules/venue/venue.module';
import { GroundModule } from './modules/ground/ground.module';
import { SchedulingModule } from './modules/scheduling/scheduling.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { SportsModule } from './modules/sports/sports.module';

@Controller('health')
class HealthController {
  @Get()
  health() {
    return { status: 'ok' };
  }
}

@Module({
  imports: [
    LoggerModule,
    AppConfigModule,
    PrismaModule,
    AuthModule,
    OutboxModule,
    AuditModule,
    IdempotencyModule,
    RateLimitModule,
    AuthEndpointsModule,
    IdentityModule,
    PartnerModule,
    VenueModule,
    GroundModule,
    SchedulingModule,
    PricingModule,
    SportsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class AppModule {}
