-- 0005_widgets.sql
create view public.widget_active_projects with (security_invoker = true) as
select 
  count(*) filter (where status = 'active')::int as active_projects,
  count(*) filter (where status = 'active' and due_date between current_date and current_date + 14)::int as due_soon,
  count(*) filter (where status = 'active' and due_date < current_date)::int as overdue
from public.projects;

revoke all on public.widget_active_projects from public, anon, authenticated;
grant select on public.widget_active_projects to client, "x-admin";
comment on view public.widget_active_projects is '{"type":"dashboard_widget","widget":"card","name":"Active Projects","description":"Work in flight right now","primary":"active_projects","secondary":["due_soon","overdue"]}';

create view public.widget_pending_deliverables with (security_invoker = true) as
select d.id, d.title, p.name as project, d.due_date, d.status
from public.deliverables d
join public.projects p on p.id = d.project_id
where d.status = 'in_review'
order by d.due_date nulls last limit 10;

revoke all on public.widget_pending_deliverables from public, anon, authenticated;
grant select on public.widget_pending_deliverables to client, "x-admin";
comment on view public.widget_pending_deliverables is '{"type":"dashboard_widget","widget":"table","name":"Waiting for your review","description":"Deliverables in review, soonest due first","linkTo":"deliverables","linkKey":"id"}';

create view public.widget_recent_invoices with (security_invoker = true) as
select i.id, i.invoice_number, round(i.amount_cents / 100.0, 2) as amount, i.currency, i.status, i.due_on
from public.invoices i
order by i.issued_on desc, i.created_at desc limit 5;

revoke all on public.widget_recent_invoices from public, anon, authenticated;
grant select on public.widget_recent_invoices to client, "x-admin";
comment on view public.widget_recent_invoices is '{"type":"dashboard_widget","widget":"list","name":"Recent invoices","description":"Latest five invoices","titleColumn":"invoice_number","linkTo":"invoices","linkKey":"id"}';

comment on table public.projects is '{"display":"Projects","primaryKey":"id","titleColumn":"name","view":"kanban","groupBy":"status"}';

select supasheet.refresh_metadata();