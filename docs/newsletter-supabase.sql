-- Newsletter subscribers & campaign history for Selpic storefront.
-- Run once in Supabase SQL Editor (same project as contact_messages).

-- ------------------------------------------------------------
-- Subscribers (unique email)
-- ------------------------------------------------------------
create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  is_active boolean not null default true,
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  source text default 'website'
);

-- Application stores normalized lowercase emails only.
create unique index if not exists newsletter_subscribers_email_unique_idx
  on public.newsletter_subscribers (email);

alter table public.newsletter_subscribers enable row level security;

-- ------------------------------------------------------------
-- Campaign send history (admin sends from dashboard)
-- ------------------------------------------------------------
create table if not exists public.newsletter_campaigns (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  message text not null,
  type text not null default 'general',
  sent_by text,
  recipient_count int not null default 0,
  success_count int,
  failed_count int,
  status text not null default 'sent',
  sent_at timestamptz not null default now(),
  recipient_ids jsonb
);

create index if not exists newsletter_campaigns_sent_at_idx
  on public.newsletter_campaigns (sent_at desc);

alter table public.newsletter_campaigns enable row level security;

-- APIs use the Supabase service role; RLS blocks anon/authenticated direct table access.

-- Quick checks:
-- select count(*) from public.newsletter_subscribers where is_active = true;
-- select subject, sent_at, recipient_count, status from public.newsletter_campaigns order by sent_at desc limit 5;
