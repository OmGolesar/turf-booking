-- Phone / email verification timestamps.
-- Verification status itself is derived from Firebase claims + the presence
-- of these timestamps (Part 3.1 §7).
ALTER TABLE "identities" ADD COLUMN "phone_verified_at" TIMESTAMPTZ(6);
ALTER TABLE "identities" ADD COLUMN "email_verified_at" TIMESTAMPTZ(6);
