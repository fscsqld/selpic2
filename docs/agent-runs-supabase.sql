-- Optional dedicated agent_runs table (Phase B2).
-- Current production path uses site_configs key `agent_openai_runs` (no migration required).
-- Run this only if you want a SQL table later for larger history / analytics.
-- APIs today do NOT require this table.

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  sector text not null,
  action text not null,
  kind text not null check (kind in ('chat', 'image')),
  model text not null,
  admin_label text not null default 'unknown',
  prompt_tokens int,
  completion_tokens int,
  total_tokens int,
  image_units int,
  estimated_cost_usd numeric(12, 6) not null default 0,
  ok boolean not null default true
);

create index if not exists agent_runs_created_at_idx on public.agent_runs (created_at desc);
create index if not exists agent_runs_sector_created_idx on public.agent_runs (sector, created_at desc);

alter table public.agent_runs enable row level security;

-- Service role only (same pattern as other admin tables). No anon policies.
