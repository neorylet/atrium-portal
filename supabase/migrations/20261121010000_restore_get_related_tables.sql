drop function if exists supasheet.get_related_tables (text, text);

create or replace function supasheet.get_related_tables (
  schema_name text,
  table_name text,
  p_caller text default current_user
) RETURNS table (
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
) LANGUAGE sql SECURITY DEFINER
set
  search_path = '' as $$
    SELECT
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
    FROM supasheet.tables t
    WHERE has_table_privilege(p_caller, t.id::oid, 'select')
        AND (
            NOT (t.schema = schema_name AND t.name = table_name)
            OR EXISTS (
                SELECT 1
                FROM jsonb_array_elements(t.relationships) AS rel
                WHERE rel->>'source_schema' = schema_name
                    AND rel->>'source_table_name' = table_name
                    AND rel->>'target_table_schema' = schema_name
                    AND rel->>'target_table_name' = table_name
            )
        )
        AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements(t.relationships) AS rel
            WHERE (
                (rel->>'source_table_name' = table_name AND rel->>'source_schema' = schema_name)
                OR
                (rel->>'target_table_name' = table_name AND rel->>'target_table_schema' = schema_name)
            )
        );
$$;

revoke all on FUNCTION supasheet.get_related_tables (text, text, text)
from
  public,
  anon,
  authenticated,
  service_role,
  client,
  "x-admin";

grant
execute on FUNCTION supasheet.get_related_tables (text, text, text) to authenticated,
client;

select supasheet.refresh_metadata();
