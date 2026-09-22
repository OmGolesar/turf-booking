-- refund_requests — admin-approval queue for refunds.
-- Sourced from: (a) paid-but-no-booking orphans (webhook or client confirm),
-- (b) customer requests outside the auto-refund window, (c) admin manual entry.
-- The partial UNIQUE prevents duplicate open requests for the same payment.

CREATE TYPE "refund_request_source" AS ENUM (
  'ORPHANED_PAYMENT',
  'CUSTOMER_REQUEST',
  'ADMIN_MANUAL'
);

CREATE TYPE "refund_request_status" AS ENUM (
  'PENDING_ADMIN',
  'APPROVED',
  'REJECTED',
  'EXECUTED',
  'FAILED'
);

CREATE TABLE "refund_requests" (
  "id"                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "razorpay_payment_id"   VARCHAR(64) NOT NULL,
  "payment_id"            UUID REFERENCES "payments"("id"),
  "booking_id"            UUID REFERENCES "bookings"("id"),
  "booking_session_id"    UUID REFERENCES "booking_sessions"("id"),
  "amount_paise"          INTEGER NOT NULL,
  "currency"              VARCHAR(3) NOT NULL DEFAULT 'INR',
  "source"                "refund_request_source" NOT NULL,
  "status"                "refund_request_status" NOT NULL DEFAULT 'PENDING_ADMIN',
  "reason"                TEXT,
  "admin_notes"           TEXT,
  "decided_by"            UUID REFERENCES "identities"("id"),
  "decided_at"            TIMESTAMPTZ(6),
  "executed_at"           TIMESTAMPTZ(6),
  "razorpay_refund_id"    VARCHAR(64),
  "attempts"              INTEGER NOT NULL DEFAULT 0,
  "last_error"            TEXT,
  "created_at"            TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at"            TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "refund_requests_amount_positive" CHECK ("amount_paise" > 0)
);

-- One open (PENDING_ADMIN or APPROVED) request per payment. After a request
-- reaches EXECUTED/REJECTED/FAILED a new one can be filed (partial refunds,
-- retries after failure) without contention.
CREATE UNIQUE INDEX "uq_refund_requests_open_per_payment"
  ON "refund_requests" ("razorpay_payment_id")
  WHERE "status" IN ('PENDING_ADMIN', 'APPROVED');

CREATE INDEX "idx_refund_requests_status_created"
  ON "refund_requests" ("status", "created_at");

CREATE INDEX "idx_refund_requests_booking"
  ON "refund_requests" ("booking_id")
  WHERE "booking_id" IS NOT NULL;

CREATE INDEX "idx_refund_requests_session"
  ON "refund_requests" ("booking_session_id")
  WHERE "booking_session_id" IS NOT NULL;

-- Store the Razorpay order id on the session so the (future) orphan-order
-- sweeper can cross-reference sessions to orders. Nullable because the value
-- is set inside the same tx as Razorpay's createOrder — a legacy row from
-- before this migration will simply be NULL and skipped by the sweeper.
ALTER TABLE "booking_sessions"
  ADD COLUMN "razorpay_order_id" VARCHAR(64);

CREATE INDEX "idx_booking_sessions_razorpay_order_id"
  ON "booking_sessions" ("razorpay_order_id")
  WHERE "razorpay_order_id" IS NOT NULL;
