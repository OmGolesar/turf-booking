import { Injectable, Logger } from '@nestjs/common';
import { Role, Prisma } from '@prisma/client';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { FirebaseService } from '../../shared/auth/firebase.service';
import { OutboxService } from '../../shared/outbox/outbox.service';
import { AuditService } from '../../shared/audit/audit.service';
import { DomainException } from '../../shared/errors/domain.exception';
import {
  SessionResource,
  toIdentityResource,
  toProfileResource,
  toPartnerResource,
} from './dtos/identity-response';
import type { AuthContext } from '../../shared/auth/auth-context';

export interface SessionInput {
  bearerToken: string;
  intendedRole?: Role;
  appVariant?: string;
  requestId?: string;
  route?: string;
  sourceIp?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly firebase: FirebaseService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
  ) {}

  /**
   * POST /auth/session. Verifies the Firebase ID token, provisions the
   * platform Identity + Profile on first hit, updates last_login_at.
   * Transaction boundary: single $transaction that (a) creates or updates
   * the identity, (b) writes the audit + outbox rows on first session.
   */
  async session(input: SessionInput): Promise<SessionResource> {
    const decoded = await this.verifyBearer(input.bearerToken);
    const intendedRole = this.resolveIntendedRole(input.intendedRole, input.appVariant, decoded);

    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await this.loadFullIdentity(tx, decoded.uid);

      if (existing) {
        if (existing.status !== 'ACTIVE') throw new DomainException('AUTH_ACCOUNT_SUSPENDED');
        const updated = await this.syncOnLogin(tx, existing.id, decoded);
        return { identity: updated.identity, profile: updated.profile, partner: existing.partner, firstSession: false as const };
      }

      // First-ever session — provision.
      await this.assertPhoneNotTaken(tx, decoded.phone_number);
      const identity = await tx.identity.create({
        data: {
          firebaseUid: decoded.uid,
          email: decoded.email ?? null,
          phone: decoded.phone_number ?? null,
          role: intendedRole,
          lastLoginAt: new Date(),
          phoneVerifiedAt: decoded.phone_number ? new Date() : null,
          emailVerifiedAt: decoded.email_verified ? new Date() : null,
        },
      });
      const profile = await tx.identityProfile.create({
        data: {
          identityId: identity.id,
          firstName: this.firstNameFromClaim(decoded),
          lastName: this.lastNameFromClaim(decoded),
          avatarUrl: (decoded.picture as string | undefined) ?? null,
          city: 'Nashik',
          language: 'en',
          createdBy: identity.id,
        },
      });

      await this.audit.record(tx, {
        actorIdentityId: identity.id,
        actorRole: identity.role,
        action: 'IdentityRegistered',
        resourceType: 'Identity',
        resourceId: identity.id,
        resourceReferenceCode: identity.referenceCode ?? undefined,
        context: {
          requestId: input.requestId,
          route: input.route,
          sourceIp: input.sourceIp,
          userAgent: input.userAgent,
        },
      });
      await this.outbox.emit(tx, {
        aggregateType: 'Identity',
        aggregateId: identity.id,
        eventType: 'IdentityRegistered',
        payload: {
          identity_id: identity.id,
          reference_code: identity.referenceCode,
          role: identity.role,
          firebase_uid: identity.firebaseUid,
        },
        correlationId: input.requestId,
      });

      return { identity, profile, partner: null, firstSession: true as const };
    });

    return {
      identity: toIdentityResource(result.identity),
      profile: toProfileResource(result.profile),
      partner: toPartnerResource(result.partner),
      is_first_session: result.firstSession,
    };
  }

  /** GET /auth/me — same shape as session() but never provisions. */
  async me(ctx: AuthContext): Promise<SessionResource> {
    const identity = await this.prisma.identity.findUnique({
      where: { id: ctx.identityId },
      include: { profile: true, partner: true },
    });
    if (!identity) throw new DomainException('IDENTITY_NOT_FOUND');
    return {
      identity: toIdentityResource(identity),
      profile: toProfileResource(identity.profile),
      partner: toPartnerResource(identity.partner),
    };
  }

  private async verifyBearer(bearer: string): Promise<DecodedIdToken> {
    const token = extractBearer(bearer);
    if (!token) throw new DomainException('AUTH_TOKEN_MISSING');
    try {
      return await this.firebase.verifyIdToken(token);
    } catch (err) {
      const code =
        err instanceof Error && /expired/i.test(err.message) ? 'AUTH_TOKEN_EXPIRED' : 'AUTH_TOKEN_INVALID';
      throw new DomainException(code);
    }
  }

  private resolveIntendedRole(intended: Role | undefined, appVariant: string | undefined, decoded: DecodedIdToken): Role {
    if (intended === Role.PARTNER) {
      if (appVariant !== 'PARTNER') return Role.CUSTOMER; // silently clamp — partners must onboard through the partner app
      if (!decoded.email_verified || !decoded.phone_number) return Role.CUSTOMER;
      return Role.PARTNER;
    }
    return Role.CUSTOMER;
  }

  private async loadFullIdentity(tx: Prisma.TransactionClient, firebaseUid: string) {
    return tx.identity.findUnique({
      where: { firebaseUid },
      include: { profile: true, partner: true },
    });
  }

  private async syncOnLogin(tx: Prisma.TransactionClient, identityId: string, decoded: DecodedIdToken) {
    // Refresh verification timestamps + last_login. Never downgrade a previously-
    // verified column back to null.
    const identity = await tx.identity.update({
      where: { id: identityId },
      data: {
        lastLoginAt: new Date(),
        ...(decoded.email_verified ? { emailVerifiedAt: new Date() } : {}),
        ...(decoded.phone_number ? { phoneVerifiedAt: new Date(), phone: decoded.phone_number } : {}),
      },
    });
    const profile = await tx.identityProfile.findUnique({ where: { identityId } });
    return { identity, profile };
  }

  private async assertPhoneNotTaken(tx: Prisma.TransactionClient, phone: string | undefined): Promise<void> {
    if (!phone) return;
    const other = await tx.identity.findUnique({ where: { phone } });
    if (other) throw new DomainException('IDENTITY_PHONE_TAKEN');
  }

  private firstNameFromClaim(decoded: DecodedIdToken): string {
    const name = (decoded.name as string | undefined)?.trim();
    if (name && name.length > 0) return name.split(/\s+/)[0];
    if (decoded.email) return decoded.email.split('@')[0];
    return 'TurfX';
  }

  private lastNameFromClaim(decoded: DecodedIdToken): string | null {
    const name = (decoded.name as string | undefined)?.trim();
    if (!name) return null;
    const parts = name.split(/\s+/);
    return parts.length > 1 ? parts.slice(1).join(' ') : null;
  }
}

function extractBearer(header: string | undefined): string | null {
  if (!header) return null;
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token || null;
}
