-- SELPIC: multi-platform order ledger (Website, Etsy, future eBay/Amazon).
-- Run after 001_orders.sql. Stripe session id becomes optional for marketplace rows.

alter table public.orders
  alter column stripe_checkout_session_id drop not null;

alter table public.orders
  drop constraint if exists orders_stripe_checkout_session_id_key;

create unique index if not exists orders_stripe_checkout_session_id_uidx
  on public.orders (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

alter table public.orders
  add column if not exists platform_source text not null default 'website';

alter table public.orders
  add column if not exists external_order_key text;

create unique index if not exists orders_external_order_key_uidx
  on public.orders (external_order_key)
  where external_order_key is not null;

create index if not exists orders_platform_source_idx on public.orders (platform_source);

comment on column public.orders.platform_source is 'website | etsy | ebay | amazon — mirrors payload.platformSource.';
comment on column public.orders.external_order_key is 'Stable dedupe key, e.g. etsy:{receipt_id}. Null for legacy website-only Stripe rows.';
