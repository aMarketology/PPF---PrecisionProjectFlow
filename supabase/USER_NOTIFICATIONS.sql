-- ════════════════════════════════════════════════════════════════════
-- USER_NOTIFICATIONS.sql
-- Personal notification inbox for every user, fanned out from the
-- public site_activities ledger.
--
-- The activity feed (/activity) is the global, public, hash-chained
-- ledger. This table is the *personal* view: "which of those events
-- are relevant to ME?" - surfaced by the bell in the top-right corner
-- and the /notifications page.
--
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to run multiple times (idempotent).
-- ════════════════════════════════════════════════════════════════════

-- ── 1. user_notifications table ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL,   -- mirrors site_activities.activity_type
  title       TEXT        NOT NULL,
  body        TEXT,
  link        TEXT,                   -- where clicking the notification goes
  actor_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_id UUID        REFERENCES public.site_activities(id) ON DELETE CASCADE,
  metadata    JSONB       DEFAULT '{}',
  is_read     BOOLEAN     NOT NULL DEFAULT FALSE,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One notification per user per activity (prevents duplicate fan-out)
  UNIQUE (user_id, activity_id)
);

CREATE INDEX IF NOT EXISTS idx_un_user_created ON public.user_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_un_user_unread  ON public.user_notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_un_activity     ON public.user_notifications(activity_id);

-- ── 2. RLS - users only ever see / mutate their own inbox ──────────
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.user_notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.user_notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.user_notifications;
CREATE POLICY "Users can update their own notifications"
  ON public.user_notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.user_notifications;
CREATE POLICY "Users can delete their own notifications"
  ON public.user_notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Inserts happen only through SECURITY DEFINER triggers / service role.

-- ── 3. Fan-out: site_activities → user_notifications ───────────────
-- Decides WHO should be notified about each ledger event.
-- Takes a site_activities row so it can be reused by both the live
-- trigger and the historical backfill below.
CREATE OR REPLACE FUNCTION public.fanout_activity_notifications(p_activity public.site_activities)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_actor_name TEXT;
  v_recipient  UUID;
  v_title      TEXT;
  v_body       TEXT;
  v_link       TEXT;
  v_rfq_slug   TEXT;
  v_category   TEXT;
BEGIN
  -- Resolve the actor's display name once
  SELECT COALESCE(full_name, 'Someone') INTO v_actor_name
  FROM public.profiles WHERE id = p_activity.actor_id;

  -- ── New RFQ → notify vendors whose services match the category ──
  IF p_activity.activity_type = 'rfq_posted' THEN
    v_category := p_activity.metadata->>'category';
    IF v_category IS NOT NULL THEN
      v_title := 'New RFQ in ' || v_category;
      v_body  := COALESCE(p_activity.metadata->>'title', p_activity.summary);
      v_link  := '/rfq/' || p_activity.target_id::text;
      FOR v_recipient IN
        SELECT DISTINCT s.provider_id
        FROM public.services s
        WHERE s.active = TRUE
          AND s.provider_id IS NOT NULL
          AND s.provider_id <> p_activity.actor_id
          AND (
            s.category = v_category
            OR s.title       ILIKE '%' || v_category || '%'
            OR s.description ILIKE '%' || v_category || '%'
          )
      LOOP
        INSERT INTO public.user_notifications
          (user_id, type, title, body, link, actor_id, activity_id, metadata)
        VALUES
          (v_recipient, 'rfq_posted', v_title, v_body, v_link,
           p_activity.actor_id, p_activity.id, p_activity.metadata)
        ON CONFLICT (user_id, activity_id) DO NOTHING;
      END LOOP;
    END IF;

  -- ── Offer submitted → notify the RFQ owner ──────────────────────
  ELSIF p_activity.activity_type = 'offer_submitted' THEN
    SELECT r.client_id, r.slug INTO v_recipient, v_rfq_slug
    FROM public.rfqs r
    WHERE r.id = (p_activity.metadata->>'rfq_id')::uuid;

    IF v_recipient IS NOT NULL AND v_recipient <> p_activity.actor_id THEN
      INSERT INTO public.user_notifications
        (user_id, type, title, body, link, actor_id, activity_id, metadata)
      VALUES (
        v_recipient, 'offer_submitted',
        v_actor_name || ' submitted an offer',
        COALESCE(p_activity.metadata->>'rfq_title', 'Your RFQ')
          || CASE WHEN p_activity.metadata->>'amount' IS NOT NULL
                  THEN ' - $' || (p_activity.metadata->>'amount') ELSE '' END,
        '/rfq/' || COALESCE(v_rfq_slug, p_activity.metadata->>'rfq_id'),
        p_activity.actor_id, p_activity.id, p_activity.metadata
      )
      ON CONFLICT (user_id, activity_id) DO NOTHING;
    END IF;

  -- ── RFQ awarded → notify every vendor who bid ───────────────────
  ELSIF p_activity.activity_type = 'rfq_awarded' THEN
    SELECT r.slug INTO v_rfq_slug FROM public.rfqs r WHERE r.id = p_activity.target_id;
    FOR v_recipient IN
      SELECT DISTINCT o.vendor_id
      FROM public.rfq_offers o
      WHERE o.rfq_id = p_activity.target_id
        AND o.vendor_id <> p_activity.actor_id
    LOOP
      INSERT INTO public.user_notifications
        (user_id, type, title, body, link, actor_id, activity_id, metadata)
      VALUES (
        v_recipient, 'rfq_awarded',
        'RFQ awarded',
        COALESCE(p_activity.metadata->>'title', p_activity.summary),
        '/rfq/' || COALESCE(v_rfq_slug, p_activity.target_id::text),
        p_activity.actor_id, p_activity.id, p_activity.metadata
      )
      ON CONFLICT (user_id, activity_id) DO NOTHING;
    END LOOP;

  -- ── Order placed → notify the seller company owner ──────────────
  ELSIF p_activity.activity_type = 'order_placed' THEN
    SELECT cp.owner_id INTO v_recipient
    FROM public.product_orders po
    JOIN public.company_profiles cp ON cp.id = po.company_id
    WHERE po.id = p_activity.target_id;

    IF v_recipient IS NOT NULL AND v_recipient <> p_activity.actor_id THEN
      INSERT INTO public.user_notifications
        (user_id, type, title, body, link, actor_id, activity_id, metadata)
      VALUES (
        v_recipient, 'order_placed',
        'New order received',
        COALESCE(p_activity.metadata->>'product_name', 'A new order was placed'),
        '/orders',
        p_activity.actor_id, p_activity.id, p_activity.metadata
      )
      ON CONFLICT (user_id, activity_id) DO NOTHING;
    END IF;

  -- ── Order completed → notify the buyer ──────────────────────────
  ELSIF p_activity.activity_type = 'order_completed' THEN
    SELECT po.buyer_id INTO v_recipient
    FROM public.product_orders po WHERE po.id = p_activity.target_id;

    IF v_recipient IS NOT NULL AND v_recipient <> p_activity.actor_id THEN
      INSERT INTO public.user_notifications
        (user_id, type, title, body, link, actor_id, activity_id, metadata)
      VALUES (
        v_recipient, 'order_completed',
        'Order completed',
        COALESCE(p_activity.metadata->>'product_name', 'Your order is complete'),
        '/orders',
        p_activity.actor_id, p_activity.id, p_activity.metadata
      )
      ON CONFLICT (user_id, activity_id) DO NOTHING;
    END IF;

  -- ── Team member added → notify company owners + admins ──────────
  ELSIF p_activity.activity_type = 'team_member_added' THEN
    FOR v_recipient IN
      SELECT DISTINCT cm.user_id
      FROM public.company_members cm
      WHERE cm.company_id = p_activity.target_id
        AND cm.status = 'active'
        AND cm.role IN ('owner', 'admin')
        AND cm.user_id <> p_activity.actor_id
    LOOP
      INSERT INTO public.user_notifications
        (user_id, type, title, body, link, actor_id, activity_id, metadata)
      VALUES (
        v_recipient, 'team_member_added',
        'New team member',
        COALESCE(p_activity.metadata->>'member_name', 'Someone')
          || ' joined ' || COALESCE(p_activity.metadata->>'company_name', 'your company'),
        '/admin/company',
        p_activity.actor_id, p_activity.id, p_activity.metadata
      )
      ON CONFLICT (user_id, activity_id) DO NOTHING;
    END LOOP;

  -- ── Company joined → notify platform admins ─────────────────────
  ELSIF p_activity.activity_type = 'company_joined' THEN
    FOR v_recipient IN
      SELECT id FROM public.profiles
      WHERE is_admin = TRUE AND id <> p_activity.actor_id
    LOOP
      INSERT INTO public.user_notifications
        (user_id, type, title, body, link, actor_id, activity_id, metadata)
      VALUES (
        v_recipient, 'company_joined',
        'New company joined',
        COALESCE(p_activity.metadata->>'company_name', p_activity.summary),
        '/companies',
        p_activity.actor_id, p_activity.id, p_activity.metadata
      )
      ON CONFLICT (user_id, activity_id) DO NOTHING;
    END LOOP;
  END IF;
END;
$$;

-- Trigger wrapper - fires the fan-out for every new ledger row.
CREATE OR REPLACE FUNCTION public.trg_fanout_activity_notifications()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.fanout_activity_notifications(NEW);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fanout_activity_notifications ON public.site_activities;
CREATE TRIGGER trg_fanout_activity_notifications
  AFTER INSERT ON public.site_activities
  FOR EACH ROW EXECUTE FUNCTION public.trg_fanout_activity_notifications();

-- ── 4. Realtime ────────────────────────────────────────────────────
ALTER TABLE public.user_notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;
  END IF;
END;
$$;

-- ── 5. Backfill from existing ledger ───────────────────────────────
-- Replays the fan-out logic over historical activities so the bell
-- isn't empty on first load. Idempotent via the UNIQUE constraint.
DO $$
DECLARE
  rec public.site_activities;
BEGIN
  FOR rec IN
    SELECT * FROM public.site_activities
    WHERE activity_type IN (
      'rfq_posted', 'offer_submitted', 'rfq_awarded',
      'order_placed', 'order_completed', 'team_member_added', 'company_joined'
    )
    ORDER BY created_at ASC
  LOOP
    PERFORM public.fanout_activity_notifications(rec);
  END LOOP;
END;
$$;
