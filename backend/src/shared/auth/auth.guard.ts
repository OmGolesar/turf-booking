import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DomainException } from '../errors/domain.exception';
import { FirebaseService } from './firebase.service';
import { OPTIONAL_AUTH_KEY } from './optional-auth.decorator';
import { ROLES_KEY } from './roles.decorator';
import type { AuthContext } from './auth-context';

function extractBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token || null;
}

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private readonly firebase: FirebaseService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request & { auth?: AuthContext | null }>();
    const optional = this.reflector.getAllAndOverride<boolean>(OPTIONAL_AUTH_KEY, [ctx.getHandler(), ctx.getClass()]) ?? false;
    const requiredRoles =
      this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]) ?? [];

    const token = extractBearer(req);
    if (!token) {
      if (optional) {
        req.auth = null;
        return true;
      }
      throw new DomainException('AUTH_TOKEN_MISSING');
    }

    let decoded;
    try {
      decoded = await this.firebase.verifyIdToken(token);
    } catch (err) {
      const code =
        err instanceof Error && /expired/i.test(err.message) ? 'AUTH_TOKEN_EXPIRED' : 'AUTH_TOKEN_INVALID';
      throw new DomainException(code);
    }

    const identity = await this.prisma.identity.findUnique({
      where: { firebaseUid: decoded.uid },
      include: { partner: true },
    });

    if (!identity) throw new DomainException('AUTH_IDENTITY_NOT_PROVISIONED');
    if (identity.status !== 'ACTIVE') throw new DomainException('AUTH_ACCOUNT_SUSPENDED');

    if (requiredRoles.length && !requiredRoles.includes(identity.role)) {
      throw new DomainException('AUTH_INSUFFICIENT_PERMISSIONS');
    }

    const context: AuthContext = {
      identityId: identity.id,
      firebaseUid: identity.firebaseUid,
      role: identity.role,
      status: identity.status,
      partnerId: identity.partner?.id,
      isVerified: identity.partner?.isVerified ?? Boolean(identity.phone),
    };
    req.auth = context;
    return true;
  }
}
