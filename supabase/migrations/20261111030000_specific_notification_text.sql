-- ==========================================
-- 1. UPGRADE: Generic Audit Log Notifications
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
  v_actor_name text;
  v_record_title text;
  v_action text;
begin
  if NEW.record_id is null then return NEW; end if;
  v_record_id := NEW.record_id::uuid;

  -- Get the actor's name
  select coalesce(nullif(name, ''), email, 'Someone') into v_actor_name 
  from supasheet.users where id = NEW.created_by;

  -- Dynamically fetch org_id AND the record's title
  begin
    execute format(
      'select org_id, coalesce(
                to_jsonb(t) ->> %L, to_jsonb(t) ->> %L, to_jsonb(t) ->> %L, t.id::text
              ) from %I.%I t where t.id = $1', 
      'title', 'name', 'invoice_number', NEW.schema_name, NEW.table_name
    ) into v_org_id, v_record_title using v_record_id;
  exception when others then
    null;
  end;

  if v_org_id is null then return NEW; end if;

  select array_agg(au.id) into v_recipient_ids
  from auth.users au
  where (au.raw_app_meta_data->>'org_id')::uuid = v_org_id
    and au.id != NEW.created_by;

  if v_recipient_ids is null or array_length(v_recipient_ids, 1) = 0 then return NEW; end if;

  -- Map operation to human-readable verb
  if NEW.operation = 'INSERT' then v_action := 'created';
  elsif NEW.operation = 'UPDATE' then v_action := 'updated';
  elsif NEW.operation = 'DELETE' then v_action := 'deleted';
  else return NEW; end if;

  -- Build the Facebook/Slack style title
  v_title := format('%s %s "%s"', v_actor_name, v_action, coalesce(v_record_title, 'a record'));
  v_body := format('The %s was %s.', NEW.table_name, v_action);
  v_link := format('/%s/resource/%s/%s/detail', NEW.schema_name, NEW.table_name, NEW.record_id);
  
  v_metadata := jsonb_build_object(
    'audit_log_id', NEW.id, 'operation', NEW.operation, 'schema_name', NEW.schema_name, 
    'table_name', NEW.table_name, 'record_id', NEW.record_id, 'org_id', v_org_id
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


-- ==========================================
-- 2. UPGRADE: Comment Notifications
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
  v_actor_name   text;
  v_org_id       uuid;
  v_recipients   uuid[];
  v_record_title text;
  v_type         text;
  v_title        text;
  v_body         text;
  v_link         text;
  v_metadata     jsonb;
begin
  if NEW.deleted_at is not null or NEW.content is null or btrim(NEW.content) = '' then return NEW; end if;
  if NEW.schema_name <> 'public' then return NEW; end if;
  if v_actor_id is null then return NEW; end if;

  -- Fetch actor role, org, and name
  select nullif(au.raw_app_meta_data ->> 'role', ''), nullif(au.raw_app_meta_data ->> 'org_id', '')::uuid, u.name
    into v_actor_role, v_actor_org, v_actor_name
  from auth.users au
  left join supasheet.users u on u.id = au.id
  where au.id = v_actor_id;

  if v_actor_role is null then return NEW; end if;
  v_actor_name := coalesce(v_actor_name, 'Someone');

  begin
    if NEW.table_name = 'organisations' then
      v_org_id := NEW.record_id::uuid;
    else
      execute format('select org_id from %I.%I where id = $1', NEW.schema_name, NEW.table_name)
      into v_org_id using NEW.record_id::uuid;
    end if;
  exception when others then v_org_id := null; end;

  if v_org_id is null then return NEW; end if;

  begin
    execute format(
      'select coalesce(to_jsonb(t) ->> %L, to_jsonb(t) ->> %L, to_jsonb(t) ->> %L, to_jsonb(t) ->> %L, t.id::text) 
       from %I.%I t where t.id = $1',
      'title', 'name', 'invoice_number', 'subject', NEW.schema_name, NEW.table_name
    ) into v_record_title using NEW.record_id::uuid;
  exception when others then v_record_title := NEW.record_id; end;

  v_record_title := coalesce(v_record_title, NEW.record_id);

  if v_actor_role = 'client' then
    if v_actor_org is distinct from v_org_id then return NEW; end if;
    select array_agg(au.id) into v_recipients from auth.users au
    where au.raw_app_meta_data ->> 'role' in ('x-admin', 'admin')
      and (nullif(au.raw_app_meta_data ->> 'org_id', '') is null or (au.raw_app_meta_data ->> 'org_id')::uuid = v_org_id)
      and au.id <> v_actor_id;
    v_type := 'client_comment';
    -- Facebook style: "Omar commented on 'Brand Guidelines v2'"
    v_title := format('%s commented on "%s"', v_actor_name, v_record_title);
  elsif v_actor_role in ('x-admin', 'admin', 'user') then
    select array_agg(au.id) into v_recipients from auth.users au
    where au.raw_app_meta_data ->> 'role' = 'client'
      and (au.raw_app_meta_data ->> 'org_id')::uuid = v_org_id
      and au.id <> v_actor_id;
    v_type := 'admin_comment';
    v_title := format('%s commented on "%s"', v_actor_name, v_record_title);
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