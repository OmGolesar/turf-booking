-- customer_favourites: simple join table.
CREATE TABLE "customer_favourites" (
  "identity_id" UUID NOT NULL,
  "venue_id"    UUID NOT NULL,
  "created_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("identity_id", "venue_id"),
  CONSTRAINT "fk_customer_favourites_identity" FOREIGN KEY ("identity_id") REFERENCES "identities"("id") ON DELETE CASCADE,
  CONSTRAINT "fk_customer_favourites_venue"    FOREIGN KEY ("venue_id")    REFERENCES "venues"("id")     ON DELETE CASCADE
);
CREATE INDEX "idx_customer_favourites_identity_created" ON "customer_favourites" ("identity_id", "created_at" DESC);
CREATE INDEX "idx_customer_favourites_venue"            ON "customer_favourites" ("venue_id");

-- Postgres FTS on venues. Auto-maintained via a generated column so writes
-- don't have to remember to update it (Part 3.3 §16).
ALTER TABLE "venues" ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector(
      'english',
      coalesce(name, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(address, '') || ' ' ||
      coalesce(area, '')
    )
  ) STORED;

CREATE INDEX "idx_venues_search_vector" ON "venues" USING GIN ("search_vector");
