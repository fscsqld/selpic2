-- Hardening follow-up: move `is_registry_staff` off `public` so it is not PostgREST-rpc exposed.
-- Order matters: policies on `site_configs` reference the function, so drop policies before
-- dropping `public.is_registry_staff()`, then create `private.is_registry_staff()`, then recreate policies.
--
-- NON-SQL (Dashboard) — auth_leaked_password_protection: see 005_security_advisor_hardening.sql.

begin;

-- Private schema must exist before creating objects in it.
create schema if not exists private;

comment on schema private is 'Internal SQL helpers; omit from Supabase API "Exposed schemas" to avoid rpc exposure.';

revoke all on schema private from public;
revoke all on schema private from anon;
grant usage on schema private to postgres;
grant usage on schema private to service_role;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------
-- 1) Drop site_configs policies that reference public.is_registry_staff()
-- ---------------------------------------------------------------------------
do $drop_policies$
begin
  if to_regclass('public.site_configs') is null then
    raise notice '006_is_registry_staff_private_schema: no public.site_configs — skipping policy drop/recreate.';
    return;
  end if;

  execute 'drop policy if exists "site_configs_insert_staff" on public.site_configs';
  execute 'drop policy if exists "site_configs_update_staff" on public.site_configs';
  execute 'drop policy if exists "site_configs_delete_staff" on public.site_configs';
end
$drop_policies$;

-- ---------------------------------------------------------------------------
-- 2) Drop public helper (no longer referenced by policies)
-- ---------------------------------------------------------------------------
drop function if exists public.is_registry_staff();

-- ---------------------------------------------------------------------------
-- 3) Create private.is_registry_staff() (SECURITY DEFINER, reads admin_email_registry)
-- ---------------------------------------------------------------------------
do $create_fn$
begin
  if to_regclass('public.admin_email_registry') is null then
    raise notice '006_is_registry_staff_private_schema: public.admin_email_registry missing — skipping function create.';
    return;
  end if;

  execute $fn$
    create or replace function private.is_registry_staff()
    returns boolean
    language sql
    stable
    security definer
    set search_path = public
    as $inner$
      select exists (
        select 1
        from public.admin_email_registry r
        where lower(trim(r.email)) = lower(trim(coalesce((select auth.jwt())->> 'email', '')))
          and r.is_active is true
          and r.role in ('admin', 'super_admin')
      );
    $inner$;
  $fn$;

  execute 'revoke all on function private.is_registry_staff() from public';
  execute 'revoke execute on function private.is_registry_staff() from anon';
  execute 'grant execute on function private.is_registry_staff() to authenticated, service_role';
end
$create_fn$;

-- ---------------------------------------------------------------------------
-- 4) Recreate site_configs policies referencing private.is_registry_staff()
-- ---------------------------------------------------------------------------
do $recreate_policies$
begin
  if to_regclass('public.site_configs') is null then
    return;
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on p.pronamespace = n.oid
    where n.nspname = 'private' and p.proname = 'is_registry_staff'
  ) then
    raise notice '006_is_registry_staff_private_schema: private.is_registry_staff missing — skipping policy recreate.';
    return;
  end if;

  execute $p$
    create policy "site_configs_insert_staff"
      on public.site_configs
      for insert
      to authenticated
      with check (private.is_registry_staff());
  $p$;

  execute $p$
    create policy "site_configs_update_staff"
      on public.site_configs
      for update
      to authenticated
      using (private.is_registry_staff())
      with check (private.is_registry_staff());
  $p$;

  execute $p$
    create policy "site_configs_delete_staff"
      on public.site_configs
      for delete
      to authenticated
      using (private.is_registry_staff());
  $p$;
end
$recreate_policies$;

commit;
