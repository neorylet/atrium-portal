-- supabase/seed.sql
-- Wipe existing data to ensure a clean slate on db reset
TRUNCATE TABLE public.invoices, public.deliverables, public.projects, public.organisations CASCADE;

insert into public.organisations (id, name, slug, billing_email) values
  ('a0000000-0000-4000-8000-000000000001', 'Acme Corp', 'acme-corp', 'billing@acme.example'),
  ('a0000000-0000-4000-8000-000000000002', 'Beta Industries', 'beta-industries', 'billing@beta.example')
on conflict (id) do nothing;

-- Insert Users into auth.users
-- CRITICAL: We added "role":"client" to Priya and Omar's raw_app_meta_data so the JWT hook works.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
values
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-000000000001', 'authenticated', 'client', 'priya@acme.example', crypt('password123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"org_id":"a0000000-0000-4000-8000-000000000001","role":"client"}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-000000000002', 'authenticated', 'client', 'omar@beta.example', crypt('password123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"org_id":"a0000000-0000-4000-8000-000000000002","role":"client"}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-000000000003', 'authenticated', 'x-admin', 'dana@atrium.example', crypt('password123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"x-admin"}', '{}', now(), now(), '', '', '', '')
on conflict (id) do update set 
  encrypted_password = excluded.encrypted_password,
  raw_app_meta_data = excluded.raw_app_meta_data;

-- Insert Identities
insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
values 
  (gen_random_uuid(), 'c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'email', '{"sub":"c0000000-0000-4000-8000-000000000001","email":"priya@acme.example","email_verified":true}', now(), now(), now()),
  (gen_random_uuid(), 'c0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', 'email', '{"sub":"c0000000-0000-4000-8000-000000000002","email":"omar@beta.example","email_verified":true}', now(), now(), now()),
  (gen_random_uuid(), 'c0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000003', 'email', '{"sub":"c0000000-0000-4000-8000-000000000003","email":"dana@atrium.example","email_verified":true}', now(), now(), now())
on conflict (id) do nothing;

-- Insert Projects
insert into public.projects (id, org_id, name, status) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Brand refresh', 'active'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Web redesign', 'active'),
  ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'Logo suite', 'completed'),
  ('b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000002', 'Packaging system', 'active'),
  ('b0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000002', 'Trade-show booth', 'on_hold')
on conflict (id) do nothing;

-- Insert Deliverables
insert into public.deliverables (id, org_id, project_id, title, status) values
  ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Brand guidelines v2', 'in_review'),
  ('d0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000004', 'CONFIDENTIAL - Beta pricing deck', 'in_review')
on conflict (id) do nothing;

-- Insert Invoices
insert into public.invoices (id, org_id, project_id, invoice_number, status, amount_cents) values
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'ATR-2026-0001', 'paid', 480000),
  ('e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000004', 'ATR-2026-0002', 'overdue', 777700)
on conflict (id) do nothing;

-- Supasheet internal user profiles (MUST match the auth.users IDs)
insert into supasheet.users (id, email, name) values 
  ('c0000000-0000-4000-8000-000000000001', 'priya@acme.example', 'Priya Raman'), 
  ('c0000000-0000-4000-8000-000000000002', 'omar@beta.example', 'Omar'), 
  ('c0000000-0000-4000-8000-000000000003', 'dana@atrium.example', 'Dana Okafor')
on conflict (id) do update set email = excluded.email, name = excluded.name;

-- Supasheet grants and configs
grant usage on schema supasheet to anon, authenticated, client, "x-admin";
grant select on supasheet.configs to anon, authenticated, client, "x-admin";
grant select on supasheet.users to authenticated, client, "x-admin";
grant execute on all functions in schema supasheet to anon, authenticated, client, "x-admin";
grant select on storage.buckets to client, "x-admin";
grant select on storage.objects to client, "x-admin";

drop policy if exists users_read_custom_roles on supasheet.users;
create policy users_read_custom_roles on supasheet.users for select to client, "x-admin"
  using (id = auth.uid());

INSERT INTO supasheet.configs (key, value, description, is_public)
VALUES 
  ('app.name', '"Atrium Portal"', 'Application display name', true),
  ('app.description', '"A clear pane between agency and client."', 'Shown on the sign-in page', true)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;