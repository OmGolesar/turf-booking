-- operating_hours
CREATE TABLE "operating_hours" (
  "id"           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "ground_id"    UUID NOT NULL,
  "day_of_week"  INTEGER NOT NULL,
  "opening_time" TIME(6) NOT NULL,
  "closing_time" TIME(6) NOT NULL,
  "is_closed"    BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "created_by"   UUID,
  "updated_by"   UUID,
  "deleted_by"   UUID,
  "deleted_at"   TIMESTAMPTZ(6),
  CONSTRAINT "chk_operating_hours_dow"    CHECK (day_of_week BETWEEN 1 AND 7),
  CONSTRAINT "chk_operating_hours_times"  CHECK (is_closed OR opening_time < closing_time),
  CONSTRAINT "fk_operating_hours_ground"      FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE RESTRICT,
  CONSTRAINT "fk_operating_hours_created_by"  FOREIGN KEY ("created_by") REFERENCES "identities"("id") ON DELETE SET NULL,
  CONSTRAINT "fk_operating_hours_updated_by"  FOREIGN KEY ("updated_by") REFERENCES "identities"("id") ON DELETE SET NULL,
  CONSTRAINT "fk_operating_hours_deleted_by"  FOREIGN KEY ("deleted_by") REFERENCES "identities"("id") ON DELETE SET NULL
);
CREATE UNIQUE INDEX "uq_operating_hours_ground_day" ON "operating_hours"("ground_id", "day_of_week");
CREATE INDEX "idx_operating_hours_ground" ON "operating_hours"("ground_id");

-- availability_exceptions
CREATE TABLE "availability_exceptions" (
  "id"             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "ground_id"      UUID NOT NULL,
  "title"          TEXT NOT NULL,
  "exception_date" DATE NOT NULL,
  "start_time"     TIME(6) NOT NULL,
  "end_time"       TIME(6) NOT NULL,
  "is_closed"      BOOLEAN NOT NULL DEFAULT TRUE,
  "reason"         TEXT,
  "created_at"     TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at"     TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "created_by"     UUID,
  "updated_by"     UUID,
  "deleted_by"     UUID,
  "deleted_at"     TIMESTAMPTZ(6),
  CONSTRAINT "chk_availability_exceptions_times" CHECK (start_time < end_time),
  CONSTRAINT "fk_availability_exceptions_ground"      FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE RESTRICT,
  CONSTRAINT "fk_availability_exceptions_created_by"  FOREIGN KEY ("created_by") REFERENCES "identities"("id") ON DELETE SET NULL,
  CONSTRAINT "fk_availability_exceptions_updated_by"  FOREIGN KEY ("updated_by") REFERENCES "identities"("id") ON DELETE SET NULL,
  CONSTRAINT "fk_availability_exceptions_deleted_by"  FOREIGN KEY ("deleted_by") REFERENCES "identities"("id") ON DELETE SET NULL
);
CREATE INDEX "idx_availability_exceptions_ground_date" ON "availability_exceptions"("ground_id", "exception_date");
CREATE INDEX "idx_availability_exceptions_date"        ON "availability_exceptions"("exception_date");

-- maintenance_blocks
CREATE TABLE "maintenance_blocks" (
  "id"             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "ground_id"      UUID NOT NULL,
  "title"          TEXT NOT NULL,
  "start_datetime" TIMESTAMPTZ(6) NOT NULL,
  "end_datetime"   TIMESTAMPTZ(6) NOT NULL,
  "description"    TEXT,
  "created_at"     TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at"     TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "created_by"     UUID,
  "updated_by"     UUID,
  "deleted_by"     UUID,
  "deleted_at"     TIMESTAMPTZ(6),
  CONSTRAINT "chk_maintenance_blocks_times" CHECK (end_datetime > start_datetime),
  CONSTRAINT "fk_maintenance_blocks_ground"      FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE RESTRICT,
  CONSTRAINT "fk_maintenance_blocks_created_by"  FOREIGN KEY ("created_by") REFERENCES "identities"("id") ON DELETE SET NULL,
  CONSTRAINT "fk_maintenance_blocks_updated_by"  FOREIGN KEY ("updated_by") REFERENCES "identities"("id") ON DELETE SET NULL,
  CONSTRAINT "fk_maintenance_blocks_deleted_by"  FOREIGN KEY ("deleted_by") REFERENCES "identities"("id") ON DELETE SET NULL
);
CREATE INDEX "idx_maintenance_blocks_ground_start" ON "maintenance_blocks"("ground_id", "start_datetime");
CREATE INDEX "idx_maintenance_blocks_range"        ON "maintenance_blocks"("start_datetime", "end_datetime");

-- pricing_rules
CREATE TABLE "pricing_rules" (
  "id"             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "ground_id"      UUID NOT NULL,
  "name"           TEXT NOT NULL,
  "day_of_week"    INTEGER,
  "start_time"     TIME(6) NOT NULL,
  "end_time"       TIME(6) NOT NULL,
  "price_per_slot" DECIMAL(10, 2) NOT NULL,
  "priority"       INTEGER NOT NULL,
  "active"         BOOLEAN NOT NULL DEFAULT TRUE,
  "effective_from" TIMESTAMPTZ(6),
  "effective_to"   TIMESTAMPTZ(6),
  "created_at"     TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at"     TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "created_by"     UUID,
  "updated_by"     UUID,
  "deleted_by"     UUID,
  "deleted_at"     TIMESTAMPTZ(6),
  CONSTRAINT "chk_pricing_rules_price"       CHECK (price_per_slot > 0),
  CONSTRAINT "chk_pricing_rules_priority"    CHECK (priority >= 0),
  CONSTRAINT "chk_pricing_rules_times"       CHECK (start_time < end_time),
  CONSTRAINT "chk_pricing_rules_dow"         CHECK (day_of_week IS NULL OR day_of_week BETWEEN 1 AND 7),
  CONSTRAINT "fk_pricing_rules_ground"       FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE RESTRICT,
  CONSTRAINT "fk_pricing_rules_created_by"   FOREIGN KEY ("created_by") REFERENCES "identities"("id") ON DELETE SET NULL,
  CONSTRAINT "fk_pricing_rules_updated_by"   FOREIGN KEY ("updated_by") REFERENCES "identities"("id") ON DELETE SET NULL,
  CONSTRAINT "fk_pricing_rules_deleted_by"   FOREIGN KEY ("deleted_by") REFERENCES "identities"("id") ON DELETE SET NULL
);
CREATE UNIQUE INDEX "uq_pricing_rules_ground_priority" ON "pricing_rules"("ground_id", "priority");
CREATE INDEX "idx_pricing_rules_ground_active"     ON "pricing_rules"("ground_id", "active");
CREATE INDEX "idx_pricing_rules_ground_dow_active" ON "pricing_rules"("ground_id", "day_of_week", "active");
