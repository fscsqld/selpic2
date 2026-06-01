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

-- Recommended security: deny direct client access; use server routes with service role.
alter table public.admin_saved_clients enable row level security;

drop policy if exists "no direct access" on public.admin_saved_clients;
create policy "no direct access"
on public.admin_saved_clients
for all
to public
using (false)
with check (false);

