import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import type { Request } from 'express';
import { makeMeta, SuccessEnvelope, PaginationMeta } from './envelope';

// Services may return either the raw payload, or { data, pagination } if they
// need to control the meta.pagination block explicitly (list endpoints).
export interface PaginatedPayload<T> {
  data: T;
  pagination: PaginationMeta;
}

function isPaginated<T>(x: unknown): x is PaginatedPayload<T> {
  return (
    typeof x === 'object' &&
    x !== null &&
    'data' in x &&
    'pagination' in x &&
    typeof (x as PaginatedPayload<T>).pagination?.has_more === 'boolean'
  );
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, SuccessEnvelope<unknown>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<SuccessEnvelope<unknown>> {
    const req = context.switchToHttp().getRequest<Request & { id?: string }>();
    return next.handle().pipe(
      map((payload) => {
        if (isPaginated<T>(payload)) {
          return { success: true, data: payload.data, meta: makeMeta(req.id ?? '', payload.pagination) };
        }
        return { success: true, data: payload ?? null, meta: makeMeta(req.id ?? '') };
      }),
    );
  }
}
