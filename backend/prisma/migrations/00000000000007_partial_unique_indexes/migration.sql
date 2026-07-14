-- Primary defense against double-booking a slot.
CREATE UNIQUE INDEX "uq_active_booking_session"
  ON "booking_sessions" ("ground_id", "booking_date", "start_time")
  WHERE status = 'ACTIVE';

-- One live COVER per venue.
CREATE UNIQUE INDEX "uq_venue_media_cover"
  ON "venue_media" ("venue_id")
  WHERE media_type = 'COVER' AND deleted_at IS NULL;

-- One live LOGO per venue.
CREATE UNIQUE INDEX "uq_venue_media_logo"
  ON "venue_media" ("venue_id")
  WHERE media_type = 'LOGO' AND deleted_at IS NULL;
