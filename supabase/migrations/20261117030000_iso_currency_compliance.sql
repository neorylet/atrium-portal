-- ==========================================
-- ISO 4217 Currency Compliance & E-Invoicing Fields
-- ==========================================
-- This migration enforces ISO 4217 currency validation on organisations
-- and adds tax breakdown fields to invoices for e-invoicing compliance.

-- 1. Enforce ISO 4217 on Organisations (CHECK constraint)
ALTER TABLE public.organisations 
ADD CONSTRAINT organisations_currency_iso_check 
CHECK (currency_code IN ('USD', 'PHP', 'EUR', 'GBP', 'AUD', 'CAD'));

-- 2. Add E-Invoicing Financial Fields to Invoices
ALTER TABLE public.invoices ADD COLUMN subtotal numeric(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0);
ALTER TABLE public.invoices ADD COLUMN tax_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0);
ALTER TABLE public.invoices ADD COLUMN discount_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0);

-- 3. Update Metadata for UI Dropdowns

-- Organisations currency dropdown
COMMENT ON COLUMN public.organisations.currency_code IS '{
  "name": "Currency Code",
  "values": {
    "USD": "USD - US Dollar",
    "PHP": "PHP - Philippine Peso",
    "EUR": "EUR - Euro",
    "GBP": "GBP - British Pound",
    "AUD": "AUD - Australian Dollar",
    "CAD": "CAD - Canadian Dollar"
  }
}';

-- New invoice financial fields
COMMENT ON COLUMN public.invoices.subtotal IS '{"name": "Subtotal"}';
COMMENT ON COLUMN public.invoices.tax_amount IS '{"name": "Tax Amount"}';
COMMENT ON COLUMN public.invoices.discount_amount IS '{"name": "Discount Amount"}';

-- 4. Refresh metadata to apply UI changes
select supasheet.refresh_metadata();
