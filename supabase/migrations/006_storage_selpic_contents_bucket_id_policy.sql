-- Optional fix: storage.objects.bucket_id references storage.buckets.id, which may not equal the bucket name.
-- Migration 005 used `bucket_id = 'selpic-contents'`; if the row id differs, authenticated uploads fail RLS.
-- This migration rewrites policies to match by bucket name (safe for all Supabase versions that expose storage.buckets).

begin;

do $sto$
begin
  if not exists (select 1 from pg_namespace where nspname = 'storage') then
    return;
  end if;

  execute 'drop policy if exists "selpic_contents_auth_insert" on storage.objects';
  execute 'drop policy if exists "selpic_contents_auth_update" on storage.objects';
  execute 'drop policy if exists "selpic_contents_auth_delete" on storage.objects';

  execute $p$
    create policy "selpic_contents_auth_insert"
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id in (select id from storage.buckets where name = 'selpic-contents')
      );
  $p$;

  execute $p$
    create policy "selpic_contents_auth_update"
      on storage.objects
      for update
      to authenticated
      using (bucket_id in (select id from storage.buckets where name = 'selpic-contents'))
      with check (bucket_id in (select id from storage.buckets where name = 'selpic-contents'));
  $p$;

  execute $p$
    create policy "selpic_contents_auth_delete"
      on storage.objects
      for delete
      to authenticated
      using (bucket_id in (select id from storage.buckets where name = 'selpic-contents'));
  $p$;
end
$sto$;

commit;
