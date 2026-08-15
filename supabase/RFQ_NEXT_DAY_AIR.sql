ALTER TABLE public.rfqs
  ADD COLUMN IF NOT EXISTS is_next_day_air BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.rfqs.is_next_day_air IS
  'Buyer requests Next Day Air shipping; independent from expedited ASAP production.';