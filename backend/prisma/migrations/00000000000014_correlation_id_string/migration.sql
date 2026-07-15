-- Correlation IDs are opaque tokens: ULID from our request-id middleware,
-- UUID from external callers, traceparent from OTel. Store as VARCHAR
-- rather than constraining to UUID.
ALTER TABLE "outbox_events" ALTER COLUMN "correlation_id" TYPE VARCHAR(64) USING correlation_id::text;
