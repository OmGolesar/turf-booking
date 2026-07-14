import { ErrorCode, ErrorCodeKey, ERROR_MESSAGE, ERROR_STATUS } from './error-codes';
import type { FieldError } from '../response/envelope';

export class DomainException extends Error {
  readonly code: ErrorCodeKey;
  readonly statusCode: number;
  readonly details?: unknown;
  readonly fieldErrors?: FieldError[];

  constructor(
    code: ErrorCodeKey,
    opts: { message?: string; details?: unknown; fieldErrors?: FieldError[] } = {},
  ) {
    super(opts.message ?? ERROR_MESSAGE[code]);
    this.name = 'DomainException';
    this.code = code;
    this.statusCode = ERROR_STATUS[code];
    this.details = opts.details;
    this.fieldErrors = opts.fieldErrors;
  }
}

export { ErrorCode };
