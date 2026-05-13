-- Tetris final-level promo code registrations (server log for admin visibility).
-- Run once in Supabase SQL Editor (same project as newsletter / contact_messages).
-- APIs use the service role; RLS blocks anon/authenticated direct table access.

create table if not exists public.game_promo_registrations (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  source text not null default 'game_level_5',
  score int,
  level int,
  client_ip text,
  created_at timestamptz not null default now()
);

create unique index if not exists game_promo_registrations_code_lower_unique
  on public.game_promo_registrations (lower(trim(code)));

create index if not exists game_promo_registrations_created_at_idx
  on public.game_promo_registrations (created_at desc);

alter table public.game_promo_registrations enable row level security;

-- Quick checks:
-- select code, source, level, score, created_at from public.game_promo_registrations order by created_at desc limit 20;
