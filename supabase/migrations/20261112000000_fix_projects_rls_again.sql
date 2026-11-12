-- Fix projects RLS to allow clients to see projects in their org
DROP POLICY IF EXISTS projects_client_select ON public.projects;

CREATE POLICY projects_client_select ON public.projects FOR SELECT TO client
  USING (org_id = (SELECT (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid));

SELECT supasheet.refresh_metadata();
