import { Inject, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { InMemoryIdempotencyStore, IdempotencyStore, StoredRecord } from './idempotency.store';

export const IDEMPOTENCY_STORE = Symbol('IDEMPOTENCY_STORE');

@Injectable()
export class IdempotencyService {
  constructor(@Inject(IDEMPOTENCY_STORE) private readonly store: IdempotencyStore) {}

  hashRequest(method: string, path: string, body: unknown): string {
    const canonical = `${method}\n${path}\n${JSON.stringify(body ?? null)}`;
    return createHash('sha256').update(canonical).digest('hex');
  }

  begin(key: string): Promise<boolean> {
    return this.store.begin(key);
  }
  complete(key: string, record: StoredRecord): Promise<void> {
    return this.store.complete(key, record);
  }
  get(key: string): Promise<StoredRecord | null> {
    return this.store.get(key);
  }
  isInFlight(key: string): Promise<boolean> {
    return this.store.isInFlight(key);
  }
  release(key: string): Promise<void> {
    return this.store.release(key);
  }
}

export const idempotencyStoreProvider = {
  provide: IDEMPOTENCY_STORE,
  useFactory: (): IdempotencyStore => new InMemoryIdempotencyStore(),
};
