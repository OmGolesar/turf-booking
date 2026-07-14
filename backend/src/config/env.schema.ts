import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  CORS_ORIGINS: z.string().default(''),

  DATABASE_URL: z.string().url(),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),

  REDIS_URL: z.string().url(),

  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_CLIENT_EMAIL: z.string().min(1),
  FIREBASE_PRIVATE_KEY: z.string().min(1),

  RAZORPAY_KEY_ID: z.string().min(1),
  RAZORPAY_KEY_SECRET: z.string().min(1),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1),

  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_STORAGE_BUCKET: z.string().min(1),

  MSG91_AUTH_KEY: z.string().min(1),
  MSG91_SENDER_ID: z.string().min(1),
  FCM_SERVICE_ACCOUNT: z.string().min(1),
  SENDGRID_API_KEY: z.string().min(1),

  PLATFORM_CITY: z.string().default('Nashik'),
  PLATFORM_TIMEZONE: z.literal('Asia/Kolkata').default('Asia/Kolkata'),
  PLATFORM_CURRENCY: z.literal('INR').default('INR'),
});

export type Env = z.infer<typeof envSchema>;
