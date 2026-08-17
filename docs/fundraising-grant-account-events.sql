-- Official Grant Account change + email audit (dispute resolution).
-- Run in Supabase SQL Editor after docs/fundraising-supabase.sql.

create table if not exists public.fundraising_grant_account_events (
  id text primary key,
  partner_id text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists fundraising_grant_account_events_partner_idx
  on public.fundraising_grant_account_events (partner_id, created_at desc);

alter table public.fundraising_grant_account_events enable row level security;

drop policy if exists "fundraising_grant_account_events_admin_all" on public.fundraising_grant_account_events;
create policy "fundraising_grant_account_events_admin_all" on public.fundraising_grant_account_events
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

grant select, insert, update, delete on table public.fundraising_grant_account_events to authenticated, service_role;
