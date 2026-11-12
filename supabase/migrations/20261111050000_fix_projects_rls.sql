-- Fix projects RLS to allow clients to see projects referenced by their deliverables
-- This ensures the join in the detail view works for clients

DROP POLICY IF EXISTS projects_client_select ON public.projects;

-- Allow clients to select projects if:
-- 1. The project belongs to their org, OR
-- 2. The project is referenced by a deliverable they have access to
CREATE POLICY projects_client_select ON public.projects FOR SELECT TO client
  USING (
    org_id = (select (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid)
    OR EXISTS (
      SELECT 1 FROM public.deliverables
      WHERE deliverables.project_id = public.projects.id
        AND deliverables.org_id = (select (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid)
    )
  );

SELECT supasheet.refresh_metadata();
