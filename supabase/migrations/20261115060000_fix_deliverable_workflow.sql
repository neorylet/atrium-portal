-- ==========================================
-- FIX: Auto-revert to in_review when admin updates deliverable
-- Re-attach audit trigger to ensure logging works
-- ==========================================

-- Update touch_row to auto-revert to in_review when admin edits changes_requested deliverable
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
    -- Set approved_at when status changes to approved
    if new.status::text = 'approved' and old.status::text <> 'approved' then
      new.approved_at = now();
    end if;
    
    -- Auto-revert to in_review when admin edits a changes_requested deliverable
    if old.status::text = 'changes_requested' and new.status::text = 'changes_requested' then
      if new.file_path is distinct from old.file_path or new.description is distinct from old.description then
        new.status = 'in_review';
      end if;
    end if;
  end if;
  
  return new;
end;
$$;

-- Re-attach audit trigger to deliverables to ensure logging works
drop trigger if exists trg_audit_deliverables on public.deliverables;
create trigger trg_audit_deliverables
after insert or update or delete on public.deliverables
for each row execute function supasheet.audit_trigger_function('id');
