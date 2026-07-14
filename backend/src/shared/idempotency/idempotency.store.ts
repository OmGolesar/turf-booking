// In-memory idempotency store. Interface stays Redis-shaped so swapping
// implementations is a one-line DI change.

export interface StoredRecord {
  bodyHash: string;
  status: number;
  response: unknown;
  createdAt: number;
}

export interface IdempotencyStore {
  begin(key: string): Promise<boolean>; // true if a fresh lock was taken
  complete(key: string, record: StoredRecord): Promise<void>;
  get(key: string): Promise<StoredRecord | null>;
  isInFlight(key: string): Promise<boolean>;
  release(key: string): Promise<void>;
}

interface Entry {
  status: 'IN_FLIGHT' | 'COMPLETE';
  record?: StoredRecord;
  createdAt: number;
}

const TTL_MS = 24 * 60 * 60 * 1000;

export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly map = new Map<string, Entry>();

  async begin(key: string): Promise<boolean> {
    this.evict(key);
    if (this.map.has(key)) return false;
    this.map.set(key, { status: 'IN_FLIGHT', createdAt: Date.now() });
    return true;
  }

  async complete(key: string, record: StoredRecord): Promise<void> {
    this.map.set(key, { status: 'COMPLETE', record, createdAt: Date.now() });
  }

  async get(key: string): Promise<StoredRecord | null> {
    this.evict(key);
    const entry = this.map.get(key);
    return entry?.status === 'COMPLETE' ? (entry.record ?? null) : null;
  }

  async isInFlight(key: string): Promise<boolean> {
    this.evict(key);
    return this.map.get(key)?.status === 'IN_FLIGHT';
  }

  async release(key: string): Promise<void> {
    const entry = this.map.get(key);
    if (entry?.status === 'IN_FLIGHT') this.map.delete(key);
  }

  private evict(key: string): void {
    const entry = this.map.get(key);
    if (entry && Date.now() - entry.createdAt > TTL_MS) this.map.delete(key);
  }
}
