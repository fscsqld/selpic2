-- =============================================================================
-- COPY THIS ENTIRE FILE → Supabase Dashboard → SQL Editor → New query → Run
-- Do NOT paste app/admin/bespoke-requests/page.tsx (that is React, not SQL).
-- Safe to run more than once (uses IF NOT EXISTS / IF NOT EXISTS columns).
-- =============================================================================

create table if not exists public.bespoke_sticker_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'new',
  payload jsonb not null default '{}'::jsonb,
  logo_file_url text,
  logo_mime_type text,
  logo_original_name text,
  logo_size int,
  logo_storage_path text
);

create index if not exists bespoke_sticker_requests_created_at_idx
  on public.bespoke_sticker_requests (created_at desc);

create index if not exists bespoke_sticker_requests_status_idx
  on public.bespoke_sticker_requests (status);

alter table public.bespoke_sticker_requests enable row level security;

alter table public.bespoke_sticker_requests
  add column if not exists replied_at timestamptz;

create table if not exists public.bespoke_request_emails (
  id uuid primary key default gen_random_uuid(),
  bespoke_request_id uuid not null references public.bespoke_sticker_requests(id) on delete cascade,
  to_email text not null,
  subject text not null,
  content_text text,
  html text,
  status text not null default 'sent',
  template_used text,
  attachments text,
  sent_by uuid,
  sent_at timestamptz not null default now()
);

create index if not exists bespoke_request_emails_request_id_idx
  on public.bespoke_request_emails (bespoke_request_id, sent_at desc);

alter table public.bespoke_request_emails enable row level security;

-- Verify (optional — should return 0 rows, no error):
-- select count(*) from public.bespoke_sticker_requests;
-- select count(*) from public.bespoke_request_emails;
