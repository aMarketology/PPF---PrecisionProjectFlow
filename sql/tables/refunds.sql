create table public.refunds (
  id uuid not null default gen_random_uuid (),
  order_id uuid not null,
  stripe_refund_id text not null,
  amount numeric(10, 2) not null,
  currency text null default 'usd'::text,
  reason text null,
  status text null default 'pending'::text,
  refunded_at timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  constraint refunds_pkey primary key (id),
  constraint refunds_stripe_refund_id_key unique (stripe_refund_id),
  constraint refunds_order_id_fkey foreign KEY (order_id) references product_orders (id) on delete RESTRICT
) TABLESPACE pg_default;