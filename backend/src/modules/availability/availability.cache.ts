// 30-second in-memory cache for availability responses.
// Ponytail: plain Map with TTL + size cap. Swap for Redis when the
// stateless-multi-node story arrives.

import { Injectable } from '@nestjs/common';

const TTL_MS = 30_000;
const MAX_ENTRIES = 500;

interface Entry<T> {
  value: T;
  expiresAt: number;
}

@Injectable()
export class AvailabilityCache {
  private readonly store = new Map<string, Entry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T): void {
    if (this.store.size >= MAX_ENTRIES) this.evictOldest();
    this.store.set(key, { value, expiresAt: Date.now() + TTL_MS });
  }

  invalidate(groundId: string, date?: string): void {
    const prefix = date ? key(groundId, date, null) : `${groundId}:`;
    for (const k of this.store.keys()) if (k.startsWith(prefix)) this.store.delete(k);
  }

  clear(): void {
    this.store.clear();
  }

  private evictOldest(): void {
    // Insertion order is preserved; first key is oldest.
    const first = this.store.keys().next().value;
    if (first) this.store.delete(first);
  }
}

export function key(groundId: string, date: string, duration: number | null): string {
  return `${groundId}:${date}:${duration ?? 'default'}`;
}
