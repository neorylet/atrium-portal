-- Drop the old policy
DROP POLICY IF EXISTS storage_client_select ON storage.objects;

-- Create the policy for our custom roles
CREATE POLICY storage_client_select ON storage.objects
  FOR SELECT TO authenticated, client, "x-admin"
  USING ( bucket_id = 'deliverable-files' );

-- CRITICAL: Grant the custom 'client' role access to the storage schema and table
GRANT USAGE ON SCHEMA storage TO client;
GRANT SELECT ON storage.objects TO client;

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';