import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { LoggerModule } from './shared/logger/logger.module';
import { PrismaModule } from './shared/prisma/prisma.module';
import { OutboxModule } from './shared/outbox/outbox.module';
import { AuditModule } from './shared/audit/audit.module';
import { AuthModule } from './shared/auth/auth.module';
import { BackgroundJobsModule } from './modules/background-jobs/background-jobs.module';
import { WorkerJobsModule } from './modules/background-jobs/jobs/jobs.module';

// Worker-only Nest context. Deliberately narrower than AppModule — no HTTP
// stack, no auth guards, no controllers. As phase-4 tasks land they'll add
// feature modules here so the corresponding JobHandlers get instantiated.
@Module({
  imports: [
    LoggerModule,
    AppConfigModule,
    PrismaModule,
    OutboxModule,
    AuditModule,
    AuthModule,
    BackgroundJobsModule,
    WorkerJobsModule,
  ],
})
export class WorkerModule {}
