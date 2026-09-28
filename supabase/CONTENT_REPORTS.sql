-- ════════════════════════════════════════════════════════════════════
-- CONTENT_REPORTS.sql
-- User-submitted reports about content or accounts (spam, fraud, quality,
-- abuse). Powers the "User Reports" queue on /admin/reports.
--
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to run multiple times (idempotent).
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.content_reports (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type  TEXT        NOT NULL CHECK (target_type IN ('user','service','product','rfq','company','message')),
  target_id    UUID,
  reason       TEXT        NOT NULL CHECK (reason IN ('spam','fraud','quality','abuse','other')),
  description  TEXT,
  status       TEXT        NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','investigating','resolved','dismissed')),
  reviewed_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cr_status   ON public.content_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cr_reporter ON public.content_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_cr_target   ON public.content_reports(target_type, target_id);

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

-- Reporters can see their own submissions
DROP POLICY IF EXISTS "Users can view their own reports" ON public.content_reports;
CREATE POLICY "Users can view their own reports"
  ON public.content_reports FOR SELECT
  USING (auth.uid() = reporter_id);

-- Any signed-in user can file a report
DROP POLICY IF EXISTS "Users can file reports" ON public.content_reports;
CREATE POLICY "Users can file reports"
  ON public.content_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- Admins manage the whole queue
DROP POLICY IF EXISTS "Admins can manage all reports" ON public.content_reports;
CREATE POLICY "Admins can manage all reports"
  ON public.content_reports FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

ALTER TABLE public.content_reports REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'content_reports'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.content_reports;
  END IF;
END;
$$;
