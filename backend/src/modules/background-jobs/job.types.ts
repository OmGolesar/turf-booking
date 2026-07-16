// Contract a job implementation exposes to the scheduler. The runner passes
// through the row's `payload` verbatim; whatever the handler needs beyond that
// (Prisma, Outbox, etc.) is wired via constructor DI on the handler class.
export interface JobHandler {
  run(payload: unknown | null): Promise<void>;
}

export interface JobContext {
  workerId: string;
  jobName: string;
  attempt: number;
}
