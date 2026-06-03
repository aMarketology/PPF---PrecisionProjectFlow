-- ─────────────────────────────────────────────────────────────────────────────
-- SEED_COMPANIES_MIGRATION.sql
-- Adds fields needed for unclaimed company directory entries
-- Run once in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- Add contact fields (from TSV) if they don't already exist
ALTER TABLE company_profiles
  ADD COLUMN IF NOT EXISTS contact_name      text,
  ADD COLUMN IF NOT EXISTS contact_title     text,
  ADD COLUMN IF NOT EXISTS contact_email     text,
  ADD COLUMN IF NOT EXISTS contact_phone     text,
  ADD COLUMN IF NOT EXISTS contact_linkedin  text,
  ADD COLUMN IF NOT EXISTS contact_mobile    text,
  ADD COLUMN IF NOT EXISTS is_claimed        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS claimed_by        uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS claimed_at        timestamptz,
  ADD COLUMN IF NOT EXISTS source            text,       -- e.g. 'tsv_import', 'manual', 'signup'
  ADD COLUMN IF NOT EXISTS industry          text,       -- inferred category
  ADD COLUMN IF NOT EXISTS slug              text UNIQUE; -- URL-friendly identifier

-- owner_id can be NULL for unclaimed entries
ALTER TABLE company_profiles
  ALTER COLUMN owner_id DROP NOT NULL;

-- Index for claim lookups
CREATE INDEX IF NOT EXISTS idx_company_profiles_is_claimed ON company_profiles(is_claimed);
CREATE INDEX IF NOT EXISTS idx_company_profiles_company_name ON company_profiles(company_name);
CREATE INDEX IF NOT EXISTS idx_company_profiles_slug ON company_profiles(slug);

-- Allow anyone to read company_profiles (public directory)
DROP POLICY IF EXISTS "Public can view company_profiles" ON company_profiles;
CREATE POLICY "Public can view company_profiles"
  ON company_profiles FOR SELECT USING (true);

-- Owners can update their own company
DROP POLICY IF EXISTS "Owner can update company" ON company_profiles;
CREATE POLICY "Owner can update company"
  ON company_profiles FOR UPDATE
  USING (auth.uid() = owner_id OR auth.uid() = claimed_by);

-- Service role can insert (for seeding)
-- (Service role bypasses RLS automatically)

COMMENT ON COLUMN company_profiles.is_claimed IS 'False = unclaimed directory entry, True = owned by a user';
COMMENT ON COLUMN company_profiles.source IS 'Origin of the record: tsv_import, manual, signup';
COMMENT ON COLUMN company_profiles.slug IS 'URL slug e.g. algonquin-products for /directory/algonquin-products';
