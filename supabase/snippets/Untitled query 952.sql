-- Allow clients to update a deliverable even if it is already approved
DROP POLICY IF EXISTS deliverables_client_update ON public.deliverables;

CREATE POLICY deliverables_client_update ON public.deliverables
  FOR UPDATE TO client
  USING (
    org_id = (select (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid)
    AND status IN ('in_review', 'approved') -- <--- ADDED 'approved' here
  )
  WITH CHECK (
    org_id = (select (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid)
    AND status IN ('approved', 'changes_requested')
  );