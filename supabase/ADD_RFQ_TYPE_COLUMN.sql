-- ============================================================
-- Add rfq_type, nda_required, and is_asap columns to rfqs table
-- ============================================================

alter table if exists public.rfqs
  add column if not exists rfq_type text not null default 'service'
    check (rfq_type in ('product', 'service'));

alter table if exists public.rfqs
  add column if not exists nda_required boolean not null default false;

alter table if exists public.rfqs
  add column if not exists is_asap boolean not null default false;