-- SELPIC — explicit Data API (PostgREST) grants for Supabase policy change.
-- See: https://supabase.com/docs/guides/api/postgres-roles (and account email re May/Oct 2026 defaults)
--
-- Each GRANT runs only if the table exists (avoids errors when 002 or site_configs was not applied yet).
--
-- Principles used here (match this repo’s code):
--   • Server routes use getSupabaseAdmin() (= service_role) for orders, admin registry, Etsy tokens,
--     newsletter, contact, community admin, game promos, etc. → those tables get DML to service_role only.
--   • public.site_configs has RLS policies for anon + authenticated (storefront + CMS) → grant those roles too.
--   • Do NOT grant broad anon/authenticated on orders or other server-only tables; RLS has no public policies.
--
-- Re-run: safe (GRANT is idempotent).

-- Schema visibility for PostgREST
grant usage on schema public to anon, authenticated, service_role;

-- All table grants: skip missing tables (e.g. admin_email_registry until 002_admin_email_registry.sql is applied)
do $$
begin
  -- Core migrations (001_orders, 002_admin_email_registry, site_configs)
  if to_regclass('public.orders') is not null then
    execute 'grant select, insert, update, delete on table public.orders to service_role';
  end if;

  if to_regclass('public.admin_email_registry') is not null then
    execute 'grant select, insert, update, delete on table public.admin_email_registry to service_role';
  end if;

  if to_regclass('public.site_configs') is not null then
    execute 'grant select, insert, update, delete on table public.site_configs to service_role';
    execute 'grant select, insert, update, delete on table public.site_configs to anon, authenticated';
  end if;

  -- Etsy OAuth token store (docs/etsy-oauth-supabase.sql)
  if to_regclass('public.etsy_oauth_connection') is not null then
    execute 'grant select, insert, update, delete on table public.etsy_oauth_connection to service_role';
  end if;

  -- Community (docs/community-supabase.sql) — RLS on, APIs use service role
  if to_regclass('public.community_categories') is not null then
    execute 'grant select, insert, update, delete on table public.community_categories to service_role';
  end if;
  if to_regclass('public.community_posts') is not null then
    execute 'grant select, insert, update, delete on table public.community_posts to service_role';
  end if;
  if to_regclass('public.community_comments') is not null then
    execute 'grant select, insert, update, delete on table public.community_comments to service_role';
  end if;

  -- Newsletter (docs/newsletter-supabase.sql)
  if to_regclass('public.newsletter_subscribers') is not null then
    execute 'grant select, insert, update, delete on table public.newsletter_subscribers to service_role';
  end if;
  if to_regclass('public.newsletter_campaigns') is not null then
    execute 'grant select, insert, update, delete on table public.newsletter_campaigns to service_role';
  end if;

  -- Contact (docs/contact-messages-supabase.sql)
  if to_regclass('public.contact_messages') is not null then
    execute 'grant select, insert, update, delete on table public.contact_messages to service_role';
  end if;
  if to_regclass('public.contact_message_emails') is not null then
    execute 'grant select, insert, update, delete on table public.contact_message_emails to service_role';
  end if;

  -- Game promo (docs/game-promo-codes-supabase.sql)
  if to_regclass('public.game_promo_registrations') is not null then
    execute 'grant select, insert, update, delete on table public.game_promo_registrations to service_role';
  end if;

  -- Supabase Auth “profiles” in public (if you use the template table)
  if to_regclass('public.profiles') is not null then
    execute 'grant select, insert, update, delete on table public.profiles to service_role';
  end if;
end $$;
