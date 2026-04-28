-- ─────────────────────────────────────────────────────────────────────────────
-- ADD is_admin COLUMN TO PROFILES
-- Run this once in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ifrxzmemiihxfdimwvcw/sql/new
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Mark max@amarketology.com as admin
UPDATE public.profiles
SET is_admin = TRUE
WHERE email = 'max@amarketology.com';

-- Verify
SELECT id, full_name, email, user_type, is_admin
FROM public.profiles
WHERE is_admin = TRUE;
