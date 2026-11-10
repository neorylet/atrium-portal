-- Enable Realtime for the invoice_items table
ALTER PUBLICATION supabase_realtime ADD TABLE public.invoice_items;

-- Also enable it for invoices, so if the trigger updates the `amount`, the UI catches it.
ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;