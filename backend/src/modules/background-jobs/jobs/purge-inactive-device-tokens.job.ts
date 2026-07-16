import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { JobRegistry } from '../job.registry';
import type { JobHandler } from '../job.types';

const JOB_NAME = 'PurgeInactiveDeviceTokens';
const RETENTION_DAYS = 30;

// Hard-delete FCM tokens that have been inactive for at least 30 days
// (Part 2.5.3 Table 6 Business Rules). Keeps device_tokens small and
// stops the dispatcher from wasting requests on dead endpoints.
@Injectable()
export class PurgeInactiveDeviceTokensJob implements JobHandler, OnModuleInit {
  private readonly logger = new Logger(PurgeInactiveDeviceTokensJob.name);

  constructor(private readonly prisma: PrismaService, private readonly registry: JobRegistry) {}

  onModuleInit(): void {
    this.registry.register(JOB_NAME, this);
  }

  async run(): Promise<void> {
    const deleted = await this.prisma.$executeRaw(Prisma.sql`
      DELETE FROM device_tokens
       WHERE is_active = false
         AND updated_at < NOW() - INTERVAL '${Prisma.raw(String(RETENTION_DAYS))} days'
    `);
    this.logger.log(`[PurgeInactiveDeviceTokens] deleted=${Number(deleted)}`);
  }
}
