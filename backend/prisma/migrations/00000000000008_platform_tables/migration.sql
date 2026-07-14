-- reference_code_sequences
CREATE TABLE "reference_code_sequences" (
  "id"          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "entity_type" VARCHAR(16) NOT NULL,
  "year"        INTEGER NOT NULL,
  "last_value"  BIGINT NOT NULL DEFAULT 0,
  "created_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "chk_reference_code_seq_last_value" CHECK (last_value >= 0)
);
CREATE UNIQUE INDEX "uq_reference_code_sequences_entity_year" ON "reference_code_sequences"("entity_type", "year");

-- audit_logs (immutable — no updated_at, deleted_at, or audit trio)
CREATE TABLE "audit_logs" (
  "id"                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "actor_identity_id"       UUID,
  "actor_role"              VARCHAR(16) NOT NULL,
  "action"                  VARCHAR(64) NOT NULL,
  "resource_type"           VARCHAR(32) NOT NULL,
  "resource_id"             UUID NOT NULL,
  "resource_reference_code" VARCHAR(32),
  "changes"                 JSONB,
  "context"                 JSONB,
  "occurred_at"             TIMESTAMPTZ(6) NOT NULL,
  "created_at"              TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "fk_audit_logs_actor" FOREIGN KEY ("actor_identity_id") REFERENCES "identities"("id") ON DELETE SET NULL
);
CREATE INDEX "idx_audit_logs_resource"       ON "audit_logs"("resource_type", "resource_id", "occurred_at" DESC);
CREATE INDEX "idx_audit_logs_actor"          ON "audit_logs"("actor_identity_id", "occurred_at" DESC);
CREATE INDEX "idx_audit_logs_action"         ON "audit_logs"("action", "occurred_at" DESC);
CREATE INDEX "idx_audit_logs_reference_code" ON "audit_logs"("resource_reference_code") WHERE "resource_reference_code" IS NOT NULL;

-- outbox_events (immutable-ish — status updates only)
CREATE TABLE "outbox_events" (
  "id"              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "aggregate_type"  VARCHAR(32) NOT NULL,
  "aggregate_id"    UUID NOT NULL,
  "event_type"      VARCHAR(64) NOT NULL,
  "sequence_no"     BIGINT NOT NULL,
  "payload"         JSONB NOT NULL,
  "correlation_id"  UUID,
  "status"          "OutboxStatus" NOT NULL DEFAULT 'PENDING',
  "attempts"        INTEGER NOT NULL DEFAULT 0,
  "next_attempt_at" TIMESTAMPTZ(6),
  "last_error"      TEXT,
  "available_at"    TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "published_at"    TIMESTAMPTZ(6),
  "created_at"      TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "chk_outbox_attempts_nonneg" CHECK (attempts >= 0)
);
CREATE UNIQUE INDEX "uq_outbox_dedupe"     ON "outbox_events"("aggregate_type", "aggregate_id", "event_type", "sequence_no");
CREATE INDEX "idx_outbox_pending"          ON "outbox_events"("available_at") WHERE "status" = 'PENDING';
CREATE INDEX "idx_outbox_processing"       ON "outbox_events"("status") WHERE "status" = 'PROCESSING';
CREATE INDEX "idx_outbox_aggregate"        ON "outbox_events"("aggregate_type", "aggregate_id", "sequence_no");

-- notifications
CREATE TABLE "notifications" (
  "id"                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "identity_id"           UUID NOT NULL,
  "channel"               "NotificationChannel" NOT NULL,
  "category"              "NotificationCategory" NOT NULL,
  "title"                 VARCHAR(255) NOT NULL,
  "body"                  TEXT NOT NULL,
  "data"                  JSONB,
  "related_resource_type" VARCHAR(32),
  "related_resource_id"   UUID,
  "status"                "NotificationStatus" NOT NULL DEFAULT 'PENDING',
  "attempts"              INTEGER NOT NULL DEFAULT 0,
  "last_error"            TEXT,
  "scheduled_for"         TIMESTAMPTZ(6),
  "sent_at"               TIMESTAMPTZ(6),
  "delivered_at"          TIMESTAMPTZ(6),
  "read_at"               TIMESTAMPTZ(6),
  "created_at"            TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "fk_notifications_identity" FOREIGN KEY ("identity_id") REFERENCES "identities"("id") ON DELETE RESTRICT
);
CREATE INDEX "idx_notifications_identity_recent"  ON "notifications"("identity_id", "created_at" DESC);
CREATE INDEX "idx_notifications_scheduled"        ON "notifications"("scheduled_for") WHERE "status" = 'PENDING' AND "scheduled_for" IS NOT NULL;
CREATE INDEX "idx_notifications_status"           ON "notifications"("status", "created_at") WHERE "status" IN ('PENDING', 'SENT');
CREATE INDEX "idx_notifications_related_resource" ON "notifications"("related_resource_type", "related_resource_id");

-- device_tokens
CREATE TABLE "device_tokens" (
  "id"           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "identity_id"  UUID NOT NULL,
  "token"        TEXT NOT NULL,
  "platform"     "DevicePlatform" NOT NULL,
  "app_variant"  "AppVariant" NOT NULL,
  "device_id"    VARCHAR(128),
  "app_version"  VARCHAR(32),
  "os_version"   VARCHAR(32),
  "is_active"    BOOLEAN NOT NULL DEFAULT TRUE,
  "last_used_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "created_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "fk_device_tokens_identity" FOREIGN KEY ("identity_id") REFERENCES "identities"("id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "uq_device_tokens_token"          ON "device_tokens"("token");
CREATE UNIQUE INDEX "uq_device_tokens_identity_dev"   ON "device_tokens"("identity_id", "device_id", "app_variant") WHERE "device_id" IS NOT NULL;
CREATE INDEX "idx_device_tokens_identity"             ON "device_tokens"("identity_id", "is_active");

-- app_settings
CREATE TABLE "app_settings" (
  "id"          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "key"         VARCHAR(128) NOT NULL,
  "partner_id"  UUID,
  "value"       JSONB NOT NULL,
  "value_type"  "AppSettingType" NOT NULL,
  "description" TEXT,
  "is_secret"   BOOLEAN NOT NULL DEFAULT FALSE,
  "updated_by"  UUID,
  "created_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "chk_app_settings_secret" CHECK (NOT is_secret OR value_type = 'SECRET'),
  CONSTRAINT "fk_app_settings_partner"    FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT,
  CONSTRAINT "fk_app_settings_updated_by" FOREIGN KEY ("updated_by") REFERENCES "identities"("id") ON DELETE SET NULL
);
CREATE UNIQUE INDEX "uq_app_settings_key_partner"
  ON "app_settings" ("key", COALESCE("partner_id", '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX "idx_app_settings_partner" ON "app_settings"("partner_id") WHERE "partner_id" IS NOT NULL;

-- background_jobs
CREATE TABLE "background_jobs" (
  "id"              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "job_name"        VARCHAR(64) NOT NULL,
  "job_type"        "BackgroundJobType" NOT NULL,
  "schedule_cron"   VARCHAR(64),
  "status"          "BackgroundJobStatus" NOT NULL DEFAULT 'IDLE',
  "locked_by"       VARCHAR(128),
  "locked_until"    TIMESTAMPTZ(6),
  "last_run_at"     TIMESTAMPTZ(6),
  "last_success_at" TIMESTAMPTZ(6),
  "last_failure_at" TIMESTAMPTZ(6),
  "last_error"      TEXT,
  "next_run_at"     TIMESTAMPTZ(6),
  "run_count"       INTEGER NOT NULL DEFAULT 0,
  "failure_count"   INTEGER NOT NULL DEFAULT 0,
  "payload"         JSONB,
  "created_at"      TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at"      TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "chk_background_jobs_schedule" CHECK (job_type <> 'SCHEDULED' OR schedule_cron IS NOT NULL)
);
CREATE UNIQUE INDEX "uq_background_jobs_name"      ON "background_jobs"("job_name");
CREATE INDEX "idx_background_jobs_next_run" ON "background_jobs"("next_run_at", "status") WHERE "status" = 'IDLE';
