-- SELPIC — Security Advisor hardening (RLS + Storage).
-- Apply AFTER: 001_orders, 002_admin_email_registry, 003_orders_multi_platform (optional),
-- 20260407120000_site_configs, and bucket `selpic-contents` exists.
--
-- -----------------------------------------------------------------------------
-- NON-SQL (Supabase Dashboard) — auth_leaked_password_protection
-- -----------------------------------------------------------------------------
-- 1. Open Supabase Dashboard → your project.
-- 2. Go to: Authentication → Providers (or Authentication → Settings, depending on UI version).
-- 3. Find "Password strength" / "Leaked password protection" (HaveIBeenPwned).
-- 4. Enable "Leaked password protection" / "Check passwords against HaveIBeenPwned" and save.
-- Docs: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
--
-- -----------------------------------------------------------------------------
-- BEHAVIOR CHANGES (read before apply)
-- -----------------------------------------------------------------------------
-- • site_configs: anon can SELECT only. INSERT/UPDATE/DELETE require Supabase Auth JWT whose email
--   appears in admin_email_registry with role admin|super_admin and is_active = true.
-- • orders: PostgREST clients using the anon key can no longer INSERT. authenticated may INSERT/SELECT
--   rows where payload.customer.email matches JWT email (server routes use service_role and bypass RLS).
-- • storage.objects: removes broad policies named like Allow-All-Storage-Access%; authenticated may
--   INSERT/UPDATE/DELETE in bucket selpic-contents. Public object URLs still work without listing.
-- -----------------------------------------------------------------------------

begin;

-- ---------------------------------------------------------------------------
-- 1) Helper: staff check against admin_email_registry (SECURITY DEFINER)
-- ---------------------------------------------------------------------------
do $outer$
begin
  if to_regclass('public.admin_email_registry') is not null then
    execute $ddl$
      create or replace function public.is_registry_staff()
      returns boolean
      language sql
      stable
      security definer
      set search_path = public
      as $body$
        select exists (
          select 1
          from public.admin_email_registry r
          where lower(trim(r.email)) = lower(trim(coalesce((select auth.jwt())->> 'email', '')))
            and r.is_active is true
            and r.role in ('admin', 'super_admin')
        );
      $body$;

      revoke all on function public.is_registry_staff() from public;
      grant execute on function public.is_registry_staff() to anon, authenticated, service_role;
    $ddl$;
  end if;
end
$outer$;

-- ---------------------------------------------------------------------------
-- 2) site_configs — public read; writes only for registry staff
-- ---------------------------------------------------------------------------
do $cfg$
begin
  if to_regclass('public.site_configs') is null then
    return;
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on p.pronamespace = n.oid
    where n.nspname = 'public' and p.proname = 'is_registry_staff'
  ) then
    raise notice '005_security_advisor_hardening: skipped site_configs write policies (public.is_registry_staff missing — apply 002 first).';
    return;
  end if;

  execute 'drop policy if exists "Allow all access to site_configs" on public.site_configs';
  execute 'drop policy if exists "site_configs_insert_open" on public.site_configs';
  execute 'drop policy if exists "site_configs_update_open" on public.site_configs';
  execute 'drop policy if exists "site_configs_delete_open" on public.site_configs';
  execute 'drop policy if exists "site_configs_insert_staff" on public.site_configs';
  execute 'drop policy if exists "site_configs_update_staff" on public.site_configs';
  execute 'drop policy if exists "site_configs_delete_staff" on public.site_configs';

  execute $p$
    create policy "site_configs_insert_staff"
      on public.site_configs
      for insert
      to authenticated
      with check (public.is_registry_staff());
  $p$;

  execute $p$
    create policy "site_configs_update_staff"
      on public.site_configs
      for update
      to authenticated
      using (public.is_registry_staff())
      with check (public.is_registry_staff());
  $p$;

  execute $p$
    create policy "site_configs_delete_staff"
      on public.site_configs
      for delete
      to authenticated
      using (public.is_registry_staff());
  $p$;

  -- Open writes from the anonymous role are no longer allowed (CMS must use staff Supabase session).
  execute 'revoke insert, update, delete on table public.site_configs from anon';
end
$cfg$;

-- ---------------------------------------------------------------------------
-- 3) orders — drop permissive policies; authenticated own-row insert/select
-- ---------------------------------------------------------------------------
do $ord$
begin
  if to_regclass('public.orders') is null then
    return;
  end if;

  -- Names from Security Advisor / common presets (extend if your dashboard used other names).
  execute 'drop policy if exists "Allow public insert" on public.orders';
  execute 'drop policy if exists "Allow public read" on public.orders';
  execute 'drop policy if exists "Allow public select" on public.orders';
  execute 'drop policy if exists "Allow public update" on public.orders';
  execute 'drop policy if exists "Allow public delete" on public.orders';
  execute 'drop policy if exists "Enable insert for authenticated users only" on public.orders';
  execute 'drop policy if exists "Enable read access for all users" on public.orders';
  execute 'drop policy if exists "orders_insert_own" on public.orders';
  execute 'drop policy if exists "orders_select_own" on public.orders';

  execute $p$
    create policy "orders_insert_own"
      on public.orders
      for insert
      to authenticated
      with check (
        coalesce(trim(auth.jwt() ->> 'email'), '') <> ''
        and lower(trim(coalesce(payload -> 'customer' ->> 'email', '')))
          = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
      );
  $p$;

  execute $p$
    create policy "orders_select_own"
      on public.orders
      for select
      to authenticated
      using (
        lower(trim(coalesce(payload -> 'customer' ->> 'email', '')))
          = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
      );
  $p$;

  -- Harden role grants: ledger writes from browsers should use authenticated + RLS (not anon).
  execute 'revoke all on table public.orders from anon';
  execute 'grant select, insert on table public.orders to authenticated';
end
$ord$;

-- ---------------------------------------------------------------------------
-- 4) storage.objects — selpic-contents: no broad listing SELECT; auth uploads
-- ---------------------------------------------------------------------------
do $sto$
declare
  pol text;
begin
  if not exists (select 1 from pg_namespace where nspname = 'storage') then
    return;
  end if;

  -- Dashboard-generated names often start with "Allow-All-Storage-Access".
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname like 'Allow-All-Storage-Access%'
  loop
    execute format('drop policy if exists %I on storage.objects', pol);
  end loop;

  execute 'drop policy if exists "selpic_contents_auth_insert" on storage.objects';
  execute 'drop policy if exists "selpic_contents_auth_update" on storage.objects';
  execute 'drop policy if exists "selpic_contents_auth_delete" on storage.objects';

  execute $p$
    create policy "selpic_contents_auth_insert"
      on storage.objects
      for insert
      to authenticated
      with check (bucket_id = 'selpic-contents');
  $p$;

  execute $p$
    create policy "selpic_contents_auth_update"
      on storage.objects
      for update
      to authenticated
      using (bucket_id = 'selpic-contents')
      with check (bucket_id = 'selpic-contents');
  $p$;

  execute $p$
    create policy "selpic_contents_auth_delete"
      on storage.objects
      for delete
      to authenticated
      using (bucket_id = 'selpic-contents');
  $p$;
end
$sto$;

commit;
