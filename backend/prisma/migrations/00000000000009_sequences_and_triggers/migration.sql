-- ─── Global sequences (5-digit zero-padded reference codes) ───────────────
CREATE SEQUENCE seq_partner_ref  START 1 MINVALUE 1 NO CYCLE;
CREATE SEQUENCE seq_venue_ref    START 1 MINVALUE 1 NO CYCLE;
CREATE SEQUENCE seq_ground_ref   START 1 MINVALUE 1 NO CYCLE;
CREATE SEQUENCE seq_customer_ref START 1 MINVALUE 1 NO CYCLE;

-- ─── Global-sequence triggers ─────────────────────────────────────────────

-- Partners
CREATE OR REPLACE FUNCTION trg_partners_reference_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference_code IS NULL OR NEW.reference_code = '' THEN
    NEW.reference_code := 'TX-PT-' || LPAD(nextval('seq_partner_ref')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER partners_reference_code
  BEFORE INSERT ON "partners"
  FOR EACH ROW EXECUTE FUNCTION trg_partners_reference_code();

-- Venues
CREATE OR REPLACE FUNCTION trg_venues_reference_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference_code IS NULL OR NEW.reference_code = '' THEN
    NEW.reference_code := 'TX-VN-' || LPAD(nextval('seq_venue_ref')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER venues_reference_code
  BEFORE INSERT ON "venues"
  FOR EACH ROW EXECUTE FUNCTION trg_venues_reference_code();

-- Grounds
CREATE OR REPLACE FUNCTION trg_grounds_reference_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference_code IS NULL OR NEW.reference_code = '' THEN
    NEW.reference_code := 'TX-GR-' || LPAD(nextval('seq_ground_ref')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER grounds_reference_code
  BEFORE INSERT ON "grounds"
  FOR EACH ROW EXECUTE FUNCTION trg_grounds_reference_code();

-- Identities (only when role = CUSTOMER)
CREATE OR REPLACE FUNCTION trg_identities_reference_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference_code IS NULL AND NEW.role = 'CUSTOMER' THEN
    NEW.reference_code := 'TX-CS-' || LPAD(nextval('seq_customer_ref')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER identities_reference_code
  BEFORE INSERT ON "identities"
  FOR EACH ROW EXECUTE FUNCTION trg_identities_reference_code();

-- ─── Per-year sequenced triggers (bookings, payments) ─────────────────────
-- Uses reference_code_sequences with row-level lock via SELECT ... FOR UPDATE
-- so the (entity_type, year) counter increments atomically across concurrent txns.

CREATE OR REPLACE FUNCTION next_yearly_sequence(p_entity_type TEXT, p_year INTEGER)
RETURNS BIGINT AS $$
DECLARE
  v_next BIGINT;
BEGIN
  -- Try to lock existing row.
  SELECT last_value INTO v_next
  FROM reference_code_sequences
  WHERE entity_type = p_entity_type AND year = p_year
  FOR UPDATE;

  IF NOT FOUND THEN
    -- First entry for this (entity, year). Insert and immediately hand out 1.
    INSERT INTO reference_code_sequences (entity_type, year, last_value)
    VALUES (p_entity_type, p_year, 1)
    ON CONFLICT (entity_type, year) DO UPDATE
      SET last_value = reference_code_sequences.last_value + 1,
          updated_at = NOW()
    RETURNING last_value INTO v_next;
    RETURN v_next;
  END IF;

  UPDATE reference_code_sequences
     SET last_value = last_value + 1,
         updated_at = NOW()
   WHERE entity_type = p_entity_type AND year = p_year
   RETURNING last_value INTO v_next;

  RETURN v_next;
END;
$$ LANGUAGE plpgsql;

-- Bookings: TX-BK-YYYYNNNNNN (creation year, IST)
CREATE OR REPLACE FUNCTION trg_bookings_reference_code()
RETURNS TRIGGER AS $$
DECLARE
  v_year   INTEGER;
  v_seq    BIGINT;
  v_ts     TIMESTAMPTZ;
BEGIN
  IF NEW.reference_code IS NULL OR NEW.reference_code = '' THEN
    v_ts   := COALESCE(NEW.created_at, NOW());
    v_year := EXTRACT(YEAR FROM v_ts AT TIME ZONE 'Asia/Kolkata')::INTEGER;
    v_seq  := next_yearly_sequence('BOOKING', v_year);
    NEW.reference_code := 'TX-BK-' || v_year::TEXT || LPAD(v_seq::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bookings_reference_code
  BEFORE INSERT ON "bookings"
  FOR EACH ROW EXECUTE FUNCTION trg_bookings_reference_code();

-- Payments: TX-PY-YYYYNNNNNN (creation year, IST)
CREATE OR REPLACE FUNCTION trg_payments_reference_code()
RETURNS TRIGGER AS $$
DECLARE
  v_year   INTEGER;
  v_seq    BIGINT;
  v_ts     TIMESTAMPTZ;
BEGIN
  IF NEW.reference_code IS NULL OR NEW.reference_code = '' THEN
    v_ts   := COALESCE(NEW.created_at, NOW());
    v_year := EXTRACT(YEAR FROM v_ts AT TIME ZONE 'Asia/Kolkata')::INTEGER;
    v_seq  := next_yearly_sequence('PAYMENT', v_year);
    NEW.reference_code := 'TX-PY-' || v_year::TEXT || LPAD(v_seq::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payments_reference_code
  BEFORE INSERT ON "payments"
  FOR EACH ROW EXECUTE FUNCTION trg_payments_reference_code();
