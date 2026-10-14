-- ════════════════════════════════════════════════════════════════════
-- DIRECTORY_NOTES.sql
-- Adds outreach/notes columns to company_profiles for the super-admin
-- company directory workflow.
--
-- Run in: Supabase Dashboard → SQL Editor. Idempotent.
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE public.company_profiles
  ADD COLUMN IF NOT EXISTS notes             TEXT,
  ADD COLUMN IF NOT EXISTS outreach_status   TEXT DEFAULT 'new'
    CHECK (outreach_status IN ('new', 'contacted', 'replied', 'meeting', 'converted', 'dead')),
  ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;

-- Index for filtering by outreach status.
CREATE INDEX IF NOT EXISTS idx_cp_outreach_status ON public.company_profiles(outreach_status);