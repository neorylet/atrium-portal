COMMENT ON COLUMN public.invoices.invoice_number IS '{"name": "Invoice Number", "variant": "text"}';

select supasheet.refresh_metadata();
