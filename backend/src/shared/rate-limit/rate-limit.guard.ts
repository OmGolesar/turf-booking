import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import type { Request } from 'express';
import type { AuthContext } from '../auth/auth-context';
import { DomainException } from '../errors/domain.exception';

@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  // Key by identity (authenticated) or IP (anonymous). Per Part 3.0 §12.
  protected override async getTracker(req: Request & { auth?: AuthContext | null }): Promise<string> {
    if (req.auth?.identityId) return `identity:${req.auth.identityId}`;
    return `ip:${req.ip ?? 'unknown'}`;
  }

  protected override async throwThrottlingException(_ctx: ExecutionContext): Promise<void> {
    throw new DomainException('RATE_LIMIT_EXCEEDED');
  }
}

// The default global rate cap matches "authenticated per identity" (Part 3.0 §12).
// Stricter caps (payment, discovery) are applied per-controller via @Throttle().
export const DEFAULT_RATE_LIMITS = [{ name: 'default', ttl: 60_000, limit: 300 }];

// Sanity check so unused imports don't cause errors — ThrottlerException lives here
// only for reference by controllers that want to inspect it.
export { ThrottlerException };
