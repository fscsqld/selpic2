-- Storefront daily traffic (anonymous pageviews / unique visitors).
-- Run once in Supabase SQL Editor (same project as newsletter / contact_messages).
-- APIs use the service role; RLS blocks anon/authenticated direct table access.

create table if not exists public.site_pageviews (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null,
  day date not null,
  path text not null default '/',
  referrer text,
  created_at timestamptz not null default now()
);

create index if not exists site_pageviews_day_idx
  on public.site_pageviews (day desc);

create index if not exists site_pageviews_day_visitor_idx
  on public.site_pageviews (day, visitor_id);

create index if not exists site_pageviews_created_at_idx
  on public.site_pageviews (created_at desc);

alter table public.site_pageviews enable row level security;

grant select, insert, update, delete on table public.site_pageviews to service_role;

-- Quick checks:
-- select day, count(*) as pageviews, count(distinct visitor_id) as unique_visitors
-- from public.site_pageviews
-- group by day
-- order by day desc
-- limit 14;
