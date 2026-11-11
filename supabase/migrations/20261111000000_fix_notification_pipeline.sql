-- 1. Grant execute permissions to the 'client' role
grant execute on function supasheet.mark_all_notifications_read () to client;
grant execute on function supasheet.unread_notifications_count () to client;

-- 2. Rewrite the trigger function to handle INSERT/UPDATE/DELETE and dynamically resolve org_id
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
begin
  -- Skip if no record_id
  if NEW.record_id is null then
    return NEW;
  end if;
  
  v_record_id := NEW.record_id::uuid;

  -- Dynamically fetch org_id from the actual source table
  begin
    execute format('select org_id from %I.%I where id = $1', NEW.schema_name, NEW.table_name) 
    into v_org_id using v_record_id;
  exception when others then
    null;
  end;

  -- If we can't find an org_id, we can't determine who to notify
  if v_org_id is null then
    return NEW;
  end if;

  -- Get all users in the org EXCEPT the person who made the change
  -- Uses raw_app_meta_data per the project architecture
  select array_agg(au.id) into v_recipient_ids
  from auth.users au
  where (au.raw_app_meta_data->>'org_id')::uuid = v_org_id
    and au.id != NEW.created_by;

  if v_recipient_ids is null or array_length(v_recipient_ids, 1) = 0 then
    return NEW;
  end if;

  -- Build the notification content based on the operation
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
  
  v_metadata := jsonb_build_object(
    'audit_log_id', NEW.id,
    'operation', NEW.operation,
    'schema_name', NEW.schema_name,
    'table_name', NEW.table_name,
    'record_id', NEW.record_id,
    'org_id', v_org_id
  );

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
