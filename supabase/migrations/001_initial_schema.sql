-- ============================================================
-- Haven and Keys — Initial Schema Migration
-- v1.0.0 | 2026-04-15
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─── Enums ───────────────────────────────────────────────────────────────────
CREATE TYPE booking_status AS ENUM (
  'pending',
  'unpaid',
  'paid',
  'verified',
  'checked_in',
  'checked_out',
  'cancelled'
);

CREATE TYPE transaction_type   AS ENUM ('eco_tax', 'upsell');
CREATE TYPE transaction_status AS ENUM ('pending', 'succeeded', 'failed', 'refunded');
CREATE TYPE upsell_category    AS ENUM ('late_checkout', 'transport', 'cleaning', 'experience', 'provisioning', 'other');
CREATE TYPE doc_type           AS ENUM ('passport', 'drivers_license', 'national_id', 'other');
CREATE TYPE webhook_source     AS ENUM ('hostaway', 'stripe');

-- ─── Table: properties ───────────────────────────────────────────────────────
CREATE TABLE properties (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                     TEXT    NOT NULL,
  hostaway_listing_id      TEXT    UNIQUE NOT NULL,
  -- All fields below are AES-256-GCM encrypted at application layer (iv:tag:data)
  address_encrypted        TEXT    NOT NULL,
  lat_encrypted            TEXT    NOT NULL,
  lng_encrypted            TEXT    NOT NULL,
  entry_code_encrypted     TEXT    NOT NULL,
  wifi_ssid_encrypted      TEXT,
  wifi_password_encrypted  TEXT,
  -- Public content
  house_rules_md           TEXT,
  hero_image_url           TEXT,
  welcome_message          TEXT,
  -- Config
  eco_tax_amount_cents     INTEGER NOT NULL DEFAULT 0,
  eco_tax_currency         TEXT    NOT NULL DEFAULT 'eur',
  timezone                 TEXT    NOT NULL DEFAULT 'UTC',
  is_active                BOOLEAN NOT NULL DEFAULT TRUE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Table: guests ────────────────────────────────────────────────────────────
CREATE TABLE guests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostaway_guest_id   TEXT UNIQUE,
  full_name           TEXT NOT NULL,
  email               TEXT,
  phone_e164          TEXT NOT NULL,
  nationality         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_guests_phone ON guests(phone_e164);

-- ─── Table: bookings (THE STATE MACHINE) ─────────────────────────────────────
CREATE TABLE bookings (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id                UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  guest_id                   UUID NOT NULL REFERENCES guests(id)     ON DELETE RESTRICT,
  hostaway_reservation_id    TEXT UNIQUE NOT NULL,
  -- State
  status                     booking_status NOT NULL DEFAULT 'pending',
  id_uploaded                BOOLEAN NOT NULL DEFAULT FALSE,
  -- Stay
  check_in_date              DATE NOT NULL,
  check_out_date             DATE NOT NULL,
  num_guests                 SMALLINT NOT NULL DEFAULT 1,
  nights                     SMALLINT GENERATED ALWAYS AS (check_out_date - check_in_date) STORED,
  -- Financials
  eco_tax_amount_cents       INTEGER NOT NULL DEFAULT 0,
  eco_tax_currency           TEXT    NOT NULL DEFAULT 'eur',
  eco_tax_paid_at            TIMESTAMPTZ,
  -- Communication
  magic_link_sent_at         TIMESTAMPTZ,
  twilio_message_sid         TEXT,
  -- Lifecycle
  portal_first_accessed_at   TIMESTAMPTZ,
  cancelled_at               TIMESTAMPTZ,
  cancellation_reason        TEXT,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_dates  CHECK (check_out_date > check_in_date),
  CONSTRAINT chk_guests CHECK (num_guests > 0)
);
CREATE INDEX idx_bookings_status   ON bookings(status);
CREATE INDEX idx_bookings_property ON bookings(property_id);
CREATE INDEX idx_bookings_guest    ON bookings(guest_id);
CREATE INDEX idx_bookings_checkin  ON bookings(check_in_date);

-- ─── Table: magic_tokens ─────────────────────────────────────────────────────
CREATE TABLE magic_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  token        TEXT NOT NULL UNIQUE,
  expires_at   TIMESTAMPTZ NOT NULL,
  revoked_at   TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  use_count    INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_token_length CHECK (char_length(token) = 64)
);
CREATE INDEX idx_magic_tokens_token   ON magic_tokens(token);
CREATE INDEX idx_magic_tokens_booking ON magic_tokens(booking_id);

-- ─── Table: transactions ─────────────────────────────────────────────────────
CREATE TABLE transactions (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id                   UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  type                         transaction_type   NOT NULL,
  status                       transaction_status NOT NULL DEFAULT 'pending',
  stripe_checkout_session_id   TEXT UNIQUE,
  stripe_payment_intent_id     TEXT UNIQUE,
  amount_cents                 INTEGER NOT NULL,
  currency                     TEXT    NOT NULL DEFAULT 'eur',
  upsell_order_id              UUID,
  stripe_metadata              JSONB,
  failed_reason                TEXT,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_transactions_booking   ON transactions(booking_id);
CREATE INDEX idx_transactions_status    ON transactions(status);
CREATE INDEX idx_transactions_stripe_pi ON transactions(stripe_payment_intent_id);

-- ─── Table: upsell_services ──────────────────────────────────────────────────
CREATE TABLE upsell_services (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id      UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  category         upsell_category NOT NULL,
  name             TEXT    NOT NULL,
  description      TEXT,
  price_cents      INTEGER NOT NULL,
  currency         TEXT    NOT NULL DEFAULT 'eur',
  image_url        TEXT,
  is_available     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order       SMALLINT NOT NULL DEFAULT 0,
  max_per_booking  SMALLINT NOT NULL DEFAULT 1,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_upsell_services_property ON upsell_services(property_id);

-- ─── Table: upsell_orders ────────────────────────────────────────────────────
CREATE TABLE upsell_orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id        UUID NOT NULL REFERENCES bookings(id)         ON DELETE RESTRICT,
  upsell_service_id UUID NOT NULL REFERENCES upsell_services(id)  ON DELETE RESTRICT,
  quantity          SMALLINT NOT NULL DEFAULT 1,
  unit_price_cents  INTEGER  NOT NULL,
  total_cents       INTEGER  GENERATED ALWAYS AS (quantity * unit_price_cents) STORED,
  currency          TEXT     NOT NULL DEFAULT 'eur',
  notes             TEXT,
  fulfilled_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_upsell_orders_booking ON upsell_orders(booking_id);

-- FK back to transactions
ALTER TABLE transactions
  ADD CONSTRAINT fk_transactions_upsell_order
  FOREIGN KEY (upsell_order_id) REFERENCES upsell_orders(id) ON DELETE SET NULL;

-- ─── Table: id_documents ─────────────────────────────────────────────────────
CREATE TABLE id_documents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id       UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  doc_type         doc_type NOT NULL,
  storage_path     TEXT NOT NULL,
  file_size_bytes  INTEGER,
  mime_type        TEXT,
  uploaded_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at      TIMESTAMPTZ,
  reviewer_notes   TEXT,
  is_rejected      BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_id_documents_booking ON id_documents(booking_id);

-- ─── Table: webhook_events (IDEMPOTENCY SHIELD) ───────────────────────────────
CREATE TABLE webhook_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source            webhook_source NOT NULL,
  external_event_id TEXT           NOT NULL,
  event_type        TEXT           NOT NULL,
  payload           JSONB          NOT NULL,
  processed_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  processing_ms     INTEGER,
  CONSTRAINT uq_webhook_source_event UNIQUE (source, external_event_id)
);
CREATE INDEX idx_webhook_events_source ON webhook_events(source, external_event_id);

-- ─── Trigger: auto-update updated_at ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON properties      FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON guests          FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON bookings        FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON transactions    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON upsell_services FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─── Trigger: auto-advance booking to 'verified' ─────────────────────────────
-- This is the heart of the State Machine. The transition lives in the DB,
-- not scattered across application code.
CREATE OR REPLACE FUNCTION trigger_check_verification()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'paid' AND NEW.id_uploaded = TRUE THEN
    NEW.status = 'verified';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_verify_booking
  BEFORE UPDATE OF status, id_uploaded ON bookings
  FOR EACH ROW EXECUTE FUNCTION trigger_check_verification();

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- The client NEVER connects directly to Supabase.
-- All access flows through Next.js API routes using the SERVICE_ROLE key.
-- RLS is a defense-in-depth layer — service_role bypasses it by default.

ALTER TABLE properties    ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE id_documents  ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE magic_tokens  ENABLE ROW LEVEL SECURITY;

-- Block all direct client access (service_role key bypasses RLS automatically)
CREATE POLICY "deny_all_direct" ON properties   FOR ALL USING (FALSE);
CREATE POLICY "deny_all_direct" ON bookings     FOR ALL USING (FALSE);
CREATE POLICY "deny_all_direct" ON id_documents FOR ALL USING (FALSE);
CREATE POLICY "deny_all_direct" ON transactions FOR ALL USING (FALSE);
CREATE POLICY "deny_all_direct" ON magic_tokens FOR ALL USING (FALSE);

-- ─── Supabase Storage: id-vault bucket ───────────────────────────────────────
-- Run this via Supabase Dashboard or CLI after creating the bucket:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('id-vault', 'id-vault', FALSE);
-- The bucket must be PRIVATE. Signed URLs are generated server-side only when needed.
