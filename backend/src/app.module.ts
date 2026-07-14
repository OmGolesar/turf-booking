import { Module, Controller, Get } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { PrismaModule } from './shared/prisma/prisma.module';

@Controller('health')
class HealthController {
  @Get()
  health() {
    return { status: 'ok' };
  }
}

@Module({
  imports: [AppConfigModule, PrismaModule],
  controllers: [HealthController],
})
export class AppModule {}
