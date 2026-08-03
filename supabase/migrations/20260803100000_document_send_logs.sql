-- Document send history (invoice/quote/documents) — shared across admin devices.
-- Also available as docs/document-send-logs-supabase.sql for SQL Editor.

create table if not exists public.document_send_logs (
  id text primary key,
  document_type text not null,
  document_number text,
  recipient_email text not null,
  recipient_name text not null default '',
  subject text not null default '',
  content text not null default '',
  sent_at timestamptz not null default now(),
  sent_by text not null default 'Admin',
  status text not null check (status in ('sent', 'failed', 'pending')),
  related_order_id text,
  source text not null default 'other',
  document_snapshot jsonb,
  error_message text,
  resent_from_id text,
  created_at timestamptz not null default now()
);

create index if not exists document_send_logs_sent_at_idx
  on public.document_send_logs (sent_at desc);

create index if not exists document_send_logs_recipient_email_idx
  on public.document_send_logs (lower(recipient_email));

create index if not exists document_send_logs_document_number_idx
  on public.document_send_logs (document_number);

comment on table public.document_send_logs is
  'Admin send history for invoices, quotes, and other documents (Create & Send / Documents).';

alter table public.document_send_logs enable row level security;

-- Same admin JWT checks as admin_saved_clients (cross-device, no service role required).
drop policy if exists "document_send_logs_admin_select" on public.document_send_logs;
create policy "document_send_logs_admin_select"
on public.document_send_logs
for select
to authenticated
using (
  (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'super_admin')
  or coalesce((auth.jwt() -> 'app_metadata' ->> 'admin')::boolean, false) = true
  or (auth.jwt() -> 'user_metadata' ->> 'role') in ('admin', 'super_admin')
  or coalesce((auth.jwt() -> 'user_metadata' ->> 'admin')::boolean, false) = true
);

drop policy if exists "document_send_logs_admin_insert" on public.document_send_logs;
create policy "document_send_logs_admin_insert"
on public.document_send_logs
for insert
to authenticated
with check (
  (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'super_admin')
  or coalesce((auth.jwt() -> 'app_metadata' ->> 'admin')::boolean, false) = true
  or (auth.jwt() -> 'user_metadata' ->> 'role') in ('admin', 'super_admin')
  or coalesce((auth.jwt() -> 'user_metadata' ->> 'admin')::boolean, false) = true
);

drop policy if exists "document_send_logs_admin_update" on public.document_send_logs;
create policy "document_send_logs_admin_update"
on public.document_send_logs
for update
to authenticated
using (
  (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'super_admin')
  or coalesce((auth.jwt() -> 'app_metadata' ->> 'admin')::boolean, false) = true
  or (auth.jwt() -> 'user_metadata' ->> 'role') in ('admin', 'super_admin')
  or coalesce((auth.jwt() -> 'user_metadata' ->> 'admin')::boolean, false) = true
)
with check (
  (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'super_admin')
  or coalesce((auth.jwt() -> 'app_metadata' ->> 'admin')::boolean, false) = true
  or (auth.jwt() -> 'user_metadata' ->> 'role') in ('admin', 'super_admin')
  or coalesce((auth.jwt() -> 'user_metadata' ->> 'admin')::boolean, false) = true
);

drop policy if exists "document_send_logs_admin_delete" on public.document_send_logs;
create policy "document_send_logs_admin_delete"
on public.document_send_logs
for delete
to authenticated
using (
  (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'super_admin')
  or coalesce((auth.jwt() -> 'app_metadata' ->> 'admin')::boolean, false) = true
  or (auth.jwt() -> 'user_metadata' ->> 'role') in ('admin', 'super_admin')
  or coalesce((auth.jwt() -> 'user_metadata' ->> 'admin')::boolean, false) = true
);

grant select, insert, update, delete on table public.document_send_logs to authenticated;
grant select, insert, update, delete on table public.document_send_logs to service_role;
