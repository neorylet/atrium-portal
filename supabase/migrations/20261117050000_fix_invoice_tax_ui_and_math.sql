-- ==========================================
-- Invoice Tax UI & Math Fix
-- ==========================================
-- This migration surfaces the new tax fields in the UI and fixes the
-- calculate_invoice_total trigger to properly compute subtotal, tax, and total.

-- 1. Update Invoice Table Metadata to include new tax fields
COMMENT ON TABLE public.invoices IS '{
  "display": "Invoices",
  "icon": "Receipt",
  "fields": {
    "sections": [
      {"id": "overview", "title": "Invoice Details", "fields": ["invoice_number", "project_id", "status", "issued_on", "due_on", "paid_on"]},
      {"id": "financials", "title": "Financials", "fields": ["subtotal", "tax_amount", "discount_amount", "amount", "currency", "notes"]}
    ],
    "metadata": ["id", "org_id", "created_at", "updated_at", "created_by", "updated_by"]
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

-- 2. Add variant: "text" to invoice_number and notes to prevent "EMPTY" placeholders
COMMENT ON COLUMN public.invoices.invoice_number IS '{"name": "Invoice Number", "variant": "text"}';
COMMENT ON COLUMN public.invoices.notes IS '{"name": "Notes", "variant": "text"}';

-- 3. Rewrite calculate_invoice_total to handle subtotal, tax, and discount
CREATE OR REPLACE FUNCTION public.calculate_invoice_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_subtotal numeric(12,2);
  v_invoice_id uuid;
BEGIN
  -- Determine which invoice we're working with
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
  
  -- If this is an invoice update (tax_amount or discount_amount changed),
  -- recalculate the total based on the current subtotal
  IF TG_TABLE_NAME = 'invoices' THEN
    v_invoice_id := COALESCE(NEW.id, OLD.id);
    
    -- Get the current subtotal from line items
    SELECT COALESCE(SUM(quantity * unit_price), 0) INTO v_subtotal
    FROM public.invoice_items
    WHERE invoice_id = v_invoice_id;
    
    -- Update the invoice with the new totals
    UPDATE public.invoices
    SET 
      subtotal = v_subtotal,
      amount = v_subtotal - COALESCE(NEW.discount_amount, 0) + COALESCE(NEW.tax_amount, 0)
    WHERE id = v_invoice_id;
    
    RETURN NEW;
  END IF;
  
  -- If this is an invoice_items change, recalculate everything
  IF TG_TABLE_NAME = 'invoice_items' THEN
    -- Calculate new subtotal from line items
    SELECT COALESCE(SUM(quantity * unit_price), 0) INTO v_subtotal
    FROM public.invoice_items
    WHERE invoice_id = v_invoice_id;
    
    -- Update the invoice with new subtotal and recalculate total
    UPDATE public.invoices
    SET 
      subtotal = v_subtotal,
      amount = v_subtotal - discount_amount + tax_amount
    WHERE id = v_invoice_id;
    
    RETURN NULL; -- Return null for AFTER trigger on invoice_items
  END IF;
  
  RETURN NULL;
END;
$$;

-- 4. Update triggers
-- Keep the existing trigger on invoice_items
DROP TRIGGER IF EXISTS trg_calc_invoice_total ON public.invoice_items;
CREATE TRIGGER trg_calc_invoice_total
AFTER INSERT OR UPDATE OR DELETE ON public.invoice_items
FOR EACH ROW EXECUTE FUNCTION public.calculate_invoice_total();

-- Add a new trigger on invoices to recalculate when tax/discount changes
DROP TRIGGER IF EXISTS trg_calc_invoice_totals ON public.invoices;
CREATE TRIGGER trg_calc_invoice_totals
AFTER UPDATE OF tax_amount, discount_amount ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.calculate_invoice_total();

-- 5. Refresh metadata
select supasheet.refresh_metadata();
