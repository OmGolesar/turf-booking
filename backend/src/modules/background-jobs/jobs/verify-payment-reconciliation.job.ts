import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PaymentProvider, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { RazorpayService } from '../../../shared/razorpay/razorpay.service';
import { JobRegistry } from '../job.registry';
import type { JobHandler } from '../job.types';

const JOB_NAME = 'VerifyPaymentReconciliation';

// Cross-references yesterday's Razorpay SUCCESS payments with the provider
// (`payments.fetch` per transaction_reference). Any mismatch — amount off,
// status not 'captured', or fetch failure — is logged. MVP surfaces
// discrepancies via logs + failure_count on the job row; a proper admin
// alert is post-MVP.
@Injectable()
export class VerifyPaymentReconciliationJob implements JobHandler, OnModuleInit {
  private readonly logger = new Logger(VerifyPaymentReconciliationJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpay: RazorpayService,
    private readonly registry: JobRegistry,
  ) {}

  onModuleInit(): void {
    this.registry.register(JOB_NAME, this);
  }

  async run(): Promise<void> {
    // Yesterday in UTC. We reconcile a rolling day; running past 02:00 IST
    // (spec cadence) catches Razorpay settlement windows.
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60_000);

    const payments = await this.prisma.payment.findMany({
      where: {
        paymentProvider: PaymentProvider.RAZORPAY,
        paymentStatus: PaymentStatus.SUCCESS,
        paidAt: { gte: dayAgo, lte: now },
      },
      select: { id: true, referenceCode: true, transactionReference: true, amount: true },
      take: 500,
    });
    if (payments.length === 0) {
      this.logger.debug('[VerifyPaymentReconciliation] no successful Razorpay payments in the last 24h');
      return;
    }

    let checked = 0;
    let mismatched = 0;
    let fetchErrors = 0;

    for (const p of payments) {
      try {
        const fetched = await this.razorpay.fetchPayment(p.transactionReference);
        checked++;
        const expectedPaise = Math.round(Number(p.amount) * 100);
        const providerCaptured = fetched.status === 'captured';
        const amountMatches = fetched.amount === expectedPaise;
        if (!providerCaptured || !amountMatches) {
          mismatched++;
          this.logger.warn(
            `[VerifyPaymentReconciliation] MISMATCH payment=${p.referenceCode} ` +
              `expected_paise=${expectedPaise} razorpay_amount=${fetched.amount} razorpay_status=${fetched.status}`,
          );
        }
      } catch (err) {
        fetchErrors++;
        this.logger.error(
          `[VerifyPaymentReconciliation] fetch failed payment=${p.referenceCode} ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // Fail loudly (throw) if any mismatch was seen — the runner will bump
    // failure_count + last_error so operators notice via the jobs dashboard.
    // Fetch errors alone (transient provider blips) don't fail the run.
    this.logger.log(
      `[VerifyPaymentReconciliation] checked=${checked} mismatched=${mismatched} fetch_errors=${fetchErrors}`,
    );
    if (mismatched > 0) {
      throw new Error(`${mismatched} payment(s) mismatched against Razorpay`);
    }
  }
}
