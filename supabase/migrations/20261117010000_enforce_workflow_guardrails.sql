create or replace function public.enforce_deliverable_workflow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_allowed boolean;
begin
  if new.status = 'in_review' and new.file_path is null then
    raise exception 'A deliverable must have a file before it can be sent for review';
  end if;

  if new.status = 'changes_requested'
    and (new.client_feedback is null or btrim(new.client_feedback) = '') then
    raise exception 'Client feedback is required when requesting changes';
  end if;

  if tg_op = 'UPDATE'
    and old.status = 'changes_requested'
    and new.status = 'changes_requested'
    and (new.file_path is distinct from old.file_path or new.description is distinct from old.description)
    and new.file_path is null then
    raise exception 'A deliverable must have a file before it can be resubmitted for review';
  end if;

  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    v_allowed := case old.status::text
      when 'draft' then new.status::text = 'in_review'
      when 'in_review' then new.status::text in ('approved', 'changes_requested')
      when 'changes_requested' then new.status::text = 'in_review'
      else false
    end;

    if not coalesce(v_allowed, false) then
      raise exception 'A deliverable cannot move from % to %.', old.status, new.status
        using hint = 'Allowed transitions: draft -> in_review, in_review -> approved or changes_requested, changes_requested -> in_review.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_deliverable_workflow on public.deliverables;
create trigger trg_enforce_deliverable_workflow
  before insert or update on public.deliverables
  for each row execute function public.enforce_deliverable_workflow();

create or replace function public.enforce_project_archive()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'archived' and old.status <> 'archived' then
    if exists (
      select 1
      from public.deliverables
      where project_id = new.id
        and status in ('in_review', 'changes_requested')
    ) then
      raise exception 'Projects with deliverables awaiting review or changes cannot be archived';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_project_archive on public.projects;
create trigger trg_enforce_project_archive
  before update on public.projects
  for each row execute function public.enforce_project_archive();

create or replace function public.enforce_org_currency()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.currency_code is distinct from old.currency_code then
    if exists (
      select 1
      from public.invoices
      where org_id = new.id
        and status <> 'draft'
    ) then
      raise exception 'Currency cannot change while the organisation has non-draft invoices';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_org_currency on public.organisations;
create trigger trg_enforce_org_currency
  before update on public.organisations
  for each row execute function public.enforce_org_currency();

select supasheet.refresh_metadata();
