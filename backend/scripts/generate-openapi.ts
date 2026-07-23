// Task 5.7 — OpenAPI spec generator.
//
// Boots AppModule (no listener), runs SwaggerModule.createDocument against it,
// and writes backend/openapi.json. Two entry points:
//
//   npm run openapi:generate  — regenerate and overwrite openapi.json
//   npm run openapi:check     — regenerate to a temp file and diff against
//                                the committed spec; CI drift guard.
//
// The @nestjs/swagger CLI plugin runs at TypeScript compile time and augments
// every DTO with @ApiProperty() reflecting its class-validator decorators. So
// we run this against the compiled dist/, not against ts-node — otherwise the
// plugin never fires and DTO schemas come out empty.
//
// External services (Firebase, Razorpay, Supabase, MSG91, SendGrid, FCM) are
// never called during document introspection, but ConfigModule still validates
// env at boot. Fill in placeholders so the script runs anywhere (dev laptop,
// CI, fresh clone) without a .env.

import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { OpenAPIObject } from '@nestjs/swagger';

// npm run always cd's to the package.json dir, so cwd is backend/.
const OUT_PATH = resolve(process.cwd(), 'openapi.json');

function fillPlaceholderEnv(): void {
  const defaults: Record<string, string> = {
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://openapi:openapi@localhost:5432/openapi_placeholder',
    REDIS_URL: 'redis://localhost:6379',
    FIREBASE_PROJECT_ID: 'openapi-placeholder',
    FIREBASE_CLIENT_EMAIL: 'openapi@placeholder.invalid',
    FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nplaceholder\\n-----END PRIVATE KEY-----\\n',
    RAZORPAY_KEY_ID: 'rzp_test_placeholder',
    RAZORPAY_KEY_SECRET: 'placeholder',
    RAZORPAY_WEBHOOK_SECRET: 'placeholder',
    SUPABASE_URL: 'https://placeholder.supabase.invalid',
    SUPABASE_SERVICE_ROLE_KEY: 'placeholder',
    SUPABASE_STORAGE_BUCKET: 'placeholder',
    MSG91_AUTH_KEY: 'placeholder',
    MSG91_SENDER_ID: 'PLCHDR',
    FCM_SERVICE_ACCOUNT: '{}',
    SENDGRID_API_KEY: 'placeholder',
  };
  for (const [k, v] of Object.entries(defaults)) {
    if (!process.env[k]) process.env[k] = v;
  }
}

async function buildDocument(): Promise<OpenAPIObject> {
  // Late import — placeholders must be set before ConfigModule loads.
  // Load the compiled JS from dist/ so the @nestjs/swagger CLI plugin (which
  // only runs during `nest build`) has already annotated every DTO. Running
  // this against ts-node would produce empty schemas.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { AppModule } = require(resolve(process.cwd(), 'dist/app.module')) as {
    AppModule: unknown;
  };

  const app = await NestFactory.create(AppModule as never, { logger: false });
  app.setGlobalPrefix('v1', { exclude: ['health'] });

  const config = new DocumentBuilder()
    .setTitle('TurfX API')
    .setDescription(
      'TurfX Nashik MVP — booking, discovery, partner catalog, payments, notifications.\n\n' +
        'All authenticated endpoints require a Firebase ID token via `Authorization: Bearer <token>`. ' +
        'See Part 3.0 §4 for the response envelope and Part 3.0 §5 for the error taxonomy.',
    )
    .setVersion('1.0.0')
    .addServer('/', 'Same origin')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'Firebase ID token' },
      'firebase',
    )
    .addApiKey(
      { type: 'apiKey', in: 'header', name: 'Idempotency-Key' },
      'idempotency-key',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    // Deep introspection so every controller decorator + DTO field is walked.
    deepScanRoutes: true,
    ignoreGlobalPrefix: false,
  });

  await app.close();
  return document;
}

// Deterministic output: sort keys so unrelated commits don't churn the spec.
function stableStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  const sortKeys = (v: unknown): unknown => {
    if (v === null || typeof v !== 'object') return v;
    if (seen.has(v as object)) return v;
    seen.add(v as object);
    if (Array.isArray(v)) return v.map(sortKeys);
    const entries = Object.entries(v as Record<string, unknown>)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, val]) => [k, sortKeys(val)] as const);
    return Object.fromEntries(entries);
  };
  return JSON.stringify(sortKeys(value), null, 2) + '\n';
}

async function main() {
  fillPlaceholderEnv();
  const mode = process.argv[2] ?? 'generate';

  const doc = await buildDocument();
  const serialised = stableStringify(doc);

  if (mode === 'check') {
    if (!existsSync(OUT_PATH)) {
      console.error(
        `openapi.json missing at ${OUT_PATH}. Run \`npm run openapi:generate\` and commit the result.`,
      );
      process.exit(2);
    }
    const committed = readFileSync(OUT_PATH, 'utf8');
    if (committed !== serialised) {
      const tmp = join(mkdtempSync(join(tmpdir(), 'openapi-')), 'openapi.json');
      writeFileSync(tmp, serialised);
      console.error(
        'openapi.json is out of date. Diff:\n' +
          `  committed: ${OUT_PATH}\n` +
          `  generated: ${tmp}\n` +
          'Run `npm run openapi:generate` and commit the change.',
      );
      process.exit(1);
    }
    console.log('openapi.json is up to date.');
    return;
  }

  writeFileSync(OUT_PATH, serialised);
  console.log(`Wrote ${OUT_PATH} (${Object.keys(doc.paths).length} paths).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
