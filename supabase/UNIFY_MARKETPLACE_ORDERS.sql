-- ════════════════════════════════════════════════════════════════════
-- UNIFY_MARKETPLACE_ORDERS.sql
-- Single authoritative transaction ledger for every dollar that moves
-- on Precision Project Flow: physical products, services, and approved
-- RFQ/milestone contracts.
--
-- Strategy:
--   1. Create `marketplace_orders` as the parent ledger.
--   2. Backfill existing `orders` (service) + `product_orders`
--      (product) rows into it WITHOUT losing IDs or history.
--   3. Wire RLS so buyers, sellers, and admins read their rows.
--
-- The legacy `orders` and `product_orders` tables are LEFT IN PLACE as
-- historical storage (no code reads them after this migration). New
-- code reads/writes only `marketplace_orders`.
--
-- Run in: Supabase Dashboard → SQL Editor. NOT idempotent on backfill
-- (guarded by a uniqueness check so re-running won't duplicate rows).
-- ════════════════════════════════════════════════════════════════════

-- ── 1. The ledger ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.marketplace_orders (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number            TEXT NOT NULL UNIQUE,
  order_type              TEXT NOT NULL CHECK (order_type IN ('product', 'service', 'rfq_contract')),

  -- Parties (all profile-scoped; company optional for product sellers)
  buyer_id                UUID NOT NULL REFERENCES public.profiles(id),
  seller_id               UUID REFERENCES public.profiles(id),
  seller_company_id       UUID REFERENCES public.company_profiles(id),

  -- Lineage back to the legacy tables (so no history is lost)
  source_table            TEXT,
  source_order_id         UUID,

  -- Money (all in dollars, matching the existing DECIMAL convention)
  subtotal_amount         DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_amount              DECIMAL(12,2) NOT NULL DEFAULT 0,
  shipping_amount         DECIMAL(12,2) NOT NULL DEFAULT 0,
  fee_amount              DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount            DECIMAL(12,2) NOT NULL CHECK (total_amount >= 0),
  currency                TEXT NOT NULL DEFAULT 'usd',

  -- Stripe
  stripe_payment_intent_id TEXT,
  stripe_charge_id         TEXT,
  stripe_account_id        TEXT,          -- connected vendor account

  -- Lifecycle
  status                  TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN (
                              'pending_payment', 'paid', 'in_progress', 'shipped',
                              'delivered', 'completed', 'cancelled', 'refunded', 'disputed'
                          )),
  payout_status           TEXT NOT NULL DEFAULT 'not_held' CHECK (payout_status IN (
                              'not_held', 'held', 'scheduled', 'paid_out', 'clawback'
                          )),
  payout_id               TEXT,          -- Stripe payout reference

  -- Timestamps
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at                 TIMESTAMPTZ,
  released_at             TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mo_buyer          ON public.marketplace_orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_mo_seller         ON public.marketplace_orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_mo_company        ON public.marketplace_orders(seller_company_id);
CREATE INDEX IF NOT EXISTS idx_mo_type           ON public.marketplace_orders(order_type);
CREATE INDEX IF NOT EXISTS idx_mo_status         ON public.marketplace_orders(status);
CREATE INDEX IF NOT EXISTS idx_mo_payout_status  ON public.marketplace_orders(payout_status);
CREATE INDEX IF NOT EXISTS idx_mo_created        ON public.marketplace_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mo_stripe_pi      ON public.marketplace_orders(stripe_payment_intent_id);

ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Buyers and sellers read own orders" ON public.marketplace_orders;
CREATE POLICY "Buyers and sellers read own orders"
  ON public.marketplace_orders FOR SELECT
  USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR public.is_admin(auth.uid()));

-- ── 2. Backfill: service orders (legacy `orders`) ───────────────────
-- Map legacy status → new status.
INSERT INTO public.marketplace_orders (
  order_number, order_type, buyer_id, seller_id, subtotal_amount, fee_amount, total_amount,
  status, source_table, source_order_id, created_at, updated_at
)
SELECT
  'PPF-SVC-' || upper(substr(o.id::text, 1, 8)),
  'service',
  o.client_id,
  o.engineer_id,
  ROUND(o.total_amount * 0.90, 2),
  ROUND(o.total_amount * 0.10, 2),
  o.total_amount,
  CASE o.status
    WHEN 'pending'     THEN 'pending_payment'
    WHEN 'in_progress' THEN 'in_progress'
    WHEN 'completed'   THEN 'completed'
    WHEN 'cancelled'   THEN 'cancelled'
    ELSE 'pending_payment'
  END,
  'orders',
  o.id,
  COALESCE(o.created_at, NOW()),
  NOW()
FROM public.orders o
WHERE NOT EXISTS (
  SELECT 1 FROM public.marketplace_orders mo
  WHERE mo.source_table = 'orders' AND mo.source_order_id = o.id
);

UPDATE public.marketplace_orders
SET order_number = 'PPF-SVC-' || upper(substr(id::text, 1, 8))
WHERE source_table = 'orders' AND (order_number IS NULL OR order_number = '');

-- ── 3. Backfill: product orders (legacy `product_orders`) ───────────
-- seller_id is derived from the owning company's owner_id.
INSERT INTO public.marketplace_orders (
  order_type, buyer_id, seller_id, seller_company_id,
  subtotal_amount, fee_amount, total_amount,
  stripe_payment_intent_id, status,
  source_table, source_order_id, order_number, created_at, updated_at
)
SELECT
  'product',
  po.buyer_id,
  cp.owner_id,
  po.company_id,
  COALESCE(po.total_amount, 0) - COALESCE(po.platform_fee, 0),
  COALESCE(po.platform_fee, 0),
  po.total_amount,
  po.stripe_payment_intent_id,
  COALESCE(po.status, 'paid'),
  'product_orders',
  po.id,
  COALESCE(po.order_number, 'PPF-PRD-' || upper(substr(po.id::text, 1, 8))),
  COALESCE(po.created_at, NOW()),
  NOW()
FROM public.product_orders po
LEFT JOIN public.company_profiles cp ON cp.id = po.company_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.marketplace_orders mo
  WHERE mo.source_table = 'product_orders' AND mo.source_order_id = po.id
);

-- Ensure any product backfill without an order_number gets one.
UPDATE public.marketplace_orders
SET order_number = 'PPF-PRD-' || upper(substr(id::text, 1, 8))
WHERE source_table = 'product_orders' AND (order_number IS NULL OR order_number = '');

-- ── 4. Realtime ─────────────────────────────────────────────────────
ALTER TABLE public.marketplace_orders REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'marketplace_orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace_orders;
  END IF;
END $$;