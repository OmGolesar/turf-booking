-- booking_sessions (audit trio)
CREATE TABLE "booking_sessions" (
  "id"           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "identity_id"  UUID NOT NULL,
  "ground_id"    UUID NOT NULL,
  "booking_date" DATE NOT NULL,
  "start_time"   TIME(6) NOT NULL,
  "end_time"     TIME(6) NOT NULL,
  "total_amount" DECIMAL(10, 2) NOT NULL,
  "expires_at"   TIMESTAMPTZ(6) NOT NULL,
  "status"       "BookingSessionStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "created_by"   UUID,
  "updated_by"   UUID,
  "deleted_by"   UUID,
  "deleted_at"   TIMESTAMPTZ(6),
  CONSTRAINT "chk_booking_sessions_times"  CHECK (start_time < end_time),
  CONSTRAINT "chk_booking_sessions_amount" CHECK (total_amount > 0),
  CONSTRAINT "fk_booking_sessions_identity"   FOREIGN KEY ("identity_id") REFERENCES "identities"("id") ON DELETE RESTRICT,
  CONSTRAINT "fk_booking_sessions_ground"     FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE RESTRICT,
  CONSTRAINT "fk_booking_sessions_created_by" FOREIGN KEY ("created_by") REFERENCES "identities"("id") ON DELETE SET NULL,
  CONSTRAINT "fk_booking_sessions_updated_by" FOREIGN KEY ("updated_by") REFERENCES "identities"("id") ON DELETE SET NULL,
  CONSTRAINT "fk_booking_sessions_deleted_by" FOREIGN KEY ("deleted_by") REFERENCES "identities"("id") ON DELETE SET NULL
);
CREATE INDEX "idx_booking_sessions_identity"       ON "booking_sessions"("identity_id");
CREATE INDEX "idx_booking_sessions_ground_date"    ON "booking_sessions"("ground_id", "booking_date");
CREATE INDEX "idx_booking_sessions_status_expires" ON "booking_sessions"("status", "expires_at");

-- bookings (audit trio)
CREATE TABLE "bookings" (
  "id"                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "reference_code"      VARCHAR(32) NOT NULL DEFAULT '',
  "booking_session_id"  UUID NOT NULL,
  "identity_id"         UUID NOT NULL,
  "partner_id"          UUID NOT NULL,
  "venue_id"            UUID NOT NULL,
  "ground_id"           UUID NOT NULL,
  "booking_date"        DATE NOT NULL,
  "start_time"          TIME(6) NOT NULL,
  "end_time"            TIME(6) NOT NULL,
  "booking_source"      "BookingSource" NOT NULL,
  "booking_status"      "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
  "total_amount"        DECIMAL(10, 2) NOT NULL,
  "currency"            TEXT NOT NULL DEFAULT 'INR',
  "checked_in_at"       TIMESTAMPTZ(6),
  "completed_at"        TIMESTAMPTZ(6),
  "cancelled_at"        TIMESTAMPTZ(6),
  "cancellation_reason" TEXT,
  "created_at"          TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at"          TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "created_by"          UUID,
  "updated_by"          UUID,
  "deleted_by"          UUID,
  "deleted_at"          TIMESTAMPTZ(6),
  CONSTRAINT "chk_bookings_times"  CHECK (start_time < end_time),
  CONSTRAINT "chk_bookings_amount" CHECK (total_amount > 0),
  CONSTRAINT "fk_bookings_session"     FOREIGN KEY ("booking_session_id") REFERENCES "booking_sessions"("id") ON DELETE RESTRICT,
  CONSTRAINT "fk_bookings_identity"    FOREIGN KEY ("identity_id") REFERENCES "identities"("id") ON DELETE RESTRICT,
  CONSTRAINT "fk_bookings_partner"     FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT,
  CONSTRAINT "fk_bookings_venue"       FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE RESTRICT,
  CONSTRAINT "fk_bookings_ground"      FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE RESTRICT,
  CONSTRAINT "fk_bookings_created_by"  FOREIGN KEY ("created_by") REFERENCES "identities"("id") ON DELETE SET NULL,
  CONSTRAINT "fk_bookings_updated_by"  FOREIGN KEY ("updated_by") REFERENCES "identities"("id") ON DELETE SET NULL,
  CONSTRAINT "fk_bookings_deleted_by"  FOREIGN KEY ("deleted_by") REFERENCES "identities"("id") ON DELETE SET NULL
);
CREATE UNIQUE INDEX "uq_bookings_reference_code"      ON "bookings"("reference_code");
CREATE UNIQUE INDEX "uq_bookings_booking_session_id"  ON "bookings"("booking_session_id");
CREATE INDEX "idx_bookings_identity_created"   ON "bookings"("identity_id", "created_at" DESC);
CREATE INDEX "idx_bookings_ground_date"        ON "bookings"("ground_id", "booking_date");
CREATE INDEX "idx_bookings_partner_date"       ON "bookings"("partner_id", "booking_date");
CREATE INDEX "idx_bookings_venue_date"         ON "bookings"("venue_id", "booking_date");
CREATE INDEX "idx_bookings_status_date"        ON "bookings"("booking_status", "booking_date");
CREATE INDEX "idx_bookings_reference_code"     ON "bookings"("reference_code");

-- payments (NO audit trio, NO deleted_at)
CREATE TABLE "payments" (
  "id"                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "reference_code"        VARCHAR(32) NOT NULL DEFAULT '',
  "booking_id"            UUID NOT NULL,
  "payment_provider"      "PaymentProvider" NOT NULL,
  "transaction_reference" TEXT NOT NULL,
  "amount"                DECIMAL(10, 2) NOT NULL,
  "currency"              TEXT NOT NULL DEFAULT 'INR',
  "payment_method"        "PaymentMethod" NOT NULL,
  "payment_status"        "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "paid_at"               TIMESTAMPTZ(6),
  "refunded_at"           TIMESTAMPTZ(6),
  "refund_amount"         DECIMAL(10, 2),
  "refund_reason"         TEXT,
  "provider_payload"      JSONB,
  "created_at"            TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "fk_payments_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "uq_payments_reference_code"        ON "payments"("reference_code");
CREATE UNIQUE INDEX "uq_payments_booking_id"            ON "payments"("booking_id");
CREATE UNIQUE INDEX "uq_payments_transaction_reference" ON "payments"("transaction_reference");
CREATE INDEX "idx_payments_booking_id"      ON "payments"("booking_id");
CREATE INDEX "idx_payments_status"          ON "payments"("payment_status");
CREATE INDEX "idx_payments_provider_status" ON "payments"("payment_provider", "payment_status");

-- reviews (NO audit trio, NO updated_at)
CREATE TABLE "reviews" (
  "id"          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "booking_id"  UUID NOT NULL,
  "venue_id"    UUID NOT NULL,
  "identity_id" UUID NOT NULL,
  "rating"      INTEGER NOT NULL,
  "review_text" TEXT,
  "created_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "chk_reviews_rating" CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT "fk_reviews_booking"  FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT,
  CONSTRAINT "fk_reviews_venue"    FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE RESTRICT,
  CONSTRAINT "fk_reviews_identity" FOREIGN KEY ("identity_id") REFERENCES "identities"("id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "uq_reviews_booking_id" ON "reviews"("booking_id");
CREATE INDEX "idx_reviews_venue_created" ON "reviews"("venue_id", "created_at" DESC);
CREATE INDEX "idx_reviews_identity"      ON "reviews"("identity_id");
