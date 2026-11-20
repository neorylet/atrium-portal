-- ==========================================
-- SECURITY: Audit Log Immutability
-- ==========================================
-- This migration enforces that audit logs are strictly append-only.
-- Even though GRANT statements already prevent UPDATE/DELETE, this
-- trigger acts as a bulletproof safety net at the database level.

create or replace function public.prevent_audit_log_mutation()
returns trigger as $$
begin
  raise exception 'Audit logs are immutable and cannot be modified or deleted.';
end;
$$ language plpgsql set search_path = '';

drop trigger if exists trg_prevent_audit_log_mutation on supasheet.audit_logs;
create trigger trg_prevent_audit_log_mutation
before update or delete on supasheet.audit_logs
for each row execute function public.prevent_audit_log_mutation();
