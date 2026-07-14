import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, from, tap, catchError, throwError, switchMap, of } from 'rxjs';
import type { Request, Response } from 'express';
import { DomainException } from '../errors/domain.exception';
import { IdempotencyService } from './idempotency.service';
import { IDEMPOTENT_KEY } from './idempotency.decorator';

interface IdempotentOpts {
  required: boolean;
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly svc: IdempotencyService,
    private readonly reflector: Reflector,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.getAllAndOverride<IdempotentOpts>(IDEMPOTENT_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!meta) return next.handle();

    const req = ctx.switchToHttp().getRequest<Request>();
    const res = ctx.switchToHttp().getResponse<Response>();
    const rawKey = req.header('Idempotency-Key');

    if (!rawKey) {
      if (meta.required) {
        return throwError(
          () =>
            new DomainException('VALIDATION_FAILED', {
              fieldErrors: [
                {
                  field: 'Idempotency-Key',
                  code: 'HEADER_REQUIRED',
                  message: 'Idempotency-Key header is required for this endpoint.',
                },
              ],
            }),
        );
      }
      return next.handle();
    }

    const key = rawKey.trim();
    const bodyHash = this.svc.hashRequest(req.method, req.originalUrl ?? req.url, req.body);

    return from(this.svc.get(key)).pipe(
      switchMap(async (existing) => {
        if (existing) {
          if (existing.bodyHash !== bodyHash) throw new DomainException('IDEMPOTENCY_KEY_CONFLICT');
          res.status(existing.status);
          return { replay: true as const, response: existing.response };
        }
        if (await this.svc.isInFlight(key)) throw new DomainException('IDEMPOTENCY_KEY_IN_FLIGHT');
        const started = await this.svc.begin(key);
        if (!started) throw new DomainException('IDEMPOTENCY_KEY_IN_FLIGHT');
        return { replay: false as const };
      }),
      switchMap((state) => {
        if (state.replay) return of(state.response);
        return next.handle().pipe(
          tap((payload) => {
            void this.svc.complete(key, {
              bodyHash,
              status: res.statusCode,
              response: payload,
              createdAt: Date.now(),
            });
          }),
          catchError((err) => {
            void this.svc.release(key);
            return throwError(() => err);
          }),
        );
      }),
    );
  }
}
