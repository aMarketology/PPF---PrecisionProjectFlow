-- ════════════════════════════════════════════════════════════════════
-- CONTRACTS_AND_ESCROW.sql
-- Contract system with milestone-based escrow.
--
-- Architecture:
--   contract → links buyer + vendor + payment intent
--   contract_milestones → partial deliverables with escrow releases
--   RPCs → get_contract_summary, can_release_milestone
--
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to run multiple times.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. contracts table ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contracts (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                UUID        REFERENCES public.product_orders(id) ON DELETE SET NULL,
  buyer_id                UUID        NOT NULL REFERENCES public.profiles(id),
  vendor_id               UUID        NOT NULL REFERENCES public.profiles(id),
  title                   TEXT        NOT NULL,
  description             TEXT,
  total_amount            DECIMAL(10,2) NOT NULL CHECK (total_amount > 0),
  platform_fee            DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency                TEXT        DEFAULT 'usd',
  status                  TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN (
                              'draft', 'pending_payment', 'active',
                              'in_progress', 'completed', 'cancelled', 'disputed'
                          )),
  stripe_payment_intent_id TEXT,
  accepted_at             TIMESTAMPTZ,
  started_at              TIMESTAMPTZ,
  completed_at            TIMESTAMPTZ,
  cancelled_at            TIMESTAMPTZ,
  cancelled_by            UUID        REFERENCES public.profiles(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contracts_buyer   ON public.contracts(buyer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_vendor   ON public.contracts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status   ON public.contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_order    ON public.contracts(order_id);
CREATE INDEX IF NOT EXISTS idx_contracts_stripe   ON public.contracts(stripe_payment_intent_id);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- Both parties can read their contracts
DROP POLICY IF EXISTS "Parties can read contracts" ON public.contracts;
CREATE POLICY "Parties can read contracts"
  ON public.contracts FOR SELECT
  USING (buyer_id = auth.uid() OR vendor_id = auth.uid() OR public.is_admin(auth.uid()));

-- Buyer or admin can create contracts
DROP POLICY IF EXISTS "Buyer can create contracts" ON public.contracts;
CREATE POLICY "Buyer can create contracts"
  ON public.contracts FOR INSERT
  WITH CHECK (buyer_id = auth.uid() OR public.is_admin(auth.uid()));

-- Parties can update (status transitions only via RPC)
DROP POLICY IF EXISTS "Parties can update contracts" ON public.contracts;
CREATE POLICY "Parties can update contracts"
  ON public.contracts FOR UPDATE
  USING (buyer_id = auth.uid() OR vendor_id = auth.uid() OR public.is_admin(auth.uid()));

-- ── 2. contract_milestones table ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contract_milestones (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id     UUID        NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  title           TEXT        NOT NULL,
  description     TEXT,
  amount          DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  status          TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN (
                      'pending', 'in_progress', 'delivered', 'released', 'disputed'
                  )),
  due_date        DATE,
  completed_at    TIMESTAMPTZ,
  released_at     TIMESTAMPTZ,
  released_by     UUID        REFERENCES public.profiles(id),
  stripe_transfer_id TEXT,
  sort_order      INTEGER     DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_milestones_contract ON public.contract_milestones(contract_id);
CREATE INDEX IF NOT EXISTS idx_milestones_status   ON public.contract_milestones(status);

ALTER TABLE public.contract_milestones ENABLE ROW LEVEL SECURITY;

-- Parties can read milestones
DROP POLICY IF EXISTS "Parties can read milestones" ON public.contract_milestones;
CREATE POLICY "Parties can read milestones"
  ON public.contract_milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_id AND (c.buyer_id = auth.uid() OR c.vendor_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

-- Buyer can insert (propose) milestones
DROP POLICY IF EXISTS "Buyer can insert milestones" ON public.contract_milestones;
CREATE POLICY "Buyer can insert milestones"
  ON public.contract_milestones FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_id AND c.buyer_id = auth.uid()
    )
  );

-- ── 3. Helper RPCs ──────────────────────────────────────────────────

-- Get contract summary with milestone progress
CREATE OR REPLACE FUNCTION public.get_contract_summary(p_contract_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'contract',
    (SELECT row_to_json(c) FROM public.contracts c WHERE c.id = p_contract_id),
    'milestones',
    (SELECT COALESCE(json_agg(row_to_json(m)), '[]'::json)
     FROM public.contract_milestones m
     WHERE m.contract_id = p_contract_id ORDER BY m.sort_order ASC, m.created_at ASC),
    'summary', json_build_object(
      'total', (SELECT COALESCE(SUM(amount), 0) FROM public.contract_milestones WHERE contract_id = p_contract_id),
      'released', (SELECT COALESCE(SUM(amount), 0) FROM public.contract_milestones WHERE contract_id = p_contract_id AND status = 'released'),
      'pending', (SELECT COALESCE(SUM(amount), 0) FROM public.contract_milestones WHERE contract_id = p_contract_id AND status IN ('pending', 'in_progress', 'delivered')),
      'disputed', (SELECT COALESCE(SUM(amount), 0) FROM public.contract_milestones WHERE contract_id = p_contract_id AND status = 'disputed')
    )
  ) INTO v_result;
  RETURN v_result;
END;
$$;

-- Check if a milestone is ready to be released
CREATE OR REPLACE FUNCTION public.can_release_milestone(p_milestone_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
DECLARE
  v_milestone RECORD;
  v_contract  RECORD;
BEGIN
  SELECT * INTO v_milestone FROM public.contract_milestones WHERE id = p_milestone_id;
  IF NOT FOUND THEN RETURN json_build_object('can_release', FALSE, 'reason', 'Milestone not found'); END IF;

  SELECT * INTO v_contract FROM public.contracts WHERE id = v_milestone.contract_id;
  IF NOT FOUND THEN RETURN json_build_object('can_release', FALSE, 'reason', 'Contract not found'); END IF;

  -- Must be in delivered status to release
  IF v_milestone.status != 'delivered' THEN
    RETURN json_build_object('can_release', FALSE, 'reason', 'Milestone must be marked as delivered first');
  END IF;

  -- Contract must be active or in_progress
  IF v_contract.status NOT IN ('active', 'in_progress') THEN
    RETURN json_build_object('can_release', FALSE, 'reason', 'Contract status: ' || v_contract.status);
  END IF;

  RETURN json_build_object('can_release', TRUE, 'reason', NULL);
END;
$$;

-- Vendor marks a milestone as delivered
CREATE OR REPLACE FUNCTION public.mark_milestone_delivered(
  p_milestone_id UUID,
  p_user_id      UUID DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_contract_id UUID;
  v_caller      UUID;
BEGIN
  v_caller := COALESCE(p_user_id, auth.uid());
  SELECT contract_id INTO v_contract_id FROM public.contract_milestones WHERE id = p_milestone_id;
  IF NOT FOUND THEN RETURN 'error:not_found'; END IF;

  -- Only the vendor can mark delivered
  IF NOT EXISTS (
    SELECT 1 FROM public.contracts WHERE id = v_contract_id AND vendor_id = v_caller
  ) THEN RETURN 'error:not_vendor'; END IF;

  UPDATE public.contract_milestones
  SET status = 'delivered', updated_at = NOW()
  WHERE id = p_milestone_id AND status = 'in_progress';

  RETURN 'delivered';
END;
$$;

-- Buyer releases a delivered milestone
CREATE OR REPLACE FUNCTION public.release_milestone(
  p_milestone_id UUID,
  p_user_id      UUID DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_contract_id UUID;
  v_contract    RECORD;
  v_caller      UUID;
BEGIN
  v_caller := COALESCE(p_user_id, auth.uid());
  SELECT contract_id INTO v_contract_id FROM public.contract_milestones WHERE id = p_milestone_id;
  IF NOT FOUND THEN RETURN 'error:not_found'; END IF;

  SELECT * INTO v_contract FROM public.contracts WHERE id = v_contract_id;

  -- Only the buyer can release
  IF v_contract.buyer_id != v_caller THEN RETURN 'error:not_buyer'; END IF;

  -- Must be in delivered status
  IF NOT EXISTS (
    SELECT 1 FROM public.contract_milestones WHERE id = p_milestone_id AND status = 'delivered'
  ) THEN RETURN 'error:not_delivered'; END IF;

  UPDATE public.contract_milestones
  SET status = 'released', released_at = NOW(), released_by = v_caller, updated_at = NOW()
  WHERE id = p_milestone_id;

  -- If all milestones are released, complete the contract
  IF NOT EXISTS (
    SELECT 1 FROM public.contract_milestones WHERE contract_id = v_contract_id AND status != 'released'
  ) THEN
    UPDATE public.contracts SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = v_contract_id;
  END IF;

  RETURN 'released';
END;
$$;

-- Create a contract from an accepted RFQ offer
CREATE OR REPLACE FUNCTION public.create_contract_from_offer(
  p_order_id     UUID,
  p_buyer_id     UUID,
  p_vendor_id    UUID,
  p_title        TEXT,
  p_description  TEXT DEFAULT NULL,
  p_total_amount DECIMAL DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_contract_id UUID;
  v_amount      DECIMAL;
BEGIN
  v_amount := COALESCE(p_total_amount, 0);
  IF v_amount <= 0 THEN
    -- Try to get amount from the order
    SELECT total_amount INTO v_amount FROM public.product_orders WHERE id = p_order_id;
    IF NOT FOUND OR v_amount <= 0 THEN
      RETURN NULL;
    END IF;
  END IF;

  INSERT INTO public.contracts (
    order_id, buyer_id, vendor_id, title, description,
    total_amount, platform_fee, status
  ) VALUES (
    p_order_id, p_buyer_id, p_vendor_id, p_title, p_description,
    v_amount, ROUND(v_amount * 0.10, 2), 'active'
  ) RETURNING id INTO v_contract_id;

  -- Create a single milestone for the full amount
  INSERT INTO public.contract_milestones (
    contract_id, title, amount, status, due_date
  ) VALUES (
    v_contract_id, p_title, v_amount, 'pending', NULL
  );

  RETURN v_contract_id;
END;
$$;

-- ── 4. Real-time support ────────────────────────────────────────────
ALTER TABLE public.contracts REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'contracts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.contracts;
  END IF;
END $$;