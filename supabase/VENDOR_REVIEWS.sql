-- ════════════════════════════════════════════════════════════════════
-- VENDOR_REVIEWS.sql
-- Public vendor/company reviews shown on engineer profiles and company
-- pages. Powers the star rating + review list a buyer sees when they
-- click a vendor on a marketplace listing.
--
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to run multiple times (idempotent).
-- ════════════════════════════════════════════════════════════════════

-- ── 1. vendor_reviews table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vendor_reviews (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id    UUID        REFERENCES public.company_profiles(id) ON DELETE SET NULL,
  reviewer_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_name TEXT,                       -- denormalized display snapshot
  rating        INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title         TEXT,
  body          TEXT,
  service_id    UUID        REFERENCES public.services(id) ON DELETE SET NULL,
  order_id      UUID        REFERENCES public.product_orders(id) ON DELETE SET NULL,
  is_verified   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One review per reviewer per vendor (keeps seeding idempotent)
  UNIQUE (vendor_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_vr_vendor     ON public.vendor_reviews(vendor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vr_company    ON public.vendor_reviews(company_id);
CREATE INDEX IF NOT EXISTS idx_vr_reviewer   ON public.vendor_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_vr_rating     ON public.vendor_reviews(vendor_id, rating);

-- ── 2. RLS ─────────────────────────────────────────────────────────
ALTER TABLE public.vendor_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vendor reviews are public" ON public.vendor_reviews;
CREATE POLICY "Vendor reviews are public"
  ON public.vendor_reviews FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can write their own reviews" ON public.vendor_reviews;
CREATE POLICY "Users can write their own reviews"
  ON public.vendor_reviews FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id);

DROP POLICY IF EXISTS "Users can edit their own reviews" ON public.vendor_reviews;
CREATE POLICY "Users can edit their own reviews"
  ON public.vendor_reviews FOR UPDATE
  USING (auth.uid() = reviewer_id)
  WITH CHECK (auth.uid() = reviewer_id);

DROP POLICY IF EXISTS "Admins can manage all vendor reviews" ON public.vendor_reviews;
CREATE POLICY "Admins can manage all vendor reviews"
  ON public.vendor_reviews FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ── 3. Auto-fill company_id + reviewer_name snapshot ───────────────
CREATE OR REPLACE FUNCTION public.vendor_reviews_before_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    SELECT company_id INTO NEW.company_id FROM public.profiles WHERE id = NEW.vendor_id;
  END IF;
  IF NEW.reviewer_name IS NULL THEN
    SELECT full_name INTO NEW.reviewer_name FROM public.profiles WHERE id = NEW.reviewer_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vendor_reviews_before_insert ON public.vendor_reviews;
CREATE TRIGGER trg_vendor_reviews_before_insert
  BEFORE INSERT ON public.vendor_reviews
  FOR EACH ROW EXECUTE FUNCTION public.vendor_reviews_before_insert();

-- ── 4. Rating aggregate helper ─────────────────────────────────────
-- Returns the average rating and count for a vendor in one call so the
-- profile page can render a live star rating without N+1 queries.
CREATE OR REPLACE FUNCTION public.vendor_rating(p_vendor_id UUID)
RETURNS TABLE (avg_rating NUMERIC, review_count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    ROUND(AVG(rating)::numeric, 1),
    COUNT(*)
  FROM public.vendor_reviews
  WHERE vendor_id = p_vendor_id;
$$;

-- ── 5. Realtime ────────────────────────────────────────────────────
ALTER TABLE public.vendor_reviews REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'vendor_reviews'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vendor_reviews;
  END IF;
END;
$$;
