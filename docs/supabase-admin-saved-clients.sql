-- Admin Saved Clients (cross-device) for "Create & Send Invoice / Quote"
-- Run this in Supabase SQL Editor.

create table if not exists public.admin_saved_clients (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  category text not null check (category in ('sticker', 'cleaning')),
  billing jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_saved_clients_created_at_idx on public.admin_saved_clients (created_at desc);

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_admin_saved_clients_updated_at on public.admin_saved_clients;
create trigger set_admin_saved_clients_updated_at
before update on public.admin_saved_clients
for each row
execute function public.set_updated_at();

-- Security (RLS): allow only authenticated admin users (cross-device, no service role required).
alter table public.admin_saved_clients enable row level security;

-- Helper: define "admin" based on JWT metadata set by your admin auth flow.
-- Covers common variants used across the app: app_metadata.admin, app_metadata.role, user_metadata.admin, user_metadata.role.
drop policy if exists "admin select" on public.admin_saved_clients;
create policy "admin select"
on public.admin_saved_clients
for select
to authenticated
using (
  (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'super_admin')
  or coalesce((auth.jwt() -> 'app_metadata' ->> 'admin')::boolean, false) = true
  or (auth.jwt() -> 'user_metadata' ->> 'role') in ('admin', 'super_admin')
  or coalesce((auth.jwt() -> 'user_metadata' ->> 'admin')::boolean, false) = true
);

drop policy if exists "admin insert" on public.admin_saved_clients;
create policy "admin insert"
on public.admin_saved_clients
for insert
to authenticated
with check (
  (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'super_admin')
  or coalesce((auth.jwt() -> 'app_metadata' ->> 'admin')::boolean, false) = true
  or (auth.jwt() -> 'user_metadata' ->> 'role') in ('admin', 'super_admin')
  or coalesce((auth.jwt() -> 'user_metadata' ->> 'admin')::boolean, false) = true
);

drop policy if exists "admin delete" on public.admin_saved_clients;
create policy "admin delete"
on public.admin_saved_clients
for delete
to authenticated
using (
  (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'super_admin')
  or coalesce((auth.jwt() -> 'app_metadata' ->> 'admin')::boolean, false) = true
  or (auth.jwt() -> 'user_metadata' ->> 'role') in ('admin', 'super_admin')
  or coalesce((auth.jwt() -> 'user_metadata' ->> 'admin')::boolean, false) = true
);

