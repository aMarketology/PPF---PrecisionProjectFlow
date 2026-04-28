-- ============================================================
-- RFQ (Request for Quote) table
-- Run this in Supabase SQL Editor
-- ============================================================

create table if not exists public.rfqs (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references public.profiles(id) on delete cascade,
  title             text not null,
  category          text not null,
  description       text not null,
  quantity          text,
  budget            text,
  timeline          text,
  location          text,
  attachment_urls   text[] default '{}',
  status            text not null default 'open'
                      check (status in ('open', 'in_review', 'awarded', 'closed')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- RLS
alter table public.rfqs enable row level security;

-- Anyone authenticated can read open RFQs
create policy "Engineers can view open RFQs"
  on public.rfqs for select
  using (auth.role() = 'authenticated');

-- Only the owner can insert their own RFQ
create policy "Clients can create RFQs"
  on public.rfqs for insert
  with check (auth.uid() = client_id);

-- Only the owner can update their own RFQ
create policy "Clients can update their RFQs"
  on public.rfqs for update
  using (auth.uid() = client_id);

-- Auto-update updated_at
create or replace function public.rfqs_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists rfqs_updated_at_trigger on public.rfqs;
create trigger rfqs_updated_at_trigger
  before update on public.rfqs
  for each row execute function public.rfqs_updated_at();
