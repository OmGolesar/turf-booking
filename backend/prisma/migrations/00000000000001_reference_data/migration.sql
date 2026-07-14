CREATE TABLE "sports" (
  "id"                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "code"                     VARCHAR(32) NOT NULL,
  "display_name"             VARCHAR(64) NOT NULL,
  "icon_url"                 TEXT,
  "default_duration_minutes" INTEGER NOT NULL DEFAULT 60,
  "default_max_players"      INTEGER NOT NULL DEFAULT 10,
  "display_order"            INTEGER NOT NULL DEFAULT 0,
  "is_active"                BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at"               TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at"               TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "chk_sports_duration_positive"    CHECK (default_duration_minutes > 0),
  CONSTRAINT "chk_sports_max_players_positive" CHECK (default_max_players > 0)
);

CREATE UNIQUE INDEX "uq_sports_code" ON "sports"("code");
CREATE INDEX "idx_sports_active_order" ON "sports"("is_active", "display_order");
