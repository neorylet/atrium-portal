create or replace function supasheet.get_related_tables (
  schema_name text,
  table_name text,
  p_caller text default current_user
) returns table (
  id bigint,
  schema text,
  name text,
  rls_enabled boolean,
  rls_forced boolean,
  replica_identity text,
  bytes int8,
  size text,
  live_rows_estimate int8,
  dead_rows_estimate int8,
  comment text,
  primary_keys jsonb,
  relationships jsonb
) language sql security definer
set search_path = '' as $$
  select
    t.id,
    t.schema,
    t.name,
    t.rls_enabled,
    t.rls_forced,
    t.replica_identity,
    t.bytes,
    t.size,
    t.live_rows_estimate,
    t.dead_rows_estimate,
    t.comment,
    t.primary_keys,
    t.relationships
  from supasheet.tables t
  where has_table_privilege(p_caller, t.id::oid, 'select')
    and (
      not (t.schema = schema_name and t.name = table_name)
      or exists (
        select 1
        from jsonb_array_elements(t.relationships) as rel
        where rel->>'source_schema' = schema_name
          and rel->>'source_table_name' = table_name
          and rel->>'target_table_schema' = schema_name
          and rel->>'target_table_name' = table_name
      )
    )
    and exists (
      select 1
      from jsonb_array_elements(t.relationships) as rel
      where (
        (rel->>'source_table_name' = table_name and rel->>'source_schema' = schema_name)
        or (rel->>'target_table_name' = table_name and rel->>'target_table_schema' = schema_name)
      )
    );
$$;

revoke all on function supasheet.get_related_tables (text, text, text)
from
  public,
  anon,
  authenticated,
  service_role;

grant execute on function supasheet.get_related_tables (text, text, text) to authenticated;

select supasheet.refresh_metadata();
