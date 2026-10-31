-- 0003_rls.sql
alter table public.organisations enable row level security;
alter table public.projects enable row level security;
alter table public.deliverables enable row level security;
alter table public.invoices enable row level security;

-- Organisations
create policy orgs_client_select on public.organisations for select to client
  using ( id = (select (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid) );
create policy orgs_admin_all on public.organisations for all to "x-admin"
  using ( (select auth.jwt() ->> 'role') = 'x-admin' ) with check ( (select auth.jwt() ->> 'role') = 'x-admin' );

-- Projects
create policy projects_client_select on public.projects for select to client
  using ( org_id = (select (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid) );
create policy projects_admin_all on public.projects for all to "x-admin"
  using ( (select auth.jwt() ->> 'role') = 'x-admin' ) with check ( (select auth.jwt() ->> 'role') = 'x-admin' );

-- Deliverables
create policy deliverables_client_select on public.deliverables for select to client
  using ( org_id = (select (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid) and status <> 'draft' );
create policy deliverables_client_update on public.deliverables for update to client
  using ( org_id = (select (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid) and status = 'in_review' )
  with check ( org_id = (select (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid) and status in ('approved', 'changes_requested') );
create policy deliverables_admin_all on public.deliverables for all to "x-admin"
  using ( (select auth.jwt() ->> 'role') = 'x-admin' ) with check ( (select auth.jwt() ->> 'role') = 'x-admin' );

-- Invoices
create policy invoices_client_select on public.invoices for select to client
  using ( org_id = (select (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid) and status <> 'draft' );
create policy invoices_admin_all on public.invoices for all to "x-admin"
  using ( (select auth.jwt() ->> 'role') = 'x-admin' ) with check ( (select auth.jwt() ->> 'role') = 'x-admin' );

select supasheet.refresh_metadata();