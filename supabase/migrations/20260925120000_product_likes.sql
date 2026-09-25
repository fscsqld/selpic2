-- Product likes: one row per logged-in customer per product (storefront heart).
-- Apply in Supabase SQL Editor or via migration. Service role used by Next APIs.

create table if not exists public.product_likes (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id text not null,
  created_at timestamptz not null default now(),
  constraint product_likes_user_product_unique unique (user_id, product_id)
);

create index if not exists product_likes_product_id_idx
  on public.product_likes (product_id);

create index if not exists product_likes_created_at_idx
  on public.product_likes (created_at desc);

comment on table public.product_likes is
  'Customer product likes (heart). UNIQUE(user_id, product_id) = one like per customer per SKU.';

alter table public.product_likes enable row level security;

-- No direct client policies: storefront uses service-role APIs after session check.
drop policy if exists "product_likes_no_direct" on public.product_likes;

grant select, insert, delete on table public.product_likes to service_role;
grant usage, select on sequence public.product_likes_id_seq to service_role;
