ALTER TABLE "venues" ADD COLUMN "location" geography(Point, 4326);

CREATE OR REPLACE FUNCTION trg_venues_populate_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location := ST_SetSRID(
      ST_MakePoint(NEW.longitude::double precision, NEW.latitude::double precision),
      4326
    )::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER venues_populate_location
  BEFORE INSERT OR UPDATE OF latitude, longitude ON "venues"
  FOR EACH ROW EXECUTE FUNCTION trg_venues_populate_location();

CREATE INDEX idx_venues_location_gist ON "venues" USING GIST (location);
