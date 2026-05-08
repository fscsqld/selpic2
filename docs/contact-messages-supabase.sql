-- Create Supabase table for Contact Us submissions
-- Run this in Supabase SQL Editor (Project -> SQL).

-- ✅ If your table already exists but only has (id, name, email),
-- run the ALTER TABLE section below to add missing columns safely.

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  category text not null default 'general',
  status text not null default 'new',
  priority text not null default 'medium',
  admin_notes text,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  replied_at timestamptz
);

create index if not exists contact_messages_created_at_idx on public.contact_messages (created_at desc);

-- Optional: RLS on, but API uses service-role for insert/read.
alter table public.contact_messages enable row level security;

-- ------------------------------------------------------------
-- Optional: store admin replies (Email History) in Supabase
-- ------------------------------------------------------------
create table if not exists public.contact_message_emails (
  id uuid primary key default gen_random_uuid(),
  contact_message_id uuid not null references public.contact_messages(id) on delete cascade,
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

create index if not exists contact_message_emails_message_id_idx
  on public.contact_message_emails (contact_message_id, sent_at desc);

-- ------------------------------------------------------------
-- Migration: add missing columns (safe to run multiple times)
-- ------------------------------------------------------------
alter table public.contact_messages
  add column if not exists subject text;

alter table public.contact_messages
  add column if not exists message text;

alter table public.contact_messages
  add column if not exists category text not null default 'general';

alter table public.contact_messages
  add column if not exists status text not null default 'new';

alter table public.contact_messages
  add column if not exists priority text not null default 'medium';

alter table public.contact_messages
  add column if not exists admin_notes text;

alter table public.contact_messages
  add column if not exists created_at timestamptz not null default now();

alter table public.contact_messages
  add column if not exists read_at timestamptz;

alter table public.contact_messages
  add column if not exists replied_at timestamptz;

-- Backfill for rows created before subject/message existed
update public.contact_messages
  set subject = coalesce(subject, '')
where subject is null;

update public.contact_messages
  set message = coalesce(message, '')
where message is null;

-- Make subject/message required after backfill (optional but recommended)
alter table public.contact_messages
  alter column subject set not null;

alter table public.contact_messages
  alter column message set not null;

-- Quick verification
-- select id, name, email, category, subject, message, created_at from public.contact_messages order by created_at desc limit 5;
-- select contact_message_id, to_email, subject, status, template_used, sent_at from public.contact_message_emails order by sent_at desc limit 10;

