create or replace function public.enforce_invoice_workflow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.status := 'draft';
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.status <> 'draft' then
      raise exception 'Only draft invoices can be deleted';
    end if;
    return old;
  end if;

  if old.status in ('paid', 'void') and new.status <> old.status then
    raise exception 'Paid or void invoices are terminal';
  end if;

  if old.status = 'sent' and new.status = 'draft' then
    raise exception 'Cannot revert a sent invoice to draft';
  end if;

  if new.status = 'paid' and new.status is distinct from old.status and new.paid_on is null then
    raise exception 'Paid invoices require paid_on';
  end if;

  if old.status = 'draft' and new.status = 'sent' then
    if new.project_id is null then
      raise exception 'Cannot send an invoice without a project';
    end if;
    if new.amount <= 0 then
      raise exception 'Cannot send an invoice with a non-positive amount';
    end if;
    if not exists (
      select 1 from public.invoice_items where invoice_id = new.id
    ) then
      raise exception 'Cannot send an invoice without line items';
    end if;
  end if;

  if old.status <> 'draft' then
    if new.project_id is distinct from old.project_id then
      raise exception 'Cannot modify project_id after an invoice leaves draft';
    end if;
    if new.org_id is distinct from old.org_id then
      raise exception 'Cannot modify org_id after an invoice leaves draft';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_invoice_workflow on public.invoices;
create trigger trg_enforce_invoice_workflow
  before insert or update or delete on public.invoices
  for each row execute function public.enforce_invoice_workflow();

create or replace function public.enforce_invoice_item_parent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.invoice_status;
begin
  if tg_op = 'DELETE' then
    select i.status into v_status
    from public.invoices i
    where i.id = old.invoice_id;

    if v_status is not null and v_status <> 'draft' then
      raise exception 'Cannot modify line items on a non-draft invoice.';
    end if;

    return old;
  end if;

  select i.status into v_status
  from public.invoices i
  where i.id = new.invoice_id;

  if v_status is not null and v_status <> 'draft' then
    raise exception 'Cannot modify line items on a non-draft invoice.';
  end if;

  if tg_op = 'UPDATE' and new.invoice_id is distinct from old.invoice_id then
    select i.status into v_status
    from public.invoices i
    where i.id = old.invoice_id;

    if v_status is not null and v_status <> 'draft' then
      raise exception 'Cannot modify line items on a non-draft invoice.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_invoice_item_parent on public.invoice_items;
create trigger trg_enforce_invoice_item_parent
  before insert or update or delete on public.invoice_items
  for each row execute function public.enforce_invoice_item_parent();

alter table public.invoice_items
  add constraint invoice_items_description_check
  check (char_length(trim(description)) > 0);

select supasheet.refresh_metadata();
