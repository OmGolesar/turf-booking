// Shape of an outbox row as handed to subscribers. Kept plain so subscribers
// don't need a Prisma dependency in their tests.
export interface OutboxEventRecord {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  sequenceNo: bigint;
  payload: Record<string, unknown>;
  correlationId: string | null;
  attempts: number;
  createdAt: Date;
}

export interface OutboxSubscriber {
  readonly name: string;
  matches(event: OutboxEventRecord): boolean;
  handle(event: OutboxEventRecord): Promise<void>;
}
