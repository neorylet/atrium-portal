-- 1. Ensure the client role has permission to use the storage schema
GRANT USAGE ON SCHEMA storage TO client;
GRANT SELECT ON storage.objects TO client;

-- 2. Drop the insecure policy from 2025
DROP POLICY IF EXISTS storage_client_select ON storage.objects;

-- 3. Create a secure policy that checks the folder name
CREATE POLICY storage_client_select ON storage.objects
  FOR SELECT TO authenticated, client, "x-admin"
  USING (
    bucket_id = 'deliverable-files' 
    AND (
      -- Admins can see everything
      (select auth.jwt() -> 'app_metadata' ->> 'role') = 'x-admin'
      -- Clients can ONLY see files inside their org's specific folder
      OR (storage.foldername(name))[1] = (select auth.jwt() -> 'app_metadata' ->> 'org_id')
    )
  );