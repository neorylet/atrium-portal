-- Enable Realtime for the invoice_items table
ALTER PUBLICATION supabase_realtime ADD TABLE public.invoice_items;

-- Also enable it for invoices, so if the trigger updates the `amount`, the UI catches it.
ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;

-- Enable Realtime for core application tables so lists update automatically
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deliverables;
ALTER PUBLICATION supabase_realtime ADD TABLE public.organisations;