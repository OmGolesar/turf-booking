-- The uniqueness rule is "one ACTIVE token per (identity, device, app_variant)".
-- The original partial index in migration 0008 lacked is_active=true, which
-- prevented re-registration after a soft delete. Rebuild it correctly.

DROP INDEX IF EXISTS "uq_device_tokens_identity_dev";

CREATE UNIQUE INDEX "uq_device_tokens_identity_dev"
  ON "device_tokens" ("identity_id", "device_id", "app_variant")
  WHERE "device_id" IS NOT NULL AND "is_active" = TRUE;
