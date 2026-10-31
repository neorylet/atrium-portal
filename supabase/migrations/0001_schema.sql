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
  created_by uuid references auth.users(id) on delete set null,
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
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_id_org_uk unique (id, org_id),
  constraint projects_dates_ck check (start_date is null or due_date is null or due_date >= start_date)
);

create table public.deliverables (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  project_id uuid not null,
  title text not null check (char_length(title) between 2 and 160),
  description text,
  status public.deliverable_status not null default 'draft',
  due_date date,
  file_path text check (file_path is null or file_path like org_id::text || '/' || project_id::text || '/%'),
  client_feedback text check (char_length(client_feedback) <= 4000),
  approved_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (project_id, org_id) references public.projects(id, org_id) on delete cascade
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations(id) on delete restrict,
  project_id uuid,
  invoice_number text not null unique,
  status public.invoice_status not null default 'draft',
  amount_cents bigint not null check (amount_cents >= 0),
  currency char(3) not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  issued_on date not null default current_date,
  due_on date,
  paid_on date,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (project_id, org_id) references public.projects(id, org_id) on delete set null (project_id),
  constraint invoices_dates_ck check (due_on >= issued_on),
  constraint invoices_paid_ck check (paid_on is null or status = 'paid')
);

create index projects_org_id_idx on public.projects(org_id);
create index deliverables_org_id_idx on public.deliverables(org_id);
create index deliverables_project_id_idx on public.deliverables(project_id);
create index invoices_org_id_idx on public.invoices(org_id);
create index invoices_project_id_idx on public.invoices(project_id);

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

select supasheet.refresh_metadata();