-- 1. Fix changes_requested trigger
create or replace function public.notify_deliverable_changes_requested()
returns trigger as $$
declare
  v_admin_ids uuid[];
begin
  if NEW.status = 'changes_requested' and OLD.status != 'changes_requested' then
    
    select array_agg(au.id) into v_admin_ids
    from auth.users au
    where au.raw_app_meta_data->>'role' = 'x-admin'
      and au.id != NEW.updated_by
      and (
        nullif(au.raw_app_meta_data->>'org_id', '') is null
        or (au.raw_app_meta_data->>'org_id')::uuid = NEW.org_id
      );

    if v_admin_ids is not null and array_length(v_admin_ids, 1) > 0 then
      perform supasheet.create_notification(
        p_type := 'deliverable_changes',
        p_title := format('Changes requested on "%s"', NEW.title),
        p_body := NEW.client_feedback,
        p_user_ids := v_admin_ids,
        p_link := format('/public/resource/deliverables/%s/detail', NEW.id)
      );
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql security definer set search_path = '';

drop trigger if exists trg_notify_changes_requested on public.deliverables;
create trigger trg_notify_changes_requested
  after update of status on public.deliverables
  for each row execute function public.notify_deliverable_changes_requested();


-- 2. Fix approved trigger
create or replace function supasheet.notify_deliverable_approved()
returns trigger as $$
declare
  v_recipient_ids uuid[];
begin
  if NEW.status = 'approved' and OLD.status != 'approved' then
    
    select array_agg(au.id) into v_recipient_ids
    from auth.users au
    where au.raw_app_meta_data->>'role' = 'x-admin'
      and au.id != NEW.updated_by
      and (
        nullif(au.raw_app_meta_data->>'org_id', '') is null
        or (au.raw_app_meta_data->>'org_id')::uuid = NEW.org_id
      );

    if v_recipient_ids is not null and array_length(v_recipient_ids, 1) > 0 then
      perform supasheet.create_notification(
        p_type := 'deliverable_approved',
        p_title := 'Deliverable Approved',
        p_body := format('The client approved "%s".', NEW.title),
        p_user_ids := v_recipient_ids,
        p_metadata := jsonb_build_object('deliverable_id', NEW.id),
        p_link := format('/public/resource/deliverables/%s/detail', NEW.id)
      );
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql security definer set search_path = '';

drop trigger if exists trg_notify_deliverable_approved on public.deliverables;
create trigger trg_notify_deliverable_approved
  after update of status on public.deliverables
  for each row execute function supasheet.notify_deliverable_approved();
