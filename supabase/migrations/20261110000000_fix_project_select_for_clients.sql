ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clients_can_select_own_org_projects" ON public.projects;
CREATE POLICY "clients_can_select_own_org_projects"
  ON public.projects
  FOR SELECT
  TO client
  USING (
    org_id = (select (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid)
  );

GRANT SELECT ON public.projects TO client;

select supasheet.refresh_metadata();