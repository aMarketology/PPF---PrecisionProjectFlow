-- Fix RLS on site_activities so anyone (including anonymous) can read
-- The feed is public data — no auth required for reads
DROP POLICY IF EXISTS "Anyone can view activities" ON public.site_activities;
CREATE POLICY "Anyone can view activities"
  ON public.site_activities FOR SELECT
  USING (true);