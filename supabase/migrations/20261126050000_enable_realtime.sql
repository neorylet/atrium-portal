-- Use DO blocks to safely add tables to realtime without crashing if they are already there
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.invoice_items;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE supasheet.audit_logs;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.deliverables;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.organisations;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Added this just in case it wasn't added in the notifications migration
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE supasheet.user_notifications;
EXCEPTION WHEN duplicate_object THEN null; END $$;