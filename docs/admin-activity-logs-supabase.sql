-- Admin operational + staff activity audit (cross-device for super-admin oversight / disputes).
-- Also available as docs/admin-activity-logs-supabase.sql for SQL Editor.

create table if not exists public.admin_activity_logs (
  id text primary key,
  action text not null,
  performed_by text not null,
  target text,
  occurred_at timestamptz not null default now(),
  ip_address text,
  user_agent text,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_activity_logs_occurred_at_idx
  on public.admin_activity_logs (occurred_at desc);

create index if not exists admin_activity_logs_performed_by_idx
  on public.admin_activity_logs (lower(performed_by));

create index if not exists admin_activity_logs_action_idx
  on public.admin_activity_logs (action);

comment on table public.admin_activity_logs is
  'Shared admin audit trail: staff account events and storefront mutations (products, CMS, media, promos).';

alter table public.admin_activity_logs enable row level security;

drop policy if exists "admin_activity_logs_admin_select" on public.admin_activity_logs;
create policy "admin_activity_logs_admin_select"
on public.admin_activity_logs
for select
to authenticated
using (
  (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'super_admin')
  or coalesce((auth.jwt() -> 'app_metadata' ->> 'admin')::boolean, false) = true
  or (auth.jwt() -> 'user_metadata' ->> 'role') in ('admin', 'super_admin')
  or coalesce((auth.jwt() -> 'user_metadata' ->> 'admin')::boolean, false) = true
);

drop policy if exists "admin_activity_logs_admin_insert" on public.admin_activity_logs;
create policy "admin_activity_logs_admin_insert"
on public.admin_activity_logs
for insert
to authenticated
with check (
  (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'super_admin')
  or coalesce((auth.jwt() -> 'app_metadata' ->> 'admin')::boolean, false) = true
  or (auth.jwt() -> 'user_metadata' ->> 'role') in ('admin', 'super_admin')
  or coalesce((auth.jwt() -> 'user_metadata' ->> 'admin')::boolean, false) = true
);

-- Updates/deletes: super_admin claim only (dispute retention).
drop policy if exists "admin_activity_logs_super_admin_update" on public.admin_activity_logs;
create policy "admin_activity_logs_super_admin_update"
on public.admin_activity_logs
for update
to authenticated
using (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  or (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
)
with check (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  or (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
);

drop policy if exists "admin_activity_logs_super_admin_delete" on public.admin_activity_logs;
create policy "admin_activity_logs_super_admin_delete"
on public.admin_activity_logs
for delete
to authenticated
using (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  or (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
);

grant select, insert, update, delete on table public.admin_activity_logs to authenticated;
grant select, insert, update, delete on table public.admin_activity_logs to service_role;
