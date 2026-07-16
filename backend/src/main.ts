import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { ValidationPipe } from './shared/validation/validation.pipe';
import type { AppConfig } from './config/configuration';

async function bootstrap() {
  // rawBody: true — needed for Razorpay webhook signature verification against
  // the un-parsed request body. Everything else still uses the JSON parser.
  const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true });
  app.useLogger(app.get(PinoLogger));

  app.setGlobalPrefix('v1', { exclude: ['health'] });
  app.useGlobalPipes(new ValidationPipe());
  app.enableShutdownHooks();

  const config = app.get(ConfigService<AppConfig, true>);
  const corsOrigins = config.get('CORS_ORIGINS', { infer: true });
  app.enableCors({
    origin: corsOrigins ? corsOrigins.split(',').map((s) => s.trim()).filter(Boolean) : true,
    credentials: true,
  });

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
}

bootstrap();
