-- 1. Create the invoice items table
create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric(12,2) not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  created_at timestamptz default now()
);

create index invoice_items_invoice_id_idx on public.invoice_items(invoice_id);

-- 2. Enable RLS and Grants
alter table public.invoice_items enable row level security;

GRANT SELECT ON public.invoice_items TO client;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO "x-admin";

create policy "invoice_items_client_select" on public.invoice_items
  for select to client
  using (
    exists (
      select 1 from public.invoices
      where invoices.id = invoice_items.invoice_id
      and invoices.org_id = (select (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid)
    )
  );

create policy "invoice_items_admin_all" on public.invoice_items
  for all to "x-admin"
  using ( (select auth.jwt() ->> 'role') = 'x-admin' )
  with check ( (select auth.jwt() ->> 'role') = 'x-admin' );

-- 3. Create the trigger to auto-calculate the invoice total
create or replace function public.calculate_invoice_total()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.invoices
  set amount = (
    select coalesce(sum(quantity * unit_price), 0)
    from public.invoice_items
    where invoice_id = coalesce(new.invoice_id, old.invoice_id)
  )
  where id = coalesce(new.invoice_id, old.invoice_id);
  return null;
end;
$$;

create trigger trg_calc_invoice_total
  after insert or update or delete on public.invoice_items
  for each row execute function public.calculate_invoice_total();

-- 4. Hide from sidebar, configure form layout
-- The "hidden": true and "display": "none" flags force it out of the navigation
comment on table public.invoice_items is '{
  "display": "none",
  "hidden": true,
  "icon": "List",
  "fields": {
    "sections": [
      {"id": "details", "title": "Line Item", "fields": ["description", "quantity", "unit_price"]}
    ],
    "metadata": ["id", "invoice_id", "created_at"]
  }
}';

comment on column public.invoice_items.description is '{"name": "Description"}';
comment on column public.invoice_items.quantity is '{"name": "Qty"}';
comment on column public.invoice_items.unit_price is '{"name": "Unit Price", "variant": "money"}';

-- 5. Add the tab to the Invoice table metadata
COMMENT ON TABLE public.invoices IS '{
  "display": "Invoices",
  "icon": "Receipt",
  "fields": {
    "sections": [
      {"id": "overview", "title": "Invoice Details", "fields": ["invoice_number", "project_id", "status", "issued_on", "due_on", "paid_on"]},
      {"id": "financials", "title": "Financials", "fields": ["amount", "currency", "notes"]}
    ],
    "metadata": ["id", "org_id", "created_at", "updated_at", "created_by", "updated_by"]
  },
  "detail": {
    "header": {"title": "invoice_number", "badges": ["status"]},
    "tabs": ["invoice_items"]
  },
  "query": {
    "join": [
      {"table": "projects", "on": "project_id", "columns": ["name"]},
      {"table": "organisations", "on": "org_id", "columns": ["name"]}
    ]
  }
}';

select supasheet.refresh_metadata();