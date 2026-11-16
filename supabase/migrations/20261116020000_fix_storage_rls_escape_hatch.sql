-- P1: remove the cross-organisation escape hatch from deliverable storage.
--
-- 20261112020000_fix_storage_rls_backwards_compatible.sql added
-- `OR name NOT LIKE '%/%'`, which let any client read any legacy root-level
-- file in the deliverable-files bucket regardless of org. Folder-scoped
-- access is the only allowed path again.

grant usage on schema storage to client;
grant select on storage.objects to client;

drop policy if exists storage_client_select on storage.objects;

create policy storage_client_select on storage.objects
  for select to authenticated, client, "x-admin"
  using (
    bucket_id = 'deliverable-files'
    and (
      (select auth.jwt() -> 'app_metadata' ->> 'role') = 'x-admin'
      or (storage.foldername(name))[1] = (select auth.jwt() -> 'app_metadata' ->> 'org_id')
    )
  );

-- P2: stop exposing non-public config values to ordinary authenticated users.
drop policy if exists configs_select_authenticated on supasheet.configs;

create policy configs_select_authenticated on supasheet.configs
  for select to authenticated
  using (is_public = true);

-- x-admin inherits authenticated, so keep an explicit admin override for the
-- private configs used by the admin UI.
drop policy if exists configs_select_admin on supasheet.configs;

create policy configs_select_admin on supasheet.configs
  for select to authenticated
  using (pg_has_role(current_user, 'x-admin', 'member'));

select supasheet.refresh_metadata();
