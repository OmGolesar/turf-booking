-- venues
CREATE TABLE "venues" (
  "id"              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "reference_code"  VARCHAR(32) NOT NULL DEFAULT '',
  "partner_id"      UUID NOT NULL,
  "name"            TEXT NOT NULL,
  "slug"            TEXT NOT NULL,
  "description"     TEXT,
  "phone"           TEXT,
  "email"           TEXT,
  "address"         TEXT NOT NULL,
  "area"            TEXT,
  "city"            TEXT NOT NULL DEFAULT 'Nashik',
  "state"           TEXT NOT NULL DEFAULT 'Maharashtra',
  "postal_code"     TEXT,
  "latitude"        DECIMAL(10, 8) NOT NULL,
  "longitude"       DECIMAL(11, 8) NOT NULL,
  "google_maps_url" TEXT,
  "amenities"       JSONB,
  "average_rating"  DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total_reviews"   INTEGER NOT NULL DEFAULT 0,
  "status"          "VenueStatus" NOT NULL DEFAULT 'DRAFT',
  "created_at"      TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at"      TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "created_by"      UUID,
  "updated_by"      UUID,
  "deleted_by"      UUID,
  "deleted_at"      TIMESTAMPTZ(6),
  CONSTRAINT "fk_venues_partner"     FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT,
  CONSTRAINT "fk_venues_created_by"  FOREIGN KEY ("created_by") REFERENCES "identities"("id") ON DELETE SET NULL,
  CONSTRAINT "fk_venues_updated_by"  FOREIGN KEY ("updated_by") REFERENCES "identities"("id") ON DELETE SET NULL,
  CONSTRAINT "fk_venues_deleted_by"  FOREIGN KEY ("deleted_by") REFERENCES "identities"("id") ON DELETE SET NULL
);
CREATE UNIQUE INDEX "uq_venues_reference_code" ON "venues"("reference_code");
CREATE UNIQUE INDEX "uq_venues_slug"           ON "venues"("slug");
CREATE INDEX "idx_venues_partner_id"        ON "venues"("partner_id");
CREATE INDEX "idx_venues_city_status"       ON "venues"("city", "status");
CREATE INDEX "idx_venues_status"            ON "venues"("status");
CREATE INDEX "idx_venues_average_rating"    ON "venues"("average_rating" DESC);

-- venue_media
CREATE TABLE "venue_media" (
  "id"            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "venue_id"      UUID NOT NULL,
  "file_url"      TEXT NOT NULL,
  "media_type"    "MediaType" NOT NULL,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "created_at"    TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "created_by"    UUID,
  "updated_by"    UUID,
  "deleted_by"    UUID,
  "deleted_at"    TIMESTAMPTZ(6),
  CONSTRAINT "fk_venue_media_venue"      FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE RESTRICT,
  CONSTRAINT "fk_venue_media_created_by" FOREIGN KEY ("created_by") REFERENCES "identities"("id") ON DELETE SET NULL,
  CONSTRAINT "fk_venue_media_updated_by" FOREIGN KEY ("updated_by") REFERENCES "identities"("id") ON DELETE SET NULL,
  CONSTRAINT "fk_venue_media_deleted_by" FOREIGN KEY ("deleted_by") REFERENCES "identities"("id") ON DELETE SET NULL
);
CREATE INDEX "idx_venue_media_venue_order" ON "venue_media"("venue_id", "display_order");

-- grounds
CREATE TABLE "grounds" (
  "id"             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "reference_code" VARCHAR(32) NOT NULL DEFAULT '',
  "venue_id"       UUID NOT NULL,
  "sport_id"       UUID NOT NULL,
  "name"           TEXT NOT NULL,
  "surface_type"   "SurfaceType" NOT NULL,
  "indoor"         BOOLEAN NOT NULL DEFAULT FALSE,
  "max_players"    INTEGER NOT NULL,
  "lighting"       BOOLEAN NOT NULL DEFAULT TRUE,
  "description"    TEXT,
  "status"         "GroundStatus" NOT NULL DEFAULT 'DRAFT',
  "created_at"     TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at"     TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "created_by"     UUID,
  "updated_by"     UUID,
  "deleted_by"     UUID,
  "deleted_at"     TIMESTAMPTZ(6),
  CONSTRAINT "chk_grounds_max_players_positive" CHECK (max_players > 0),
  CONSTRAINT "fk_grounds_venue"      FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE RESTRICT,
  CONSTRAINT "fk_grounds_sport"      FOREIGN KEY ("sport_id") REFERENCES "sports"("id") ON DELETE RESTRICT,
  CONSTRAINT "fk_grounds_created_by" FOREIGN KEY ("created_by") REFERENCES "identities"("id") ON DELETE SET NULL,
  CONSTRAINT "fk_grounds_updated_by" FOREIGN KEY ("updated_by") REFERENCES "identities"("id") ON DELETE SET NULL,
  CONSTRAINT "fk_grounds_deleted_by" FOREIGN KEY ("deleted_by") REFERENCES "identities"("id") ON DELETE SET NULL
);
CREATE UNIQUE INDEX "uq_grounds_reference_code" ON "grounds"("reference_code");
CREATE INDEX "idx_grounds_venue_status" ON "grounds"("venue_id", "status");
CREATE INDEX "idx_grounds_sport_id"     ON "grounds"("sport_id");
CREATE INDEX "idx_grounds_status"       ON "grounds"("status");

-- ground_media
CREATE TABLE "ground_media" (
  "id"            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "ground_id"     UUID NOT NULL,
  "file_url"      TEXT NOT NULL,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "created_at"    TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "created_by"    UUID,
  "updated_by"    UUID,
  "deleted_by"    UUID,
  "deleted_at"    TIMESTAMPTZ(6),
  CONSTRAINT "fk_ground_media_ground"      FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE RESTRICT,
  CONSTRAINT "fk_ground_media_created_by"  FOREIGN KEY ("created_by") REFERENCES "identities"("id") ON DELETE SET NULL,
  CONSTRAINT "fk_ground_media_updated_by"  FOREIGN KEY ("updated_by") REFERENCES "identities"("id") ON DELETE SET NULL,
  CONSTRAINT "fk_ground_media_deleted_by"  FOREIGN KEY ("deleted_by") REFERENCES "identities"("id") ON DELETE SET NULL
);
CREATE INDEX "idx_ground_media_ground_order" ON "ground_media"("ground_id", "display_order");

-- ground_configurations
CREATE TABLE "ground_configurations" (
  "id"                         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "ground_id"                  UUID NOT NULL,
  "booking_duration"           INTEGER NOT NULL,
  "booking_interval"           INTEGER NOT NULL,
  "buffer_time"                INTEGER NOT NULL DEFAULT 0,
  "cleaning_time"              INTEGER NOT NULL DEFAULT 0,
  "max_advance_booking_days"   INTEGER NOT NULL DEFAULT 30,
  "min_notice_minutes"         INTEGER NOT NULL DEFAULT 30,
  "cancellation_window_hours"  INTEGER NOT NULL DEFAULT 4,
  "created_at"                 TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at"                 TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "created_by"                 UUID,
  "updated_by"                 UUID,
  "deleted_by"                 UUID,
  "deleted_at"                 TIMESTAMPTZ(6),
  CONSTRAINT "chk_ground_config_duration"    CHECK (booking_duration > 0),
  CONSTRAINT "chk_ground_config_interval"    CHECK (booking_interval > 0),
  CONSTRAINT "chk_ground_config_buffer"      CHECK (buffer_time >= 0),
  CONSTRAINT "chk_ground_config_cleaning"    CHECK (cleaning_time >= 0),
  CONSTRAINT "chk_ground_config_advance"     CHECK (max_advance_booking_days > 0),
  CONSTRAINT "fk_ground_config_ground"       FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE RESTRICT,
  CONSTRAINT "fk_ground_config_created_by"   FOREIGN KEY ("created_by") REFERENCES "identities"("id") ON DELETE SET NULL,
  CONSTRAINT "fk_ground_config_updated_by"   FOREIGN KEY ("updated_by") REFERENCES "identities"("id") ON DELETE SET NULL,
  CONSTRAINT "fk_ground_config_deleted_by"   FOREIGN KEY ("deleted_by") REFERENCES "identities"("id") ON DELETE SET NULL
);
CREATE UNIQUE INDEX "uq_ground_configurations_ground_id" ON "ground_configurations"("ground_id");
