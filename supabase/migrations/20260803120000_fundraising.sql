-- SELPIC B2B Fundraising tables (optional cloud sync).
-- Local admin UI also persists via Zustand `fundraising-store`.

create table if not exists public.fundraising_settings (
  id text primary key default 'global',
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.fundraising_partners (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.fundraising_settlements (
  id text primary key,
  partner_id text,
  period text,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.fundraising_documents (
  id text primary key,
  partner_id text,
  doc_type text,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.fundraising_settings enable row level security;
alter table public.fundraising_partners enable row level security;
alter table public.fundraising_settlements enable row level security;
alter table public.fundraising_documents enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'fundraising_settings',
    'fundraising_partners',
    'fundraising_settlements',
    'fundraising_documents'
  ]
  loop
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
  end loop;
end $$;
