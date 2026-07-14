import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// Signals the caller invoked us with the base PrismaClient rather than a
// transaction client from prisma.$transaction(async (tx) => …). Prisma's
// TransactionClient omits $transaction; the base client has it. Ponytail:
// this is the smallest reliable in-band check — no ambient context needed.
function assertTx(tx: Prisma.TransactionClient): void {
  if (typeof (tx as unknown as { $transaction?: unknown }).$transaction === 'function') {
    throw new Error('OutboxService.emit must be called inside prisma.$transaction');
  }
}

export interface EmitArgs {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: unknown;
  correlationId?: string;
}

@Injectable()
export class OutboxService {
  async emit(tx: Prisma.TransactionClient, args: EmitArgs): Promise<void> {
    assertTx(tx);
    // Compute per-aggregate monotonic sequence_no inside the tx — the UNIQUE
    // (aggregate_type, aggregate_id, event_type, sequence_no) guarantees no
    // duplicate. Under concurrent inserts one txn will hit the unique and
    // must retry; the DB is the arbiter.
    const rows = await tx.$queryRaw<{ next: bigint }[]>(Prisma.sql`
      SELECT COALESCE(MAX(sequence_no), 0) + 1 AS next
        FROM outbox_events
       WHERE aggregate_type = ${args.aggregateType}
         AND aggregate_id   = ${args.aggregateId}::uuid
    `);
    const sequenceNo = rows[0]?.next ?? BigInt(1);

    await tx.outboxEvent.create({
      data: {
        aggregateType: args.aggregateType,
        aggregateId: args.aggregateId,
        eventType: args.eventType,
        sequenceNo,
        payload: args.payload as Prisma.InputJsonValue,
        correlationId: args.correlationId,
      },
    });
  }
}
