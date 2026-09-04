-- SELPIC Fundraising AI Agent — outreach reply queue (reply & conversion loop).
-- Run in Supabase SQL Editor after fundraising_outreach_targets exists.
-- Stores inbound replies to outreach mail (separate from CS agent inbound).

create table if not exists public.fundraising_outreach_replies (
  id text primary key,
  from_email text not null,
  target_id text,
  organization_name text,
  subject text not null default '',
  excerpt text not null default '',
  intent text not null default 'other',
  status text not null default 'open',
  message_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  closed_reason text,
  handled_by text,
  admin_note text,
  constraint fundraising_outreach_replies_status_check check (
    status in ('open', 'closed')
  ),
  constraint fundraising_outreach_replies_intent_check check (
    intent in ('unsubscribe', 'interested', 'question', 'not_now', 'wrong_person', 'other')
  )
);

create unique index if not exists fundraising_outreach_replies_message_id_uq
  on public.fundraising_outreach_replies (message_id)
  where message_id is not null;

create index if not exists fundraising_outreach_replies_status_idx
  on public.fundraising_outreach_replies (status, created_at desc);

create index if not exists fundraising_outreach_replies_email_idx
  on public.fundraising_outreach_replies (lower(from_email));

alter table public.fundraising_outreach_replies enable row level security;

do $$
declare
  t text := 'fundraising_outreach_replies';
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
