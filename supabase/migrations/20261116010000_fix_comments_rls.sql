-- P0: close the cross-tenant leak on supasheet.comments.
--
-- The previous clients_can_view_comments / clients_can_insert_comments
-- policies used USING (true) / WITH CHECK (true), which let any client read
-- every comment and insert comments with an arbitrary author.
--
-- Comments are now scoped to the author's organisation and the author is
-- always derived from the JWT on insert.

alter table supasheet.comments
  add column if not exists org_id uuid references public.organisations (id) on delete set null;

create index if not exists idx_comments_org_id on supasheet.comments (org_id);

-- Backfill legacy comments from the author's app_metadata.org_id. Rows whose
-- author (or org) can no longer be resolved stay null and are hidden by RLS.
update supasheet.comments c
set org_id = nullif(au.raw_app_meta_data ->> 'org_id', '')::uuid
from auth.users au
where c.org_id is null
  and c.created_by = au.id
  and nullif(au.raw_app_meta_data ->> 'org_id', '') is not null;

-- Force tenant + author on every new comment, regardless of what the client
-- sends in the payload.
create or replace function supasheet.set_comment_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.org_id := (select (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);
  new.created_by := (select auth.uid());
  return new;
end;
$$;

drop trigger if exists trg_set_comment_tenant on supasheet.comments;

create trigger trg_set_comment_tenant
before insert on supasheet.comments
for each row execute function supasheet.set_comment_tenant();

-- Remove the permissive policies on the live table.
drop policy if exists clients_can_view_comments on supasheet.comments;
drop policy if exists clients_can_insert_comments on supasheet.comments;

-- Remove the same policies from public.comments when that legacy table exists.
do $$
begin
  if to_regclass('public.comments') is not null then
    drop policy if exists clients_can_view_comments on public.comments;
    drop policy if exists clients_can_insert_comments on public.comments;
  end if;
end $$;

grant select, insert on supasheet.comments to client, authenticated;

-- Strict tenant-scoped replacements.
drop policy if exists comments_org_select on supasheet.comments;

create policy comments_org_select on supasheet.comments
  for select to client, authenticated
  using (
    org_id = (select (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid)
  );

drop policy if exists comments_org_insert on supasheet.comments;

create policy comments_org_insert on supasheet.comments
  for insert to client, authenticated
  with check (
    org_id = (select (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid)
    and created_by = (select auth.uid())
  );

select supasheet.refresh_metadata();
