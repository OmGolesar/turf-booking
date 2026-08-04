-- Chatbot booking attribution.
--
-- (1) Extend the BookingSource enum with a CHATBOT variant so an operator can
--     filter analytics by channel (bookings originating from the LLM concierge
--     vs the app's own search flow).
--
-- (2) Add booking_sessions.booking_source. Channel is established when the
--     *hold* is created (BookingSessionService.create) and read at confirm
--     time (BookingService.confirm) so the promoted booking preserves it.
--     Defaulting to CUSTOMER_APP + NOT NULL backfills any existing sessions
--     in-place and keeps the invariant in the schema — no code-side fallback.

ALTER TYPE "BookingSource" ADD VALUE 'CHATBOT';

ALTER TABLE "booking_sessions"
  ADD COLUMN "booking_source" "BookingSource" NOT NULL DEFAULT 'CUSTOMER_APP';
