-- ============================================================
-- ADD_ORDER_SHIPPING.sql
-- Adds shipping/tracking fields to product_orders for the
-- deal flow: shipped → delivered → completed.
--
-- Run in Supabase SQL Editor.
-- Safe to run multiple times (idempotent).
-- ============================================================

-- 1. Shipping columns
ALTER TABLE public.product_orders
  ADD COLUMN IF NOT EXISTS shipping_carrier     TEXT,
  ADD COLUMN IF NOT EXISTS shipping_tracking    TEXT,
  ADD COLUMN IF NOT EXISTS shipping_label_url   TEXT,
  ADD COLUMN IF NOT EXISTS shipping_address     JSONB,
  ADD COLUMN IF NOT EXISTS shipped_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS estimated_delivery   DATE;

-- 2. Update the status check constraint to include 'shipped'
--    First drop the old constraint, then re-add with new value.
DO $$
BEGIN
  -- Drop existing check if it exists (name varies, so we find it dynamically)
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name LIKE '%product_orders_status%'
  ) THEN
    ALTER TABLE public.product_orders
      DROP CONSTRAINT product_orders_status_check;
  END IF;

  -- Re-add with 'shipped' included
  ALTER TABLE public.product_orders
    ADD CONSTRAINT product_orders_status_check
    CHECK (status IN (
      'pending_payment',
      'paid',
      'in_progress',
      'shipped',
      'delivered',
      'completed',
      'cancelled',
      'refunded',
      'disputed'
    ));
END;
$$;

-- 3. Indexes for shipping queries
CREATE INDEX IF NOT EXISTS idx_product_orders_status     ON public.product_orders(status);
CREATE INDEX IF NOT EXISTS idx_product_orders_shipped_at ON public.product_orders(shipped_at);