DO $$
DECLARE
    fn_name text;
BEGIN
    -- 1. Automatically find the exact name of the audit trigger function
    SELECT p.proname INTO fn_name
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'supasheet' 
      AND p.prorettype = 'pg_catalog.trigger'::regtype
      AND p.proname ILIKE '%audit%'
    LIMIT 1;

    IF fn_name IS NULL THEN
        RAISE EXCEPTION 'Could not find audit trigger function in supasheet schema. Check Supasheet migrations.';
    END IF;

    -- 2. Create triggers for Projects using the dynamically found function name
    EXECUTE format('CREATE TRIGGER audit_projects_insert AFTER INSERT ON public.projects FOR EACH ROW EXECUTE FUNCTION supasheet.%I()', fn_name);
    EXECUTE format('CREATE TRIGGER audit_projects_update AFTER UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION supasheet.%I()', fn_name);
    EXECUTE format('CREATE TRIGGER audit_projects_delete BEFORE DELETE ON public.projects FOR EACH ROW EXECUTE FUNCTION supasheet.%I()', fn_name);

    -- 3. Create triggers for Deliverables
    EXECUTE format('CREATE TRIGGER audit_deliverables_insert AFTER INSERT ON public.deliverables FOR EACH ROW EXECUTE FUNCTION supasheet.%I()', fn_name);
    EXECUTE format('CREATE TRIGGER audit_deliverables_update AFTER UPDATE ON public.deliverables FOR EACH ROW EXECUTE FUNCTION supasheet.%I()', fn_name);
    EXECUTE format('CREATE TRIGGER audit_deliverables_delete BEFORE DELETE ON public.deliverables FOR EACH ROW EXECUTE FUNCTION supasheet.%I()', fn_name);

    -- 4. Create triggers for Invoices
    EXECUTE format('CREATE TRIGGER audit_invoices_insert AFTER INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION supasheet.%I()', fn_name);
    EXECUTE format('CREATE TRIGGER audit_invoices_update AFTER UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION supasheet.%I()', fn_name);
    EXECUTE format('CREATE TRIGGER audit_invoices_delete BEFORE DELETE ON public.invoices FOR EACH ROW EXECUTE FUNCTION supasheet.%I()', fn_name);

END $$;

-- Refresh the metadata so the UI picks up the new audit tables
SELECT supasheet.refresh_metadata();