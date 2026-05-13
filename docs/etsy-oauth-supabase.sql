-- Etsy OAuth token storage (service role only — no RLS policies; never expose to browser).
-- Run in Supabase SQL editor after reviewing security.

create table if not exists public.etsy_oauth_connection (
  shop_id text primary key,
  shop_name text,
  etsy_user_id text,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.etsy_oauth_connection enable row level security;

comment on table public.etsy_oauth_connection is 'Etsy Open API v3 OAuth tokens per shop; accessed only via Supabase service role on the server.';
