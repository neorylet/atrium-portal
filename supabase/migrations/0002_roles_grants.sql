-- 0002_roles_grants.sql

-- Create roles if they don't exist
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'client') then
    create role client nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'x-admin') then
    create role "x-admin" nologin noinherit;
  end if;
end $$;

-- Allow PostgREST to switch into these roles
grant client to authenticator;
grant "x-admin" to authenticator;

-- Grant schema usage and JWT execution rights
grant usage on schema public to client, "x-admin";
grant usage on schema auth to client, "x-admin";
grant usage on schema supasheet to authenticator, anon, authenticated, service_role;
grant usage on schema supasheet to client, "x-admin";
grant execute on function auth.jwt() to client, "x-admin";

-- Revoke default access ONLY from the built-in Supabase roles
revoke all on public.organisations from public, anon, authenticated;
revoke all on public.projects from public, anon, authenticated;
revoke all on public.deliverables from public, anon, authenticated;
revoke all on public.invoices from public, anon, authenticated;

-- Grant access to the client role
grant select on public.organisations to client;
grant select on public.projects to client;
grant select on public.deliverables to client;
grant update (client_feedback, status) on public.deliverables to client;
grant select on public.invoices to client;

-- Grant access to the x-admin role
grant select, insert, update, delete on public.organisations to "x-admin";
grant select, insert, update, delete on public.projects to "x-admin";
grant select, insert, update, delete on public.deliverables to "x-admin";
grant select, insert, update, delete on public.invoices to "x-admin";

grant execute on all functions in schema supasheet to anon, authenticated, client, "x-admin";

select supasheet.refresh_metadata();