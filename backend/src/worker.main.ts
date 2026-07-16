import { NestFactory } from '@nestjs/core';
import { Logger as PinoLogger } from 'nestjs-pino';
import { WorkerModule } from './worker.module';
import { JobSchedulerService } from './modules/background-jobs/job-scheduler.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLogger));
  app.enableShutdownHooks();

  const scheduler = app.get(JobSchedulerService);
  scheduler.start();

  const shutdown = async (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`Worker received ${signal}, shutting down`);
    await app.close();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Worker failed to boot', err);
  process.exit(1);
});
