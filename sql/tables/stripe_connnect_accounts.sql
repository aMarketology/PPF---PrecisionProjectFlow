create table public.stripe_connect_accounts (
  id uuid not null default gen_random_uuid (),
  company_id uuid null,
  stripe_account_id text not null,
  charges_enabled boolean null default false,
  payouts_enabled boolean null default false,
  details_submitted boolean null default false,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint stripe_connect_accounts_pkey primary key (id),
  constraint stripe_connect_accounts_company_id_key unique (company_id),
  constraint stripe_connect_accounts_stripe_account_id_key unique (stripe_account_id),
  constraint stripe_connect_accounts_company_id_fkey foreign KEY (company_id) references company_profiles (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_stripe_company on public.stripe_connect_accounts using btree (company_id) TABLESPACE pg_default;