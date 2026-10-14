-- ════════════════════════════════════════════════════════════════════
-- OUTREACH_EMAIL_LOG.sql
-- Tracks every cold-outreach email sent from the admin directory,
-- so we never send the same template to the same company twice.
--
-- Run in: Supabase Dashboard → SQL Editor. Safe to re-run.
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.outreach_email_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  to_email     TEXT NOT NULL,
  subject      TEXT NOT NULL,
  template_key TEXT,                -- e.g. 'cold_intro', 'follow_up'
  sent_by      UUID REFERENCES auth.users(id),
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_email_log_company
  ON public.outreach_email_log (company_id);

-- One row per (company_id, template_key) keeps dedupe simple: a company
-- gets each template at most once.
CREATE UNIQUE INDEX IF NOT EXISTS uq_outreach_email_company_template
  ON public.outreach_email_log (company_id, template_key);

-- RLS: super admins only (server routes use the service role, which bypasses).
ALTER TABLE public.outreach_email_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read outreach email log" ON public.outreach_email_log;
CREATE POLICY "Admins can read outreach email log"
  ON public.outreach_email_log FOR SELECT
  USING (public.is_admin(auth.uid()));