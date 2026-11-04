-- 0005_widgets.sql

-- 1. Active Projects (Card: widget_type "card_1")
-- Contract: value (number), icon (lucide slug), label (string)
create or replace view public.widget_active_projects with (security_invoker = true) as
select 
  count(*) filter (where status = 'active')::int as value,
  'folder' as icon,
  'Active Projects' as label
from public.projects;

revoke all on public.widget_active_projects from public, anon, authenticated;
grant select on public.widget_active_projects to client, "x-admin";
comment on view public.widget_active_projects is '{"type":"dashboard_widget","widget_type":"card_1","name":"Active Projects","description":"Work in flight right now"}';

-- 2. Pending Deliverables (Table: widget_type "table_1")
-- Contract: any flat columns, order by + limit 10
create or replace view public.widget_pending_deliverables with (security_invoker = true) as
select d.title, p.name as project, d.due_date, d.status
from public.deliverables d
join public.projects p on p.id = d.project_id
where d.status = 'in_review'
order by d.due_date nulls last limit 10;

revoke all on public.widget_pending_deliverables from public, anon, authenticated;
grant select on public.widget_pending_deliverables to client, "x-admin";
comment on view public.widget_pending_deliverables is '{"type":"dashboard_widget","widget_type":"table_1","name":"Waiting for review","description":"Deliverables in review, soonest due first"}';

-- 3. Recent Invoices (List: widget_type "list_1")
-- Contract: title (string); optional description, icon, variant
create or replace view public.widget_recent_invoices with (security_invoker = true) as
select
  i.id,
  i.invoice_number as title,
  ('$' || i.amount::text) as description,
  i.status as variant,
  'receipt' as icon
from public.invoices i
order by i.issued_on desc limit 5;

revoke all on public.widget_recent_invoices from public, anon, authenticated;
grant select on public.widget_recent_invoices to client, "x-admin";
comment on view public.widget_recent_invoices is '{"type":"dashboard_widget","widget_type":"list_1","name":"Recent Invoices","description":"Latest five invoices"}';

-- 4. Total Revenue (Admin-only Card: widget_type "card_1")
-- Contract: value (number), icon (lucide slug), label (string)
create or replace view public.widget_total_revenue with (security_invoker = true) as
select
  round(sum(amount), 2) as value,
  'dollar-sign' as icon,
  'Total Revenue' as label
from public.invoices
where status = 'paid';

revoke all on public.widget_total_revenue from public, anon, authenticated, client;
grant select on public.widget_total_revenue to "x-admin";
comment on view public.widget_total_revenue is '{"type":"dashboard_widget","widget_type":"card_1","name":"Total Revenue","description":"Total paid invoices"}';

select supasheet.refresh_metadata();