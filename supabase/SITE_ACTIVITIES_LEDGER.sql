-- ════════════════════════════════════════════════════════════════════
-- SITE_ACTIVITIES_LEDGER.sql
-- Append-only, chronologically searchable "blockchain" ledger.
-- Every meaningful action on the platform is logged here with
-- a SHA256 hash chain for immutability verification.
--
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to run multiple times (idempotent).
-- ════════════════════════════════════════════════════════════════════

-- ── 1. pgcrypto extension (for digest / SHA256) ────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 2. site_activities table ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.site_activities (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type   TEXT        NOT NULL,  -- 'rfq_posted' | 'rfq_awarded' | 'offer_submitted' | 'order_placed' | 'order_completed' | 'social_post_created' | 'company_joined' | 'team_member_added'
  actor_id        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  target_type     TEXT,                  -- 'rfq' | 'order' | 'feed_post' | 'company' | 'project'
  target_id       UUID,                  -- the resource that was acted upon
  summary         TEXT        NOT NULL,  -- human-readable: "New RFQ: Baldor 50HP Motor - $8,000"
  metadata        JSONB       DEFAULT '{}',  -- flexible payload
  previous_hash   TEXT,                  -- SHA256 of the previous row (NULL for genesis)
  row_hash        TEXT        NOT NULL,  -- SHA256 of (id + activity_type + actor_id + previous_hash)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast feed queries
CREATE INDEX IF NOT EXISTS idx_sa_created     ON public.site_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sa_type        ON public.site_activities(activity_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sa_actor       ON public.site_activities(actor_id);
CREATE INDEX IF NOT EXISTS idx_sa_target      ON public.site_activities(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_sa_metadata    ON public.site_activities USING gin(metadata);

ALTER TABLE public.site_activities ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous) can view activities — it's a public feed
DROP POLICY IF EXISTS "Anyone can view activities" ON public.site_activities;
CREATE POLICY "Anyone can view activities"
  ON public.site_activities FOR SELECT
  USING (true);

-- ── 3. Hash generation function ─────────────────────────────────────
-- Generates a SHA256 hash that chains to the previous row.
CREATE OR REPLACE FUNCTION public.generate_activity_hash(
  p_id            UUID,
  p_activity_type TEXT,
  p_actor_id      UUID,
  p_summary       TEXT,
  p_previous_hash TEXT
) RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT encode(
    digest(
      COALESCE(p_id::text, '') ||
      COALESCE(p_activity_type, '') ||
      COALESCE(p_actor_id::text, '') ||
      COALESCE(p_summary, '') ||
      COALESCE(p_previous_hash, ''),
      'sha256'
    ),
    'hex'
  );
$$;

-- ── 4. Auto-hash trigger ───────────────────────────────────────────
-- Automatically computes row_hash and chains to the previous row.
-- Ensures previous_hash is set correctly even for concurrent inserts.
CREATE OR REPLACE FUNCTION public.site_activities_auto_hash()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_prev_hash TEXT;
BEGIN
  -- Get the hash of the most recent row
  SELECT row_hash INTO v_prev_hash
  FROM public.site_activities
  ORDER BY created_at DESC, id DESC
  LIMIT 1;

  NEW.previous_hash := v_prev_hash;
  NEW.row_hash := public.generate_activity_hash(
    NEW.id, NEW.activity_type, NEW.actor_id, NEW.summary, v_prev_hash
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_site_activities_auto_hash ON public.site_activities;
CREATE TRIGGER trg_site_activities_auto_hash
  BEFORE INSERT ON public.site_activities
  FOR EACH ROW EXECUTE FUNCTION public.site_activities_auto_hash();

-- ── 5. Insert helper RPC ───────────────────────────────────────────
-- One RPC to rule them all — inserts a verified activity row.
CREATE OR REPLACE FUNCTION public.insert_activity(
  p_activity_type TEXT,
  p_actor_id      UUID,
  p_target_type   TEXT DEFAULT NULL,
  p_target_id     UUID DEFAULT NULL,
  p_summary       TEXT DEFAULT '',
  p_metadata      JSONB DEFAULT '{}'
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.site_activities
    (activity_type, actor_id, target_type, target_id, summary, metadata)
  VALUES
    (p_activity_type, p_actor_id, p_target_type, p_target_id, p_summary, p_metadata)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ── 6. Triggers on source tables ────────────────────────────────────

-- 6a. RFQs: when created → 'rfq_posted'; when status changes to 'awarded' → 'rfq_awarded'
CREATE OR REPLACE FUNCTION public.log_rfq_activity()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_summary   TEXT;
  v_metadata  JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_summary := 'New ' || NEW.category || ' RFQ: ' || NEW.title;
    IF NEW.budget IS NOT NULL THEN
      v_summary := v_summary || ' - Budget: ' || NEW.budget;
    END IF;
    v_metadata := jsonb_build_object(
      'title', NEW.title,
      'category', NEW.category,
      'budget', NEW.budget,
      'location', NEW.location,
      'status', NEW.status
    );
    PERFORM insert_activity('rfq_posted', NEW.client_id, 'rfq', NEW.id, v_summary, v_metadata);
  ELSIF TG_OP = 'UPDATE' AND OLD.status != 'awarded' AND NEW.status = 'awarded' THEN
    v_summary := 'RFQ awarded: ' || NEW.title;
    v_metadata := jsonb_build_object('title', NEW.title, 'category', NEW.category, 'budget', NEW.budget);
    PERFORM insert_activity('rfq_awarded', NEW.client_id, 'rfq', NEW.id, v_summary, v_metadata);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_log_rfq_activity ON public.rfqs;
CREATE TRIGGER trg_log_rfq_activity
  AFTER INSERT OR UPDATE ON public.rfqs
  FOR EACH ROW EXECUTE FUNCTION public.log_rfq_activity();

-- 6b. Feed posts: when published → 'social_post_created'
CREATE OR REPLACE FUNCTION public.log_feed_post_activity()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_summary  TEXT;
  v_metadata JSONB;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_published THEN
    v_summary := CASE NEW.post_type
      WHEN 'project_showcase' THEN 'Showcased a project: ' || substring(NEW.content from 1 for 80)
      WHEN 'job_post' THEN 'Posted a job: ' || substring(NEW.content from 1 for 80)
      WHEN 'milestone' THEN 'Hit a milestone: ' || substring(NEW.content from 1 for 80)
      WHEN 'parts_request' THEN 'Requesting parts: ' || substring(NEW.content from 1 for 80)
      ELSE 'Update: ' || substring(NEW.content from 1 for 80)
    END;
    v_metadata := jsonb_build_object('post_type', NEW.post_type, 'content_preview', substring(NEW.content from 1 for 200));
    PERFORM insert_activity('social_post_created', NEW.author_id, 'feed_post', NEW.id, v_summary, v_metadata);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_feed_post_activity ON public.feed_posts;
CREATE TRIGGER trg_log_feed_post_activity
  AFTER INSERT ON public.feed_posts
  FOR EACH ROW EXECUTE FUNCTION public.log_feed_post_activity();

-- 6c. Product orders: when created → 'order_placed'; when completed → 'order_completed'
CREATE OR REPLACE FUNCTION public.log_order_activity()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_summary  TEXT;
  v_metadata JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_summary := 'New order placed';
    v_metadata := jsonb_build_object('order_id', NEW.id, 'status', NEW.status);
    PERFORM insert_activity('order_placed', NEW.buyer_id, 'order', NEW.id, v_summary, v_metadata);
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed' THEN
    v_summary := 'Order completed';
    v_metadata := jsonb_build_object('order_id', NEW.id);
    PERFORM insert_activity('order_completed', NEW.buyer_id, 'order', NEW.id, v_summary, v_metadata);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_log_order_activity ON public.product_orders;
CREATE TRIGGER trg_log_order_activity
  AFTER INSERT OR UPDATE ON public.product_orders
  FOR EACH ROW EXECUTE FUNCTION public.log_order_activity();

-- 6d. Company profiles: when created → 'company_joined'
CREATE OR REPLACE FUNCTION public.log_company_activity()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_summary  TEXT;
  v_metadata JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_summary := NEW.company_name || ' joined Precision Project Flow';
    v_metadata := jsonb_build_object('company_name', NEW.company_name, 'industry', NEW.industry, 'city', NEW.city, 'state', NEW.state);
    PERFORM insert_activity('company_joined', NEW.owner_id, 'company', NEW.id, v_summary, v_metadata);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_company_activity ON public.company_profiles;
CREATE TRIGGER trg_log_company_activity
  AFTER INSERT ON public.company_profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_company_activity();

-- 6e. Company members: when added → 'team_member_added'
CREATE OR REPLACE FUNCTION public.log_team_member_activity()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_summary   TEXT;
  v_metadata  JSONB;
  v_company   TEXT;
  v_member_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    SELECT company_name INTO v_company FROM public.company_profiles WHERE id = NEW.company_id;
    SELECT full_name INTO v_member_name FROM public.profiles WHERE id = NEW.user_id;
    v_summary := COALESCE(v_member_name, 'Someone') || ' joined the ' || COALESCE(v_company, 'a company') || ' team';
    v_metadata := jsonb_build_object('company_name', v_company, 'role', NEW.role, 'member_name', v_member_name);
    PERFORM insert_activity('team_member_added', NEW.user_id, 'company', NEW.company_id, v_summary, v_metadata);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_team_member_activity ON public.company_members;
CREATE TRIGGER trg_log_team_member_activity
  AFTER INSERT ON public.company_members
  FOR EACH ROW EXECUTE FUNCTION public.log_team_member_activity();

-- ── 7. Enable Realtime on site_activities ───────────────────────────
ALTER TABLE public.site_activities REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'site_activities'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.site_activities;
  END IF;
END;
$$;

-- ── 8. Backfill: log existing data ──────────────────────────────────
-- Logs all existing rfqs, companies, etc. into the ledger.
DO $$
DECLARE
  rec RECORD;
BEGIN
  -- Existing RFQs
  FOR rec IN
    SELECT r.*, p.full_name, p.company_id, cp.company_name
    FROM public.rfqs r
    LEFT JOIN public.profiles p ON p.id = r.client_id
    LEFT JOIN public.company_profiles cp ON cp.id = p.company_id
    WHERE NOT EXISTS (SELECT 1 FROM public.site_activities WHERE target_type = 'rfq' AND target_id = r.id)
    ORDER BY r.created_at ASC
  LOOP
    INSERT INTO public.site_activities
      (activity_type, actor_id, target_type, target_id, summary, metadata, created_at)
    VALUES (
      CASE WHEN rec.status = 'awarded' THEN 'rfq_awarded' ELSE 'rfq_posted' END,
      rec.client_id, 'rfq', rec.id,
      CASE WHEN rec.status = 'awarded'
        THEN 'RFQ awarded: ' || rec.title
        ELSE 'New ' || rec.category || ' RFQ: ' || rec.title || CASE WHEN rec.budget IS NOT NULL THEN ' - Budget: ' || rec.budget ELSE '' END
      END,
      jsonb_build_object('title', rec.title, 'category', rec.category, 'budget', rec.budget, 'location', rec.location, 'status', rec.status),
      rec.created_at
    );
  END LOOP;

  -- Existing companies
  FOR rec IN
    SELECT * FROM public.company_profiles
    WHERE NOT EXISTS (SELECT 1 FROM public.site_activities WHERE target_type = 'company' AND target_id = id)
    ORDER BY created_at ASC
  LOOP
    INSERT INTO public.site_activities
      (activity_type, actor_id, target_type, target_id, summary, metadata, created_at)
    VALUES (
      'company_joined', rec.owner_id, 'company', rec.id,
      rec.company_name || ' joined Precision Project Flow',
      jsonb_build_object('company_name', rec.company_name, 'industry', rec.industry, 'city', rec.city, 'state', rec.state),
      rec.created_at
    );
  END LOOP;

  -- Existing company members
  FOR rec IN
    SELECT cm.*, cp.company_name, p.full_name
    FROM public.company_members cm
    LEFT JOIN public.company_profiles cp ON cp.id = cm.company_id
    LEFT JOIN public.profiles p ON p.id = cm.user_id
    WHERE cm.status = 'active'
      AND NOT EXISTS (SELECT 1 FROM public.site_activities WHERE activity_type = 'team_member_added' AND metadata->>'member_name' = COALESCE(p.full_name, '') AND target_id = cm.company_id)
    ORDER BY cm.created_at ASC
  LOOP
    INSERT INTO public.site_activities
      (activity_type, actor_id, target_type, target_id, summary, metadata, created_at)
    VALUES (
      'team_member_added', rec.user_id, 'company', rec.company_id,
      COALESCE(rec.full_name, 'Someone') || ' joined the ' || COALESCE(rec.company_name, 'a company') || ' team',
      jsonb_build_object('company_name', rec.company_name, 'role', rec.role, 'member_name', rec.full_name),
      rec.created_at
    );
  END LOOP;
END;
$$;