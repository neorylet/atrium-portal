-- 1. Create a native Postgres Enum for Currency (this forces the dropdown UI)
DO $$ BEGIN
    CREATE TYPE public.invoice_currency AS ENUM ('USD', 'PHP', 'EUR', 'GBP', 'AUD', 'CAD');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Change the currency column to use the enum, safely migrating existing data
ALTER TABLE public.invoices ALTER COLUMN currency DROP DEFAULT;
ALTER TABLE public.invoices ALTER COLUMN currency TYPE public.invoice_currency USING currency::text::public.invoice_currency;
ALTER TABLE public.invoices ALTER COLUMN currency SET DEFAULT 'USD';

-- 3. Allow creating invoices without manually typing the amount
ALTER TABLE public.invoices ALTER COLUMN amount SET DEFAULT 0;

-- 4. Set status default so it doesn't say "DEFAULT VALUE"
ALTER TABLE public.invoices ALTER COLUMN status SET DEFAULT 'draft';

-- 5. Drop the old JSONB column since we use the invoice_items table now
ALTER TABLE public.invoices DROP COLUMN IF EXISTS line_items;

-- 6. Create a bulletproof trigger for org_id
CREATE OR REPLACE FUNCTION public.set_invoice_org_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.project_id IS NOT NULL THEN
    SELECT org_id INTO NEW.org_id FROM public.projects WHERE id = NEW.project_id;
  END IF;

  IF NEW.org_id IS NULL THEN
    NEW.org_id := (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_org_invoices ON public.invoices;
CREATE TRIGGER trg_set_org_invoices
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_invoice_org_id();

-- 7. Update Metadata
COMMENT ON TABLE public.invoices IS '{
  "display": "Invoices",
  "icon": "Receipt",
  "fields": {
    "sections": [
      {"id": "overview", "title": "Invoice Details", "fields": ["invoice_number", "project_id", "status", "issued_on", "due_on", "paid_on"]},
      {"id": "financials", "title": "Financials", "fields": ["currency", "notes"]}
    ],
    "metadata": ["id", "org_id", "amount", "created_at", "updated_at", "created_by", "updated_by"]
  },
  "detail": {
    "header": {"title": "invoice_number", "badges": ["status"]},
    "tabs": ["invoice_items"]
  },
  "query": {
    "join": [
      {"table": "projects", "on": "project_id", "columns": ["name"]},
      {"table": "organisations", "on": "org_id", "columns": ["name"]}
    ]
  }
}';

select supasheet.refresh_metadata();