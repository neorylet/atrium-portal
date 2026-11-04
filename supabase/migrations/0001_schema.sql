-- 0001_schema.sql
create extension if not exists "pgcrypto";

create type public.project_status as enum ('planning', 'active', 'on_hold', 'completed', 'archived');
create type public.deliverable_status as enum ('draft', 'in_review', 'changes_requested', 'approved');
create type public.invoice_status as enum ('draft', 'sent', 'paid', 'overdue', 'void');

create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  billing_email text check (billing_email like '%@%'),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations(id) on delete restrict,
  name text not null check (char_length(name) between 2 and 120),
  description text,
  status public.project_status not null default 'planning',
  start_date date,
  due_date date,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_id_org_uk unique (id, org_id),
  constraint projects_dates_ck check (start_date is null or due_date is null or due_date >= start_date)
);

create table public.deliverables (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 160),
  description text,
  status public.deliverable_status not null default 'draft',
  due_date date,
  file_path text,
  client_feedback text check (char_length(client_feedback) <= 4000),
  approved_at timestamptz,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations(id) on delete restrict,
  project_id uuid references public.projects(id) on delete set null,
  invoice_number text not null unique,
  status public.invoice_status not null default 'draft',
  amount numeric(12,2) not null check (amount >= 0),
  currency char(3) not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  issued_on date not null default current_date,
  due_on date,
  paid_on date,
  notes text,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoices_dates_ck check (due_on >= issued_on),
  constraint invoices_paid_ck check (paid_on is null or status = 'paid')
);

create index projects_org_id_idx on public.projects(org_id);
create index deliverables_org_id_idx on public.deliverables(org_id);
create index deliverables_project_id_idx on public.deliverables(project_id);
create index invoices_org_id_idx on public.invoices(org_id);
create index invoices_project_id_idx on public.invoices(project_id);

-- Auto-derive org_id from project_id
create or replace function public.set_org_from_project()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.project_id is not null then
    select org_id into new.org_id from public.projects where id = new.project_id;
  end if;
  return new;
end $$;

create trigger trg_set_org_deliverables before insert or update on public.deliverables for each row execute function public.set_org_from_project();
create trigger trg_set_org_invoices before insert or update on public.invoices for each row execute function public.set_org_from_project();

create or replace function public.touch_row()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  if tg_table_name = 'deliverables' and new.status = 'approved' and old.status != 'approved' then
    new.approved_at = now();
  end if;
  return new;
end;
$$;

create trigger trg_touch_organisations before update on public.organisations for each row execute function public.touch_row();
create trigger trg_touch_projects before update on public.projects for each row execute function public.touch_row();
create trigger trg_touch_deliverables before update on public.deliverables for each row execute function public.touch_row();
create trigger trg_touch_invoices before update on public.invoices for each row execute function public.touch_row();

-- Table and column metadata for UI configuration

-- Organisations
comment on table public.organisations is '{
  "display": "Organisations",
  "icon": "Building2",
  "fields": {
    "sections": [
      {"id": "overview", "title": "Overview", "fields": ["name", "slug", "billing_email"]}
    ],
    "metadata": ["id", "created_at", "updated_at", "created_by", "updated_by"]
  },
  "detail": {
    "header": {"title": "name"},
    "tabs": ["projects"]
  }
}';
comment on column public.organisations.name is '{"name": "Organization Name"}';
comment on column public.organisations.slug is '{"name": "Slug"}';
comment on column public.organisations.billing_email is '{"name": "Billing Email"}';

-- Projects
comment on table public.projects is '{
  "display": "Projects",
  "icon": "FolderKanban",
  "primary_view": "kanban",
  "views": [
    {"id": "kanban", "name": "Kanban", "type": "kanban", "group": "status", "title": "name", "description": "description", "date": "due_date"}
  ],
  "fields": {
    "sections": [
      {"id": "overview", "title": "Overview", "fields": ["name", "org_id", "status", "start_date", "due_date"]},
      {"id": "details", "title": "Details", "fields": ["description"]}
    ],
    "metadata": ["id", "created_at", "updated_at", "created_by", "updated_by"]
  },
  "detail": {
    "header": {"title": "name", "badges": ["status"]},
    "tabs": ["deliverables", "invoices"]
  },
  "query": {
    "join": [
      {"table": "organisations", "on": "org_id", "columns": ["name"]}
    ]
  }
}';
comment on column public.projects.name is '{"name": "Project Name"}';
comment on column public.projects.org_id is '{"name": "Organization", "foreignTable": "organisations", "displayColumn": "name"}';
comment on column public.projects.status is '{
  "progress": true,
  "values": {
    "Planning": {"variant": "secondary", "icon": "Pencil"},
    "Active": {"variant": "info", "icon": "Loader"},
    "On Hold": {"variant": "warning", "icon": "Pause"},
    "Completed": {"variant": "success", "icon": "CheckCircle2"},
    "Archived": {"variant": "default", "icon": "Archive"}
  }
}';
comment on column public.projects.start_date is '{"name": "Start Date"}';
comment on column public.projects.due_date is '{"name": "Due Date"}';
comment on column public.projects.description is '{"name": "Description"}';

-- Deliverables
comment on table public.deliverables is '{
  "display": "Deliverables",
  "icon": "FileText",
  "fields": {
    "sections": [
      {"id": "overview", "title": "Overview", "fields": ["title", "project_id", "status", "due_date"]},
      {"id": "details", "title": "Details", "fields": ["description", "client_feedback"]}
    ],
    "metadata": ["id", "org_id", "created_at", "updated_at", "created_by", "updated_by", "approved_at"]
  },
  "query": {
    "join": [
      {"table": "projects", "on": "project_id", "columns": ["name"]},
      {"table": "organisations", "on": "org_id", "columns": ["name"]}
    ]
  }
}';
comment on column public.deliverables.title is '{"name": "Title"}';
comment on column public.deliverables.project_id is '{"name": "Project", "foreignTable": "projects", "displayColumn": "name"}';
comment on column public.deliverables.status is '{
  "progress": true,
  "values": {
    "Draft": {"variant": "secondary", "icon": "File"},
    "In Review": {"variant": "warning", "icon": "Eye"},
    "Changes Requested": {"variant": "destructive", "icon": "AlertCircle"},
    "Approved": {"variant": "success", "icon": "CheckCircle2"}
  }
}';
comment on column public.deliverables.due_date is '{"name": "Due Date"}';
comment on column public.deliverables.description is '{"name": "Description"}';
comment on column public.deliverables.file_path is '{"name": "File", "accept": "*"}';
comment on column public.deliverables.org_id is '{"name": "Organization", "foreignTable": "organisations", "displayColumn": "name"}';
comment on column public.deliverables.client_feedback is '{"name": "Client Feedback"}';
comment on column public.deliverables.approved_at is '{"name": "Approved At"}';

-- Invoices
comment on table public.invoices is '{
  "display": "Invoices",
  "icon": "Receipt",
  "fields": {
    "sections": [
      {"id": "overview", "title": "Overview", "fields": ["invoice_number", "project_id", "status", "amount", "currency", "issued_on", "due_on"]},
      {"id": "details", "title": "Details", "fields": ["notes"]}
    ],
    "metadata": ["id", "org_id", "created_at", "updated_at", "created_by", "updated_by", "paid_on"]
  },
  "query": {
    "join": [
      {"table": "projects", "on": "project_id", "columns": ["name"]},
      {"table": "organisations", "on": "org_id", "columns": ["name"]}
    ]
  }
}';
comment on column public.invoices.invoice_number is '{"name": "Invoice Number"}';
comment on column public.invoices.project_id is '{"name": "Project", "foreignTable": "projects", "displayColumn": "name"}';
comment on column public.invoices.status is '{
  "values": {
    "Draft": {"variant": "secondary", "icon": "File"},
    "Sent": {"variant": "info", "icon": "Send"},
    "Paid": {"variant": "success", "icon": "CheckCircle2"},
    "Overdue": {"variant": "destructive", "icon": "AlertCircle"},
    "Void": {"variant": "default", "icon": "XCircle"}
  }
}';
comment on column public.invoices.amount is '{"name": "Amount", "aggregate": "sum"}';
comment on column public.invoices.currency is '{"name": "Currency"}';
comment on column public.invoices.org_id is '{"name": "Organization", "foreignTable": "organisations", "displayColumn": "name"}';
comment on column public.invoices.issued_on is '{"name": "Issued On"}';
comment on column public.invoices.due_on is '{"name": "Due On"}';
comment on column public.invoices.paid_on is '{"name": "Paid On"}';
comment on column public.invoices.notes is '{"name": "Notes"}';

select supasheet.refresh_metadata();