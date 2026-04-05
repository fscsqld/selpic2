-- SELPIC: server-side order ledger (Stripe-paid orders). Run in Supabase SQL editor or via CLI.

create table if not exists public.orders (
  id text primary key,
  stripe_checkout_session_id text not null unique,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);

alter table public.orders enable row level security;

-- No policies: only the service role (server) should access this table.
-- Ensure the anon key is never used to read/write here from the browser.

comment on table public.orders is 'Paid orders (Stripe Checkout); payload mirrors OrderRecord JSON.';
