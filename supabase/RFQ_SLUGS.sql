-- ════════════════════════════════════════════════════════════════════
-- RFQ_SLUGS.sql
-- Adds slug column to rfqs for clean URLs like /rfq/hvac-chiller-compressor-8ac9a281
--
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to run multiple times.
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE public.rfqs ADD COLUMN IF NOT EXISTS slug TEXT;

-- Generate slugs for existing RFQs that don't have one
DO $$
DECLARE
  rec RECORD;
  v_slug TEXT;
BEGIN
  FOR rec IN SELECT id, title FROM public.rfqs WHERE slug IS NULL LOOP
    v_slug := lower(regexp_replace(rec.title, '[^a-zA-Z0-9]+', '-', 'g'));
    v_slug := trim(BOTH '-' FROM v_slug);
    v_slug := v_slug || '-' || substring(rec.id::text, 1, 8);
    UPDATE public.rfqs SET slug = v_slug WHERE id = rec.id;
  END LOOP;
END;
$$;

-- Add unique index on slug (non-concurrent for SQL Editor)
DROP INDEX IF EXISTS idx_rfqs_slug;
CREATE UNIQUE INDEX IF NOT EXISTS idx_rfqs_slug ON public.rfqs(slug)
  WHERE slug IS NOT NULL;