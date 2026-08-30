-- SELPIC Fundraising AI Agent — outreach targets (Wave 1 / Step A1).
-- Run in Supabase SQL Editor after core fundraising tables exist.
-- Service role (Next.js admin client) writes; RLS mirrors other fundraising_* tables.
--
-- v1 does NOT auto-scrape schools or auto-blast daily mail.
-- Targets are created by admin (A2) or future licensed imports; send is A3.

create table if not exists public.fundraising_outreach_targets (
  id text primary key,
  organization_name text not null default '',
  contact_email text,
  contact_name text,
  org_type text,
  state text,
  status text not null default 'PENDING',
  last_sent_at timestamptz,
  last_error text,
  converted_partner_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fundraising_outreach_targets_status_check check (
    status in ('PENDING', 'CONTACTED', 'CONVERTED', 'FAILED', 'OPTED_OUT')
  )
);

create index if not exists fundraising_outreach_targets_status_idx
  on public.fundraising_outreach_targets (status);

create index if not exists fundraising_outreach_targets_email_idx
  on public.fundraising_outreach_targets (lower(contact_email));

alter table public.fundraising_outreach_targets enable row level security;

do $$
declare
  t text := 'fundraising_outreach_targets';
begin
  execute format('drop policy if exists "%s_admin_all" on public.%I', t, t);
  execute format(
    'create policy "%s_admin_all" on public.%I for all to authenticated using (
      (auth.jwt() -> ''app_metadata'' ->> ''role'') in (''admin'', ''super_admin'')
      or coalesce((auth.jwt() -> ''app_metadata'' ->> ''admin'')::boolean, false) = true
      or (auth.jwt() -> ''user_metadata'' ->> ''role'') in (''admin'', ''super_admin'')
      or coalesce((auth.jwt() -> ''user_metadata'' ->> ''admin'')::boolean, false) = true
    ) with check (
      (auth.jwt() -> ''app_metadata'' ->> ''role'') in (''admin'', ''super_admin'')
      or coalesce((auth.jwt() -> ''app_metadata'' ->> ''admin'')::boolean, false) = true
      or (auth.jwt() -> ''user_metadata'' ->> ''role'') in (''admin'', ''super_admin'')
      or coalesce((auth.jwt() -> ''user_metadata'' ->> ''admin'')::boolean, false) = true
    )',
    t,
    t
  );
  execute format('grant select, insert, update, delete on table public.%I to authenticated, service_role', t);
end $$;
