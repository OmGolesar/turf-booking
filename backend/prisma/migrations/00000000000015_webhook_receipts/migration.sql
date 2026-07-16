-- webhook_receipts — forensic record of every inbound webhook.
-- Idempotency defence is the `event_id UNIQUE` index; retries collide here first.
CREATE TABLE "webhook_receipts" (
  "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "provider"     VARCHAR(32) NOT NULL,
  "event_id"     VARCHAR(128) NOT NULL,
  "event_type"   VARCHAR(64)  NOT NULL,
  "raw_body"     JSONB        NOT NULL,
  "signature"    VARCHAR(255),
  "status"       VARCHAR(32)  NOT NULL DEFAULT 'RECEIVED',
  "error"        TEXT,
  "processed_at" TIMESTAMPTZ(6),
  "created_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX "uq_webhook_event_id" ON "webhook_receipts" ("provider", "event_id");
CREATE INDEX "idx_webhook_receipts_status" ON "webhook_receipts" ("status", "created_at");
