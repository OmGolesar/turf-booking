-- identities
CREATE TABLE "identities" (
  "id"             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "reference_code" VARCHAR(32),
  "firebase_uid"   TEXT NOT NULL,
  "email"          TEXT,
  "phone"          TEXT,
  "role"           "Role" NOT NULL,
  "status"         "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  "last_login_at"  TIMESTAMPTZ(6),
  "created_at"     TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at"     TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX "uq_identities_reference_code" ON "identities"("reference_code");
CREATE UNIQUE INDEX "uq_identities_firebase_uid"   ON "identities"("firebase_uid");
CREATE UNIQUE INDEX "uq_identities_email"          ON "identities"("email");
CREATE UNIQUE INDEX "uq_identities_phone"          ON "identities"("phone");
CREATE INDEX "idx_identities_role_status" ON "identities"("role", "status");

-- identity_profiles (audit trio applies)
CREATE TABLE "identity_profiles" (
  "id"          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "identity_id" UUID NOT NULL,
  "first_name"  TEXT NOT NULL,
  "last_name"   TEXT,
  "avatar_url"  TEXT,
  "city"        TEXT,
  "state"       TEXT,
  "country"     TEXT DEFAULT 'India',
  "language"    TEXT DEFAULT 'en',
  "timezone"    TEXT DEFAULT 'Asia/Kolkata',
  "created_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "created_by"  UUID,
  "updated_by"  UUID,
  "deleted_by"  UUID,
  "deleted_at"  TIMESTAMPTZ(6),
  CONSTRAINT "fk_identity_profiles_identity"   FOREIGN KEY ("identity_id") REFERENCES "identities"("id") ON DELETE RESTRICT,
  CONSTRAINT "fk_identity_profiles_created_by" FOREIGN KEY ("created_by") REFERENCES "identities"("id") ON DELETE SET NULL,
  CONSTRAINT "fk_identity_profiles_updated_by" FOREIGN KEY ("updated_by") REFERENCES "identities"("id") ON DELETE SET NULL,
  CONSTRAINT "fk_identity_profiles_deleted_by" FOREIGN KEY ("deleted_by") REFERENCES "identities"("id") ON DELETE SET NULL
);
CREATE UNIQUE INDEX "uq_identity_profiles_identity_id" ON "identity_profiles"("identity_id");

-- partners (audit trio applies)
CREATE TABLE "partners" (
  "id"             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "reference_code" VARCHAR(32) NOT NULL DEFAULT '',
  "identity_id"    UUID NOT NULL,
  "business_name"  TEXT NOT NULL,
  "display_name"   TEXT NOT NULL,
  "email"          TEXT,
  "phone"          TEXT NOT NULL,
  "address"        TEXT,
  "city"           TEXT NOT NULL DEFAULT 'Nashik',
  "state"          TEXT NOT NULL DEFAULT 'Maharashtra',
  "status"         "PartnerStatus" NOT NULL DEFAULT 'PENDING',
  "is_verified"    BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at"     TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at"     TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "created_by"     UUID,
  "updated_by"     UUID,
  "deleted_by"     UUID,
  "deleted_at"     TIMESTAMPTZ(6),
  CONSTRAINT "fk_partners_identity"   FOREIGN KEY ("identity_id") REFERENCES "identities"("id") ON DELETE RESTRICT,
  CONSTRAINT "fk_partners_created_by" FOREIGN KEY ("created_by") REFERENCES "identities"("id") ON DELETE SET NULL,
  CONSTRAINT "fk_partners_updated_by" FOREIGN KEY ("updated_by") REFERENCES "identities"("id") ON DELETE SET NULL,
  CONSTRAINT "fk_partners_deleted_by" FOREIGN KEY ("deleted_by") REFERENCES "identities"("id") ON DELETE SET NULL
);
CREATE UNIQUE INDEX "uq_partners_reference_code" ON "partners"("reference_code");
CREATE UNIQUE INDEX "uq_partners_identity_id"    ON "partners"("identity_id");
CREATE INDEX "idx_partners_city_status"      ON "partners"("city", "status");
CREATE INDEX "idx_partners_status_verified"  ON "partners"("status", "is_verified");
