-- Authoritative admin role/permissions by email (synced to auth.users.app_metadata on login / updates).
-- Run in Supabase SQL editor or via CLI migrate.

create table if not exists public.admin_email_registry (
  email text primary key,
  role text not null default 'admin' check (role in ('admin', 'super_admin')),
  permissions text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_email_registry_active_idx
  on public.admin_email_registry (is_active)
  where is_active = true;

alter table public.admin_email_registry enable row level security;

comment on table public.admin_email_registry is 'SELPIC admin permissions keyed by email; server applies to JWT app_metadata.';
