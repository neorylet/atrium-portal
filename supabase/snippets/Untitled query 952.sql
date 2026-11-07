select 'function' kind, p.proname::text name, pg_get_functiondef(p.oid) def
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public','supasheet') and p.prokind = 'f'
  and pg_get_functiondef(p.oid) ilike '%approved%'
union all
select 'policy', tablename::text || '.' || policyname::text,
       coalesce(qual,'') || ' | ' || coalesce(with_check,'')
from pg_policies
where schemaname = 'public'
  and (coalesce(qual,'') || coalesce(with_check,'')) ilike '%approved%'
union all
select 'view', viewname::text, definition
from pg_views where schemaname = 'public' and definition ilike '%approved%'
union all
select 'constraint', conrelid::regclass::text || '.' || conname::text, pg_get_constraintdef(oid)
from pg_constraint
where connamespace = 'public'::regnamespace
  and pg_get_constraintdef(oid) ilike '%approved%';