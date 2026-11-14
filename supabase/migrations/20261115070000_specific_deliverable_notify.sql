-- ==========================================
-- FIX: Bulletproof notification for deliverable changes_requested
-- Dedicated trigger to ensure Dana gets notified when client requests changes
-- ==========================================

create or replace function public.notify_deliverable_changes_requested()
returns trigger as $$
declare
  v_admin_ids uuid[];
begin
  -- Only fire when status changes TO changes_requested
  if NEW.status = 'changes_requested' and OLD.status != 'changes_requested' then
    
    -- Get all x-admins in this org
    select array_agg(au.id) into v_admin_ids
    from auth.users au
    where (au.raw_app_meta_data->>'org_id')::uuid = NEW.org_id
      and au.raw_app_meta_data->>'role' = 'x-admin';

    if v_admin_ids is not null then
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
