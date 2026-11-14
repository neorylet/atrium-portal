-- ==========================================
-- 1. FIX: approved_at Bug
-- ==========================================
create or replace function public.touch_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  
  if tg_table_name = 'deliverables' then
    if new.status::text = 'approved' and old.status::text <> 'approved' then
      new.approved_at = now();
    elsif new.status::text <> 'approved' then
      new.approved_at = null; -- Clear it if it leaves approved status
    end if;
  end if;
  
  return new;
end;
$$;


-- ==========================================
-- 2. FIX: Invoice Immutability
-- ==========================================
create or replace function public.protect_sent_invoice()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- If the OLD status is sent, paid, or void, prevent changes to financial fields
  if old.status in ('sent', 'paid', 'void') then
    if new.amount <> old.amount then
      raise exception 'Cannot modify amount after invoice is sent/paid/void';
    end if;
    if new.currency <> old.currency then
      raise exception 'Cannot modify currency after invoice is sent/paid/void';
    end if;
    if new.invoice_number <> old.invoice_number then
      raise exception 'Cannot modify invoice number after invoice is sent/paid/void';
    end if;
  end if;
  
  -- Prevent changing status away from paid or void
  if old.status = 'paid' and new.status <> 'paid' then
    raise exception 'Paid invoices are terminal and cannot change status';
  end if;
  if old.status = 'void' and new.status <> 'void' then
    raise exception 'Voided invoices are terminal and cannot change status';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_sent_invoice on public.invoices;
create trigger trg_protect_sent_invoice
  before update on public.invoices
  for each row execute function public.protect_sent_invoice();


-- ==========================================
-- 3. FIX: Notification Draft Leak
-- ==========================================
create or replace function supasheet.notify_audit_log()
returns trigger as $$
declare
  v_recipient_ids uuid[];
  v_org_id uuid;
  v_title text;
  v_body text;
  v_link text;
  v_metadata jsonb;
  v_record_id uuid;
  v_record_status text;
begin
  if NEW.record_id is null then return NEW; end if;
  v_record_id := NEW.record_id::uuid;

  -- Fetch org_id AND status dynamically
  begin
    execute format('select org_id, status::text from %I.%I where id = $1', NEW.schema_name, NEW.table_name) 
    into v_org_id, v_record_status using v_record_id;
  exception when others then
    null;
  end;

  if v_org_id is null then return NEW; end if;

  -- Build recipient list based on visibility
  if NEW.table_name in ('invoices', 'deliverables') and v_record_status = 'draft' then
    -- DRAFTS: Only notify x-admins
    select array_agg(au.id) into v_recipient_ids
    from auth.users au
    where (au.raw_app_meta_data->>'org_id')::uuid = v_org_id
      and au.id != NEW.created_by
      and au.raw_app_meta_data->>'role' = 'x-admin';
  else
    -- NON-DRAFTS: Notify everyone in the org except the creator
    select array_agg(au.id) into v_recipient_ids
    from auth.users au
    where (au.raw_app_meta_data->>'org_id')::uuid = v_org_id
      and au.id != NEW.created_by;
  end if;

  if v_recipient_ids is null or array_length(v_recipient_ids, 1) = 0 then return NEW; end if;

  if NEW.operation = 'INSERT' then
    v_title := format('New %s created', NEW.table_name);
    v_body := format('A new %s was added.', NEW.table_name);
  elsif NEW.operation = 'UPDATE' then
    v_title := format('%s updated', NEW.table_name);
    v_body := format('A %s was modified.', NEW.table_name);
  elsif NEW.operation = 'DELETE' then
    v_title := format('%s deleted', NEW.table_name);
    v_body := format('A %s was removed.', NEW.table_name);
  else
    return NEW;
  end if;

  v_link := format('/%s/resource/%s/%s/detail', NEW.schema_name, NEW.table_name, NEW.record_id);
  v_metadata := jsonb_build_object('audit_log_id', NEW.id, 'operation', NEW.operation, 'schema_name', NEW.schema_name, 'table_name', NEW.table_name, 'record_id', NEW.record_id, 'org_id', v_org_id);

  perform supasheet.create_notification(
    p_type := 'audit_' || lower(NEW.operation),
    p_title := v_title,
    p_body := v_body,
    p_user_ids := v_recipient_ids,
    p_metadata := v_metadata,
    p_link := v_link
  );

  return NEW;
end;
$$ language plpgsql security definer set search_path = '';
