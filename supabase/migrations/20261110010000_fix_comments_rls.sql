DO $$
BEGIN
  -- Check if the table is in the 'public' schema
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'comments') THEN
    GRANT SELECT, INSERT ON public.comments TO client, authenticated;
    ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "clients_can_insert_comments" ON public.comments;
    CREATE POLICY "clients_can_insert_comments" ON public.comments FOR INSERT TO client, authenticated WITH CHECK (true);
    
    DROP POLICY IF EXISTS "clients_can_view_comments" ON public.comments;
    CREATE POLICY "clients_can_view_comments" ON public.comments FOR SELECT TO client, authenticated USING (true);

  -- Check if the table is in the 'supasheet' schema
  ELSIF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'supasheet' AND tablename = 'comments') THEN
    GRANT SELECT, INSERT ON supasheet.comments TO client, authenticated;
    ALTER TABLE supasheet.comments ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "clients_can_insert_comments" ON supasheet.comments;
    CREATE POLICY "clients_can_insert_comments" ON supasheet.comments FOR INSERT TO client, authenticated WITH CHECK (true);
    
    DROP POLICY IF EXISTS "clients_can_view_comments" ON supasheet.comments;
    CREATE POLICY "clients_can_view_comments" ON supasheet.comments FOR SELECT TO client, authenticated USING (true);
    
  ELSE
    RAISE NOTICE 'Comments table not found in public or supasheet schemas.';
  END IF;
END $$;

-- Refresh cache
select supasheet.refresh_metadata();