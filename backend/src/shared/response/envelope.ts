// Envelope shape per Part 3.0 §4.

export interface SuccessEnvelope<T> {
  success: true;
  data: T;
  meta: EnvelopeMeta;
}

export interface ErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    field_errors?: FieldError[] | null;
  };
  meta: EnvelopeMeta;
}

export interface EnvelopeMeta {
  request_id: string;
  timestamp: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  cursor: string | null;
  next_cursor: string | null;
  has_more: boolean;
  total: number | null;
}

export interface FieldError {
  field: string;
  code: string;
  message: string;
}

export function makeMeta(requestId: string, pagination?: PaginationMeta): EnvelopeMeta {
  return {
    request_id: requestId,
    timestamp: new Date().toISOString(),
    ...(pagination ? { pagination } : {}),
  };
}
