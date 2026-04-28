create table public.token_purchases (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  tokens integer not null,
  stripe_payment_id text null,
  created_at timestamp with time zone null default now(),
  constraint token_purchases_pkey primary key (id),
  constraint token_purchases_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;