-- ============================================================
-- ADD_RFQ_LINE_ITEMS.sql
-- Adds line_items JSONB column to rfqs table for multi-line RFQs
-- (e.g. a parts list with qty/material/tolerance per line item)
--
-- Shape of each line item:
-- {
--   part:       string   -- Part name / description
--   qty:        number   -- Quantity
--   material:   string   -- Material grade (e.g. 6061-T6 Aluminum)
--   tolerance:  string   -- Tolerance class (e.g. +/-0.005", ISO 2768-mK)
--   finish:     string   -- Surface finish (e.g. Anodized clear, Powder coat)
--   notes:      string   -- Special instructions / drawing ref
-- }
--
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to run multiple times.
-- ============================================================

alter table if exists public.rfqs
  add column if not exists line_items jsonb not null default '[]'::jsonb;

-- Optional index if we ever search inside line items
create index if not exists idx_rfqs_line_items on public.rfqs using gin (line_items);
