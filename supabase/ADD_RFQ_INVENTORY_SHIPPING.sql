-- ============================================================
-- ADD_RFQ_INVENTORY_SHIPPING.sql
-- Adds inventory status, lead time, and estimated ship date to RFQs
-- Run in Supabase SQL Editor
-- Safe to run multiple times (uses ADD COLUMN IF NOT EXISTS)
-- ============================================================

-- Inventory status: in_stock | out_of_stock | back_order
ALTER TABLE public.rfqs ADD COLUMN IF NOT EXISTS inventory_status TEXT
  CHECK (inventory_status IS NULL OR inventory_status IN ('in_stock', 'out_of_stock', 'back_order'));

-- Lead time in days (numeric value)
ALTER TABLE public.rfqs ADD COLUMN IF NOT EXISTS lead_time_days INT;

-- Estimated shipping date (calendar date)
ALTER TABLE public.rfqs ADD COLUMN IF NOT EXISTS estimated_ship_date DATE;