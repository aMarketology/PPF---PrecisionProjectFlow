-- ─────────────────────────────────────────────────────────────────────────────
-- SEED_COMPANIES_MIGRATION.sql
-- Creates company_profiles table (and company_claims) from scratch,
-- or safely adds new columns if the table already exists.
-- Run once in Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Create company_profiles (safe — does nothing if already exists) ────────
CREATE TABLE IF NOT EXISTS company_profiles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership (NULL = unclaimed directory entry)
  owner_id        uuid REFERENCES profiles(id) ON DELETE SET NULL,

  -- Core company info (used by app/settings/company + seed-vendor.js)
  company_name    text NOT NULL,
  name            text,                          -- alias used by some app pages
  description     text,
  email           text,
  phone           text,
  website         text,
  street_address  text,
  address         text,                          -- alias used by settings/company
  city            text,
  state           text,
  zip_code        text,
  specialties     text[] DEFAULT '{}',
  certifications  text[] DEFAULT '{}',
  verified        boolean NOT NULL DEFAULT false,
  stripe_account_id text,

  -- Directory / claim fields
  slug            text UNIQUE,
  industry        text,
  is_claimed      boolean NOT NULL DEFAULT false,
  claimed_by      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  claimed_at      timestamptz,
  source          text,                          -- 'tsv_import' | 'signup' | 'manual'

  -- TSV contact info (one key contact per company)
  contact_name    text,
  contact_title   text,
  contact_email   text,
  contact_phone   text,
  contact_mobile  text,
  contact_linkedin text,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── 2. If table already existed, add any missing columns safely ───────────────
ALTER TABLE company_profiles
  ADD COLUMN IF NOT EXISTS slug             text,
  ADD COLUMN IF NOT EXISTS industry         text,
  ADD COLUMN IF NOT EXISTS is_claimed       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS claimed_by       uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS claimed_at       timestamptz,
  ADD COLUMN IF NOT EXISTS source           text,
  ADD COLUMN IF NOT EXISTS contact_name     text,
  ADD COLUMN IF NOT EXISTS contact_title    text,
  ADD COLUMN IF NOT EXISTS contact_email    text,
  ADD COLUMN IF NOT EXISTS contact_phone    text,
  ADD COLUMN IF NOT EXISTS contact_mobile   text,
  ADD COLUMN IF NOT EXISTS contact_linkedin text,
  ADD COLUMN IF NOT EXISTS name             text,
  ADD COLUMN IF NOT EXISTS address          text,
  ADD COLUMN IF NOT EXISTS street_address   text,
  ADD COLUMN IF NOT EXISTS certifications   text[] DEFAULT '{}';

-- Make owner_id nullable (for unclaimed directory entries)
ALTER TABLE company_profiles ALTER COLUMN owner_id DROP NOT NULL;

-- ── 3. Unique constraint on slug (idempotent) ─────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'company_profiles_slug_key'
  ) THEN
    ALTER TABLE company_profiles ADD CONSTRAINT company_profiles_slug_key UNIQUE (slug);
  END IF;
END $$;

-- ── 4. company_claims table (for claim requests) ──────────────────────────────
CREATE TABLE IF NOT EXISTS company_claims (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason          text,
  status          text NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  reviewed_by     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── 5. Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_company_profiles_is_claimed   ON company_profiles(is_claimed);
CREATE INDEX IF NOT EXISTS idx_company_profiles_company_name ON company_profiles(company_name);
CREATE INDEX IF NOT EXISTS idx_company_profiles_slug         ON company_profiles(slug);
CREATE INDEX IF NOT EXISTS idx_company_profiles_industry     ON company_profiles(industry);
CREATE INDEX IF NOT EXISTS idx_company_claims_company_id     ON company_claims(company_id);
CREATE INDEX IF NOT EXISTS idx_company_claims_user_id        ON company_claims(user_id);

-- ── 6. Enable RLS ─────────────────────────────────────────────────────────────
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_claims   ENABLE ROW LEVEL SECURITY;

-- ── 7. RLS Policies — company_profiles ───────────────────────────────────────
-- Anyone can browse the directory
DROP POLICY IF EXISTS "Public can view company_profiles" ON company_profiles;
CREATE POLICY "Public can view company_profiles"
  ON company_profiles FOR SELECT USING (true);

-- Owner or claimer can update
DROP POLICY IF EXISTS "Owner can update company" ON company_profiles;
CREATE POLICY "Owner can update company"
  ON company_profiles FOR UPDATE
  USING (auth.uid() = owner_id OR auth.uid() = claimed_by);

-- Authenticated users can insert (for signup flow)
DROP POLICY IF EXISTS "Auth users can insert company" ON company_profiles;
CREATE POLICY "Auth users can insert company"
  ON company_profiles FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ── 8. RLS Policies — company_claims ─────────────────────────────────────────
DROP POLICY IF EXISTS "Auth users can submit claims" ON company_claims;
CREATE POLICY "Auth users can submit claims"
  ON company_claims FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own claims" ON company_claims;
CREATE POLICY "Users can view own claims"
  ON company_claims FOR SELECT
  USING (auth.uid() = user_id);

-- ── 9. updated_at trigger ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_company_profiles_updated_at ON company_profiles;
CREATE TRIGGER set_company_profiles_updated_at
  BEFORE UPDATE ON company_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Done ──────────────────────────────────────────────────────────────────────
COMMENT ON TABLE  company_profiles                  IS 'Company directory — claimable by real owners';
COMMENT ON COLUMN company_profiles.is_claimed       IS 'false = unclaimed directory entry';
COMMENT ON COLUMN company_profiles.source           IS 'tsv_import | signup | manual';
COMMENT ON COLUMN company_profiles.slug             IS 'URL slug e.g. algonquin-products';
