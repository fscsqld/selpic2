-- Partner Lookup change requests (intake queue for SELPIC admins).
-- Run in Supabase SQL Editor after docs/fundraising-supabase.sql.

create table if not exists public.fundraising_change_requests (
  id text primary key,
  partner_id text not null,
  status text not null default 'submitted',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fundraising_change_requests_partner_idx
  on public.fundraising_change_requests (partner_id, updated_at desc);

create index if not exists fundraising_change_requests_status_idx
  on public.fundraising_change_requests (status, updated_at desc);

alter table public.fundraising_change_requests enable row level security;

drop policy if exists "fundraising_change_requests_admin_all" on public.fundraising_change_requests;
create policy "fundraising_change_requests_admin_all" on public.fundraising_change_requests
  for all to authenticated using (
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'super_admin')
    or coalesce((auth.jwt() -> 'app_metadata' ->> 'admin')::boolean, false) = true
    or (auth.jwt() -> 'user_metadata' ->> 'role') in ('admin', 'super_admin')
    or coalesce((auth.jwt() -> 'user_metadata' ->> 'admin')::boolean, false) = true
  ) with check (
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'super_admin')
    or coalesce((auth.jwt() -> 'app_metadata' ->> 'admin')::boolean, false) = true
    or (auth.jwt() -> 'user_metadata' ->> 'role') in ('admin', 'super_admin')
    or coalesce((auth.jwt() -> 'user_metadata' ->> 'admin')::boolean, false) = true
  );

grant select, insert, update, delete on table public.fundraising_change_requests to authenticated, service_role;
