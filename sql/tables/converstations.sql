create table public.conversations (
  id uuid not null default gen_random_uuid (),
  created_by uuid null,
  subject text null,
  product_id uuid null,
  order_id uuid null,
  company_id uuid null,
  status text null default 'active'::text,
  last_message_at timestamp with time zone null default now(),
  created_at timestamp with time zone null default now(),
  constraint conversations_pkey primary key (id),
  constraint conversations_created_by_fkey foreign KEY (created_by) references auth.users (id) on delete set null,
  constraint conversations_company_id_fkey foreign KEY (company_id) references company_profiles (id) on delete set null,
  constraint conversations_order_id_fkey foreign KEY (order_id) references product_orders (id) on delete set null,
  constraint conversations_product_id_fkey foreign KEY (product_id) references products (id) on delete set null,
  constraint conversations_status_check check (
    (
      status = any (
        array[
          'active'::text,
          'archived'::text,
          'resolved'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_conversations_created_by on public.conversations using btree (created_by) TABLESPACE pg_default;

create index IF not exists idx_conversations_status on public.conversations using btree (status) TABLESPACE pg_default;

create index IF not exists idx_conversations_last_message on public.conversations using btree (last_message_at desc) TABLESPACE pg_default;

create index IF not exists idx_conversations_product on public.conversations using btree (product_id) TABLESPACE pg_default;

create index IF not exists idx_conversations_order on public.conversations using btree (order_id) TABLESPACE pg_default;

create index IF not exists idx_conversations_company on public.conversations using btree (company_id) TABLESPACE pg_default;