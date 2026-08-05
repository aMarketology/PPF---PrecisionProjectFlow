-- ════════════════════════════════════════════════════════════════════
-- RFQ_TOKEN_SYSTEM.sql
-- Token-gated RFQ offer submission + auto-unlock on acceptance
--
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to run multiple times (idempotent).
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Ensure rfq_offers table exists ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.rfq_offers (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id          UUID        NOT NULL REFERENCES public.rfqs(id) ON DELETE CASCADE,
  vendor_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount          DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  note            TEXT,
  delivery_days   INT,                                          -- estimated delivery in days
  status          TEXT        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rfq_offers_rfq    ON public.rfq_offers(rfq_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rfq_offers_vendor  ON public.rfq_offers(vendor_id);
CREATE INDEX IF NOT EXISTS idx_rfq_offers_status  ON public.rfq_offers(rfq_id, status);

ALTER TABLE public.rfq_offers ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view offers
DROP POLICY IF EXISTS "Anyone can view offers on RFQs" ON public.rfq_offers;
CREATE POLICY "Anyone can view offers on RFQs"
  ON public.rfq_offers FOR SELECT
  USING (true);  -- public read so RFQ detail page works for everyone

-- Vendors can insert their own offers
DROP POLICY IF EXISTS "Vendors can create their own offers" ON public.rfq_offers;
CREATE POLICY "Vendors can create their own offers"
  ON public.rfq_offers FOR INSERT
  WITH CHECK (
    auth.uid() = vendor_id
    AND EXISTS (SELECT 1 FROM public.rfqs WHERE id = rfq_id AND status = 'open')
  );

-- Vendors can update their own pending offers (withdraw)
DROP POLICY IF EXISTS "Vendors can update their own pending offers" ON public.rfq_offers;
CREATE POLICY "Vendors can update their own pending offers"
  ON public.rfq_offers FOR UPDATE
  USING (auth.uid() = vendor_id AND status = 'pending');

-- ── 2. Auto-update trigger ─────────────────────────────────────────
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

-- ── 3. submit_rfq_offer — token-gated offer submission ─────────────
-- Spends 50 tokens from the vendor, inserts the offer.
-- Returns: { success: true, offer_id: uuid } or { success: false, error: text }
CREATE OR REPLACE FUNCTION public.submit_rfq_offer(
  p_rfq_id        UUID,
  p_vendor_id     UUID,
  p_amount        DECIMAL,
  p_note          TEXT DEFAULT NULL,
  p_delivery_days INT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_rfq_status    TEXT;
  v_offer_id      UUID;
  v_spend_result  TEXT;
  v_rfq_title     TEXT;
BEGIN
  -- Verify RFQ exists and is open
  SELECT status, title INTO v_rfq_status, v_rfq_title
    FROM public.rfqs WHERE id = p_rfq_id;
  
  IF v_rfq_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'RFQ not found');
  END IF;
  
  IF v_rfq_status != 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'RFQ is no longer open');
  END IF;

  -- Prevent duplicate offers from same vendor on same RFQ
  IF EXISTS (SELECT 1 FROM public.rfq_offers WHERE rfq_id = p_rfq_id AND vendor_id = p_vendor_id AND status = 'pending') THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already have a pending offer on this RFQ');
  END IF;

  -- Spend 50 tokens
  v_spend_result := public.spend_tokens(
    p_vendor_id,
    50,
    'Offer on RFQ: ' || v_rfq_title,
    p_rfq_id
  );

  IF v_spend_result = 'insufficient_tokens' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient tokens. You need 50 tokens to submit an offer.');
  END IF;

  -- Insert the offer
  INSERT INTO public.rfq_offers (rfq_id, vendor_id, amount, note, delivery_days)
  VALUES (p_rfq_id, p_vendor_id, p_amount, p_note, p_delivery_days)
  RETURNING id INTO v_offer_id;

  RETURN jsonb_build_object('success', true, 'offer_id', v_offer_id);
END;
$$;

-- ── 4. accept_rfq_offer — client accepts, auto-unlocks DM ───────────
-- Sets offer to 'accepted', closes RFQ, unlocks the DM between client & vendor.
-- Returns: { success: true, conversation_id: uuid }
CREATE OR REPLACE FUNCTION public.accept_rfq_offer(
  p_offer_id      UUID,
  p_client_id     UUID
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_offer         RECORD;
  v_rfq           RECORD;
  v_conv_id       UUID;
BEGIN
  -- Fetch offer with RFQ info
  SELECT o.*, r.client_id, r.title
    INTO v_offer
    FROM public.rfq_offers o
    JOIN public.rfqs r ON r.id = o.rfq_id
    WHERE o.id = p_offer_id;

  IF v_offer IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Offer not found');
  END IF;

  -- Only the RFQ client can accept
  IF v_offer.client_id != p_client_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the RFQ owner can accept offers');
  END IF;

  -- Offer must be pending
  IF v_offer.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Offer is no longer pending');
  END IF;

  -- Accept this offer
  UPDATE public.rfq_offers SET status = 'accepted' WHERE id = p_offer_id;

  -- Reject all other pending offers on this RFQ
  UPDATE public.rfq_offers SET status = 'rejected'
    WHERE rfq_id = v_offer.rfq_id AND id != p_offer_id AND status = 'pending';

  -- Mark RFQ as awarded
  UPDATE public.rfqs SET status = 'awarded' WHERE id = v_offer.rfq_id;

  -- Get or create conversation between client and vendor, auto-unlock it
  SELECT id INTO v_conv_id
    FROM public.user_conversations
    WHERE conversation_type = 'direct'
      AND ((participant_one_id = p_client_id AND participant_two_id = v_offer.vendor_id)
        OR (participant_one_id = v_offer.vendor_id AND participant_two_id = p_client_id));

  IF v_conv_id IS NULL THEN
    INSERT INTO public.user_conversations
      (participant_one_id, participant_two_id, conversation_type, is_unlocked, last_message_at)
    VALUES
      (p_client_id, v_offer.vendor_id, 'direct', true, NOW())
    RETURNING id INTO v_conv_id;
  ELSE
    -- Unlock existing conversation
    UPDATE public.user_conversations
      SET is_unlocked = true, last_message_at = NOW()
      WHERE id = v_conv_id;
  END IF;

  -- Send a system message in the conversation
  INSERT INTO public.user_messages
    (conversation_id, sender_id, content, is_system_message)
  VALUES
    (v_conv_id, p_client_id,
     '🎉 **Offer Accepted!** The client accepted your offer of $' || v_offer.amount::TEXT ||
     ' for "' || v_offer.title || '". You can now discuss project details freely.',
     true);

  RETURN jsonb_build_object('success', true, 'conversation_id', v_conv_id);
END;
$$;

-- ── 5. reject_rfq_offer — client rejects an offer ──────────────────
CREATE OR REPLACE FUNCTION public.reject_rfq_offer(
  p_offer_id      UUID,
  p_client_id     UUID
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_rfq_client_id UUID;
BEGIN
  SELECT r.client_id INTO v_rfq_client_id
    FROM public.rfq_offers o
    JOIN public.rfqs r ON r.id = o.rfq_id
    WHERE o.id = p_offer_id;

  IF v_rfq_client_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Offer not found');
  END IF;

  IF v_rfq_client_id != p_client_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the RFQ owner can reject offers');
  END IF;

  UPDATE public.rfq_offers SET status = 'rejected' WHERE id = p_offer_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Offer is no longer pending');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ── 6. withdraw_rfq_offer — vendor withdraws their own offer ────────
CREATE OR REPLACE FUNCTION public.withdraw_rfq_offer(
  p_offer_id      UUID,
  p_vendor_id     UUID
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.rfq_offers SET status = 'withdrawn'
    WHERE id = p_offer_id AND vendor_id = p_vendor_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Offer not found or not pending');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ════════════════════════════════════════════════════════════════════
-- Done. Token-gated RFQ offer system is ready.
-- ════════════════════════════════════════════════════════════════════