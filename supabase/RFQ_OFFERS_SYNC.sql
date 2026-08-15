-- ════════════════════════════════════════════════════════════════════
-- RFQ_OFFERS_SYNC.sql
-- Re-defines submit_rfq_offer to match the LIVE rfq_offers table schema
-- (id, rfq_id, vendor_id, client_id, conversation_id, message_id, amount,
--  timeline, terms, notes, status, accepted_at, rejected_at, created_at, updated_at).
--
-- The previously deployed submit_rfq_offer() had drifted from every SQL
-- file committed in this repo (different params, no token spend, returned
-- a bare UUID instead of jsonb). This migration replaces ALL overloads of
-- submit_rfq_offer with one canonical, token-gated version.
--
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to run multiple times (idempotent).
-- ════════════════════════════════════════════════════════════════════

-- Drop every existing overload of submit_rfq_offer, regardless of signature.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT oid::regprocedure AS sig FROM pg_proc WHERE proname = 'submit_rfq_offer'
  LOOP
    EXECUTE 'DROP FUNCTION ' || r.sig || ' CASCADE';
  END LOOP;
END $$;

CREATE FUNCTION public.submit_rfq_offer(
  p_rfq_id    UUID,
  p_vendor_id UUID,
  p_amount    NUMERIC,
  p_notes     TEXT DEFAULT NULL,
  p_timeline  TEXT DEFAULT NULL,
  p_terms     TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_rfq        RECORD;
  v_offer_id   UUID;
  v_spend      TEXT;
BEGIN
  SELECT id, client_id, title, status INTO v_rfq FROM public.rfqs WHERE id = p_rfq_id;

  IF v_rfq.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'RFQ not found');
  END IF;

  IF v_rfq.status != 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'RFQ is no longer open');
  END IF;

  IF v_rfq.client_id = p_vendor_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'You cannot bid on your own RFQ');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.rfq_offers
    WHERE rfq_id = p_rfq_id AND vendor_id = p_vendor_id AND status = 'pending'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already have a pending offer on this RFQ');
  END IF;

  v_spend := public.spend_tokens(p_vendor_id, 50, 'Offer on RFQ: ' || v_rfq.title, p_rfq_id);

  IF v_spend = 'insufficient_tokens' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient tokens. You need 50 tokens to submit an offer.');
  END IF;

  INSERT INTO public.rfq_offers (rfq_id, vendor_id, client_id, amount, notes, timeline, terms)
  VALUES (p_rfq_id, p_vendor_id, v_rfq.client_id, p_amount, p_notes, p_timeline, p_terms)
  RETURNING id INTO v_offer_id;

  RETURN jsonb_build_object('success', true, 'offer_id', v_offer_id);
END;
$$;
