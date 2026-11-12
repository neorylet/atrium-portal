DROP POLICY IF EXISTS storage_client_select ON storage.objects;

CREATE POLICY storage_client_select ON storage.objects
  FOR SELECT TO authenticated, client, "x-admin"
  USING (
    bucket_id = 'deliverable-files' 
    AND (
      (select auth.jwt() -> 'app_metadata' ->> 'role') = 'x-admin'
      OR (storage.foldername(name))[1] = (select auth.jwt() -> 'app_metadata' ->> 'org_id')
      OR name NOT LIKE '%/%' -- Allows downloading legacy files from the root
    )
  );
