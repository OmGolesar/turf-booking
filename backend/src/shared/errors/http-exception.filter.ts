import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { DomainException } from './domain.exception';
import { ErrorCode, ERROR_MESSAGE } from './error-codes';
import { makeMeta, ErrorEnvelope } from '../response/envelope';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request & { id?: string }>();
    const res = ctx.getResponse<Response>();

    const { status, body } = this.toEnvelope(exception, req.id ?? '');

    if (status >= 500) {
      this.logger.error({ err: exception, request_id: req.id, path: req.url }, 'unhandled server error');
    }

    res.status(status).json(body);
  }

  private toEnvelope(exception: unknown, requestId: string): { status: number; body: ErrorEnvelope } {
    if (exception instanceof DomainException) {
      return {
        status: exception.statusCode,
        body: {
          success: false,
          error: {
            code: exception.code,
            message: exception.message,
            details: exception.details,
            field_errors: exception.fieldErrors ?? null,
          },
          meta: makeMeta(requestId),
        },
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      const message =
        typeof raw === 'string'
          ? raw
          : ((raw as { message?: string | string[] }).message
              ? Array.isArray((raw as { message: string[] }).message)
                ? (raw as { message: string[] }).message.join('; ')
                : (raw as { message: string }).message
              : exception.message);
      const code = status === HttpStatus.NOT_FOUND ? ErrorCode.RESOURCE_NOT_FOUND : ErrorCode.SYSTEM_INTERNAL_ERROR;
      return {
        status,
        body: {
          success: false,
          error: { code, message, field_errors: null },
          meta: makeMeta(requestId),
        },
      };
    }

    // Unknown / non-HTTP error → 500 without leaking stack in prod.
    const isDev = process.env.NODE_ENV === 'development';
    return {
      status: 500,
      body: {
        success: false,
        error: {
          code: ErrorCode.SYSTEM_INTERNAL_ERROR,
          message: ERROR_MESSAGE.SYSTEM_INTERNAL_ERROR,
          details: isDev && exception instanceof Error ? { stack: exception.stack } : undefined,
          field_errors: null,
        },
        meta: makeMeta(requestId),
      },
    };
  }
}
