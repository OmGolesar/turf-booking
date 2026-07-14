import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Role } from '@prisma/client';

function assertTx(tx: Prisma.TransactionClient): void {
  if (typeof (tx as unknown as { $transaction?: unknown }).$transaction === 'function') {
    throw new Error('AuditService.record must be called inside prisma.$transaction');
  }
}

export interface AuditContext {
  requestId?: string;
  route?: string;
  sourceIp?: string;
  userAgent?: string;
}

export interface RecordArgs {
  actorIdentityId: string | null;
  actorRole: Role | 'SYSTEM';
  action: string;
  resourceType: string;
  resourceId: string;
  resourceReferenceCode?: string;
  changes?: Record<string, { before: unknown; after: unknown }>;
  context?: AuditContext;
  occurredAt?: Date;
}

@Injectable()
export class AuditService {
  async record(tx: Prisma.TransactionClient, args: RecordArgs): Promise<void> {
    assertTx(tx);
    await tx.auditLog.create({
      data: {
        actorIdentityId: args.actorIdentityId,
        actorRole: args.actorRole,
        action: args.action,
        resourceType: args.resourceType,
        resourceId: args.resourceId,
        resourceReferenceCode: args.resourceReferenceCode,
        changes: args.changes as Prisma.InputJsonValue | undefined,
        context: args.context as Prisma.InputJsonValue | undefined,
        occurredAt: args.occurredAt ?? new Date(),
      },
    });
  }
}
