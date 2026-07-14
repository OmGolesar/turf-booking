import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envSchema } from './env.schema';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: (raw: Record<string, unknown>) => {
        const parsed = envSchema.safeParse(raw);
        if (!parsed.success) {
          const issues = parsed.error.issues
            .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
            .join('\n');
          throw new Error(`Invalid environment configuration:\n${issues}`);
        }
        return parsed.data;
      },
    }),
  ],
  exports: [ConfigModule],
})
export class AppConfigModule {}
