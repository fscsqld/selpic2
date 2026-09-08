/**
 * Optional Supabase table for Site Review (Phase later).
 * Default S1 path uses site_configs key `agent_site_review_reports` (same pattern as agent_openai_runs).
 * Run only if you prefer a dedicated table instead of the JSON blob.
 */

/*
-- Optional; not required for S0/S1 blob store.
create table if not exists public.agent_site_review_reports (
  id text primary key,
  period_key text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists agent_site_review_reports_period_idx
  on public.agent_site_review_reports (period_key);
*/
