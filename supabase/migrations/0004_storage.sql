-- 0004_storage.sql
insert into storage.buckets (id, name, public) values ('deliverable-files', 'deliverable-files', false) on conflict do nothing;

create policy storage_client_select on storage.objects for select to client
  using ( bucket_id = 'deliverable-files' and (storage.foldername(name))[1] = (select auth.jwt() -> 'app_metadata' ->> 'org_id') );

create policy storage_admin_all on storage.objects for all to "x-admin"
  using ( bucket_id = 'deliverable-files' and (select auth.jwt() ->> 'role') = 'x-admin' )
  with check ( bucket_id = 'deliverable-files' and (select auth.jwt() ->> 'role') = 'x-admin' );

select supasheet.refresh_metadata();