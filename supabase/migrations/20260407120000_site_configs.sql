-- Site-wide CMS payload (hero, categories, footer copy, etc.) — shared by all visitors.
-- Run in Supabase SQL Editor or: supabase db push

create table if not exists public.site_configs (
  id uuid primary key default gen_random_uuid(),
  config_key text not null unique,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists site_configs_config_key_idx on public.site_configs (config_key);

comment on table public.site_configs is 'Storefront CMS blobs keyed by config_key; value holds JSON (contentItems, heroSlides, etc.).';

alter table public.site_configs enable row level security;

-- Public read (homepage + admin UI need latest config without login)
create policy "site_configs_select_public"
  on public.site_configs
  for select
  to anon, authenticated
  using (true);

-- Writes: WARNING — open to anyone with the anon key. Prefer tightening to authenticated only
-- or using the app API route with the service role instead of direct client writes.
create policy "site_configs_insert_open"
  on public.site_configs
  for insert
  to anon, authenticated
  with check (true);

create policy "site_configs_update_open"
  on public.site_configs
  for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "site_configs_delete_open"
  on public.site_configs
  for delete
  to anon, authenticated
  using (true);
