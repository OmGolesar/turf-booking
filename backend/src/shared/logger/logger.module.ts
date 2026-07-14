import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { ulid } from 'ulid';
import type { IncomingMessage, ServerResponse } from 'http';

const REQUEST_ID_HEADER = 'x-request-id';

@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        genReqId: (req: IncomingMessage, res: ServerResponse) => {
          const existing = req.headers[REQUEST_ID_HEADER];
          const id = (Array.isArray(existing) ? existing[0] : existing) ?? `req_${ulid()}`;
          res.setHeader('X-Request-Id', id);
          return id;
        },
        customProps: (req) => ({ request_id: (req as { id?: string }).id }),
        redact: {
          paths: ['req.headers.authorization', 'req.headers.cookie', 'req.body.password'],
          censor: '[REDACTED]',
        },
        transport:
          process.env.NODE_ENV === 'development'
            ? { target: 'pino-pretty', options: { singleLine: true, translateTime: 'SYS:HH:MM:ss' } }
            : undefined,
      },
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
