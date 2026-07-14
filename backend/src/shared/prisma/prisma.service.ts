import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super();
    this.logger.log('Prisma initialised (lazy connect on first query)');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
