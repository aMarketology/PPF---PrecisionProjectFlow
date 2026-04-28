create table public.stripe_transfers (
  id uuid not null default gen_random_uuid (),
  order_id uuid not null,
  stripe_transfer_id text not null,
  destination_account_id text not null,
  amount numeric(10, 2) not null,
  currency text null default 'usd'::text,
  status text null default 'pending'::text,
  transferred_at timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint stripe_transfers_pkey primary key (id),
  constraint stripe_transfers_stripe_transfer_id_key unique (stripe_transfer_id),
  constraint stripe_transfers_order_id_fkey foreign KEY (order_id) references product_orders (id) on delete RESTRICT
) TABLESPACE pg_default;