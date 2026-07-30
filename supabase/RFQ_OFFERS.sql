-- ════════════════════════════════════════════════════════════════════
-- RFQ_OFFERS.sql
-- Vendors submit offers (bids) on open RFQs. Clients review & accept.
--
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to run multiple times (idempotent).
-- ════════════════════════════════════════════════════════════════════

-- ── 1. rfq_offers table ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rfq_offers (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id          UUID        NOT NULL REFERENCES public.rfqs(id) ON DELETE CASCADE,
  vendor_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount          DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  note            TEXT,
  status          TEXT        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rfq_offers_rfq    ON public.rfq_offers(rfq_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rfq_offers_vendor  ON public.rfq_offers(vendor_id);
CREATE INDEX IF NOT EXISTS idx_rfq_offers_status  ON public.rfq_offers(rfq_id, status);

-- RLS
ALTER TABLE public.rfq_offers ENABLE ROW LEVEL SECURITY;

-- Vendors can view offers on RFQs (to see competition)
DROP POLICY IF EXISTS "Anyone can view offers on RFQs" ON public.rfq_offers;
CREATE POLICY "Anyone can view offers on RFQs"
  ON public.rfq_offers FOR SELECT
  USING (auth.role() = 'authenticated');

-- Vendors can insert their own offers
DROP POLICY IF EXISTS "Vendors can create their own offers" ON public.rfq_offers;
CREATE POLICY "Vendors can create their own offers"
  ON public.rfq_offers FOR INSERT
  WITH CHECK (
    auth.uid() = vendor_id
    AND EXISTS (SELECT 1 FROM public.rfqs WHERE id = rfq_id AND status = 'open')
  );

-- Vendors can update their own pending offers
DROP POLICY IF EXISTS "Vendors can update their own pending offers" ON public.rfq_offers;
CREATE POLICY "Vendors can update their own pending offers"
  ON public.rfq_offers FOR UPDATE
  USING (auth.uid() = vendor_id AND status = 'pending');

-- ── 2. Auto-update updated_at ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rfq_offers_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rfq_offers_updated_at ON public.rfq_offers;
CREATE TRIGGER trg_rfq_offers_updated_at
  BEFORE UPDATE ON public.rfq_offers
  FOR EACH ROW EXECUTE FUNCTION public.rfq_offers_updated_at();

-- ── 3. Log offers to blockchain ledger ────────────────────────────
-- When an offer is created, log it as a site_activity
CREATE OR REPLACE FUNCTION public.log_rfq_offer_activity()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_rfq_title TEXT;
  v_summary   TEXT;
BEGIN
  SELECT title INTO v_rfq_title FROM public.rfqs WHERE id = NEW.rfq_id;
  v_summary := 'Offer on RFQ: ' || v_rfq_title || ' - $' || NEW.amount;
  PERFORM public.insert_activity(
    'offer_submitted',
    NEW.vendor_id,
    'rfq_offer',
    NEW.id,
    v_summary,
    jsonb_build_object(
      'rfq_id', NEW.rfq_id,
      'rfq_title', v_rfq_title,
      'amount', NEW.amount,
      'status', NEW.status
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_rfq_offer_activity ON public.rfq_offers;
CREATE TRIGGER trg_log_rfq_offer_activity
  AFTER INSERT ON public.rfq_offers
  FOR EACH ROW EXECUTE FUNCTION public.log_rfq_offer_activity();