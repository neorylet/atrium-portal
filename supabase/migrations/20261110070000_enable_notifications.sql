-- Enable Realtime for notifications so the UI updates instantly
ALTER PUBLICATION supabase_realtime ADD TABLE supasheet.user_notifications;

-- Function to create notifications when audit logs are inserted
-- This notifies all users in the same organization when a resource is modified
create or replace function supasheet.notify_audit_log()
returns trigger as $$
declare
  v_recipient_ids uuid[];
  v_org_id uuid;
  v_title text;
  v_body text;
  v_link text;
  v_metadata jsonb;
begin
  -- Only notify on UPDATE operations (not INSERT/DELETE)
  if NEW.operation != 'UPDATE' then
    return NEW;
  end if;

  -- Extract org_id from audit log metadata or new_data
  v_org_id := (NEW.metadata->>'org_id')::uuid;
  if v_org_id is null then
    v_org_id := (NEW.new_data->>'org_id')::uuid;
  end if;

  -- Skip if no org_id found
  if v_org_id is null then
    return NEW;
  end if;

  -- Get all users in the same organization (excluding the actor)
  -- org_id is stored in auth.users.raw_user_meta_data
  select array_agg(au.id) into v_recipient_ids
  from auth.users au
  where (au.raw_user_meta_data->>'org_id')::uuid = v_org_id
    and au.id != NEW.created_by;

  -- Skip if no recipients
  if v_recipient_ids is null or array_length(v_recipient_ids, 1) = 0 then
    return NEW;
  end if;

  -- Build notification content
  v_title := format('%s updated', NEW.table_name);
  v_body := format('A %s was modified in %s', NEW.table_name, NEW.schema_name);
  v_link := format('/%s/resource/%s/%s/detail', NEW.schema_name, NEW.table_name, NEW.record_id);
  v_metadata := jsonb_build_object(
    'audit_log_id', NEW.id,
    'operation', NEW.operation,
    'schema_name', NEW.schema_name,
    'table_name', NEW.table_name,
    'record_id', NEW.record_id,
    'org_id', v_org_id
  );

  -- Create notification and fan out to recipients
  perform supasheet.create_notification(
    p_type := 'audit_update',
    p_title := v_title,
    p_body := v_body,
    p_user_ids := v_recipient_ids,  -- Correctly mapping the array
    p_metadata := v_metadata,
    p_link := v_link                -- Correctly mapping the link
  );
  
  return NEW;
end;
$$ language plpgsql security definer set search_path = '';

-- Apply the trigger to audit_logs
drop trigger if exists trg_audit_log_notify on supasheet.audit_logs;
create trigger trg_audit_log_notify
after insert on supasheet.audit_logs
for each row execute function supasheet.notify_audit_log();
