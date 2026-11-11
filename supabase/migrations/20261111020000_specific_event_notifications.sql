-- ==========================================
-- 1. TRIGGER: New Comment Notifications
-- ==========================================
create or replace function supasheet.trg_comment_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id     uuid := coalesce(auth.uid(), NEW.created_by);
  v_actor_role   text;
  v_actor_org    uuid;
  v_org_id       uuid;
  v_recipients   uuid[];
  v_record_title text;
  v_type         text;
  v_title        text;
  v_body         text;
  v_link         text;
  v_metadata     jsonb;
begin
  -- Only handle live comments in the public schema
  if NEW.deleted_at is not null or NEW.content is null or btrim(NEW.content) = '' then
    return NEW;
  end if;
  if NEW.schema_name <> 'public' then
    return NEW;
  end if;
  if v_actor_id is null then
    return NEW;
  end if;

  -- Trust the JWT/DB identity, not the client-supplied created_by
  select nullif(au.raw_app_meta_data ->> 'role', ''),
         nullif(au.raw_app_meta_data ->> 'org_id', '')::uuid
    into v_actor_role, v_actor_org
  from auth.users au
  where au.id = v_actor_id;

  if v_actor_role is null then
    return NEW;
  end if;

  -- Resolve the org from the commented record
  begin
    if NEW.table_name = 'organisations' then
      v_org_id := NEW.record_id::uuid;
    else
      execute format('select org_id from %I.%I where id = $1', NEW.schema_name, NEW.table_name)
      into v_org_id using NEW.record_id::uuid;
    end if;
  exception when others then
    v_org_id := null;
  end;

  if v_org_id is null then
    return NEW;
  end if;

  -- Dynamically resolve a human-readable record title (works for title, name, invoice_number)
  begin
    execute format(
      'select coalesce(
                to_jsonb(t) ->> %L, to_jsonb(t) ->> %L, to_jsonb(t) ->> %L, to_jsonb(t) ->> %L, t.id::text
              ) from %I.%I t where t.id = $1',
      'title', 'name', 'invoice_number', 'subject',
      NEW.schema_name, NEW.table_name
    )
    into v_record_title using NEW.record_id::uuid;
  exception when others then
    v_record_title := NEW.record_id;
  end;

  v_record_title := coalesce(v_record_title, NEW.record_id);

  -- Opposite-direction routing
  if v_actor_role = 'client' then
    if v_actor_org is distinct from v_org_id then return NEW; end if;
    select array_agg(au.id) into v_recipients from auth.users au
    where au.raw_app_meta_data ->> 'role' in ('x-admin', 'admin')
      and (nullif(au.raw_app_meta_data ->> 'org_id', '') is null or (au.raw_app_meta_data ->> 'org_id')::uuid = v_org_id)
      and au.id <> v_actor_id;
    v_type := 'client_comment';
    v_title := format('Client commented on %s', v_record_title);
  elsif v_actor_role in ('x-admin', 'admin', 'user') then
    select array_agg(au.id) into v_recipients from auth.users au
    where au.raw_app_meta_data ->> 'role' = 'client'
      and (au.raw_app_meta_data ->> 'org_id')::uuid = v_org_id
      and au.id <> v_actor_id;
    v_type := 'admin_comment';
    v_title := format('New comment on %s', v_record_title);
  else
    return NEW;
  end if;

  if v_recipients is null or array_length(v_recipients, 1) is null then return NEW; end if;

  v_body := left(btrim(NEW.content), 140);
  v_link := format('/%s/resource/%s/%s/comment', NEW.schema_name, NEW.table_name, NEW.record_id);
  
  v_metadata := jsonb_build_object(
    'comment_id', NEW.id, 'schema_name', NEW.schema_name, 'table_name', NEW.table_name,
    'record_id', NEW.record_id, 'record_title', v_record_title, 'org_id', v_org_id,
    'actor_id', v_actor_id, 'actor_role', v_actor_role
  );

  perform supasheet.create_notification(
    p_type := v_type, p_title := v_title, p_body := v_body,
    p_user_ids := v_recipients, p_metadata := v_metadata, p_link := v_link
  );

  return NEW;
end;
$$;

drop trigger if exists trg_comments_notify on supasheet.comments;
create trigger trg_comments_notify
after insert on supasheet.comments
for each row execute function supasheet.trg_comment_notify();


-- ==========================================
-- 2. HELPER: Get users in a specific org by role
-- ==========================================
create or replace function supasheet.get_org_users_by_role (p_org_id uuid, p_role text) 
returns uuid[] language sql stable security definer
set search_path = '' as $$
    select coalesce(array_agg(id), '{}'::uuid[])
    from auth.users
    where (raw_app_meta_data ->> 'org_id')::uuid = p_org_id
      and raw_app_meta_data ->> 'role' = p_role
$$;

revoke execute on function supasheet.get_org_users_by_role (uuid, text) from public, anon, authenticated;
grant execute on function supasheet.get_org_users_by_role (uuid, text) to service_role;


-- ==========================================
-- 3. TRIGGER: Deliverable Approved
-- ==========================================
create or replace function supasheet.notify_deliverable_approved()
returns trigger as $$
declare
  v_recipient_ids uuid[];
begin
  if NEW.status = 'approved' and OLD.status != 'approved' then
    v_recipient_ids := supasheet.get_org_users_by_role(NEW.org_id, 'x-admin');
    if v_recipient_ids is null or array_length(v_recipient_ids, 1) = 0 then return NEW; end if;

    perform supasheet.create_notification(
      p_type := 'deliverable_approved',
      p_title := 'Deliverable Approved',
      p_body := format('The client approved "%s".', NEW.title),
      p_user_ids := v_recipient_ids,
      p_metadata := jsonb_build_object('deliverable_id', NEW.id),
      p_link := format('/public/resource/deliverables/%s/detail', NEW.id)
    );
  end if;
  return NEW;
end;
$$ language plpgsql security definer set search_path = '';

drop trigger if exists trg_notify_deliverable_approved on public.deliverables;
create trigger trg_notify_deliverable_approved
after update of status on public.deliverables
for each row execute function supasheet.notify_deliverable_approved();


-- ==========================================
-- 4. TRIGGER: Invoice Paid
-- ==========================================
create or replace function supasheet.notify_invoice_paid()
returns trigger as $$
declare
  v_recipient_ids uuid[];
begin
  if NEW.status = 'paid' and OLD.status != 'paid' then
    v_recipient_ids := supasheet.get_org_users_by_role(NEW.org_id, 'x-admin');
    if v_recipient_ids is null or array_length(v_recipient_ids, 1) = 0 then return NEW; end if;

    perform supasheet.create_notification(
      p_type := 'invoice_paid',
      p_title := 'Invoice Paid',
      p_body := format('Invoice %s has been marked as paid.', NEW.invoice_number),
      p_user_ids := v_recipient_ids,
      p_metadata := jsonb_build_object('invoice_id', NEW.id),
      p_link := format('/public/resource/invoices/%s/detail', NEW.id)
    );
  end if;
  return NEW;
end;
$$ language plpgsql security definer set search_path = '';

drop trigger if exists trg_notify_invoice_paid on public.invoices;
create trigger trg_notify_invoice_paid
after update of status on public.invoices
for each row execute function supasheet.notify_invoice_paid();