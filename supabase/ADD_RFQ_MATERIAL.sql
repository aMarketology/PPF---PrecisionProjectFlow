-- Add material column to rfqs table
ALTER TABLE public.rfqs ADD COLUMN IF NOT EXISTS material TEXT;