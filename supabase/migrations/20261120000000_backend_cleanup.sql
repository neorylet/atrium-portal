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
    end if;

    if old.status::text = 'changes_requested' and new.status::text = 'changes_requested' then
      if new.file_path is distinct from old.file_path or new.description is distinct from old.description then
        new.status = 'in_review';
      end if;
    end if;

    if new.status::text <> 'approved' then
      new.approved_at = null;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_sent_invoice on public.invoices;

drop function if exists supasheet.get_users_with_role (text);
drop function if exists supasheet.get_users_with_table_privilege (text, text, text);
drop function if exists supasheet.get_storage_filename_as_uuid (text);
drop function if exists supasheet.set_updated_at ();
drop function if exists supasheet.set_updated_by ();
drop function if exists supasheet.get_related_tables (text, text, text);

select supasheet.refresh_metadata();
