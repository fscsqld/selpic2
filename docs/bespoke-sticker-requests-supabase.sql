-- Bespoke sticker / label requests (admin dashboard + storefront form).
-- Run once in Supabase SQL Editor (same project as contact_messages).

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

-- APIs use the Supabase service role; RLS blocks anon/authenticated direct table access.

-- Quick checks:
-- select id, status, created_at, payload->'contact'->>'email' as email from public.bespoke_sticker_requests order by created_at desc limit 10;
