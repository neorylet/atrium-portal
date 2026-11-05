-- Drop the old overly strict policy
DROP POLICY IF EXISTS storage_client_select ON storage.objects;

-- Allow any authenticated user to read files in the deliverable-files bucket
CREATE POLICY storage_client_select ON storage.objects
  FOR SELECT TO authenticated, client, "x-admin"
  USING ( bucket_id = 'deliverable-files' );
