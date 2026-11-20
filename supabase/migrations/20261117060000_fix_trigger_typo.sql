-- ==========================================
-- Fix Invoice Trigger Typo and Math Logic
-- ==========================================
-- This migration fixes the trigger typo (NEW.invoice -> NEW.invoice_id)
-- and changes the invoice trigger to BEFORE UPDATE to properly recalculate totals.

-- 1. Rewrite calculate_invoice_total to fix typo and improve logic
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
  -- If this is an invoice_items change, recalculate everything
  IF TG_TABLE_NAME = 'invoice_items' THEN
    -- Determine which invoice we're working with
    v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
    
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
  
  -- If this is an invoice update (tax_amount, discount_amount, or subtotal changed),
  -- recalculate the total directly on the row being updated
  IF TG_TABLE_NAME = 'invoices' THEN
    -- Calculate subtotal from line items (in case it wasn't set)
    SELECT COALESCE(SUM(quantity * unit_price), 0) INTO v_subtotal
    FROM public.invoice_items
    WHERE invoice_id = NEW.id;
    
    -- Update the row being modified
    NEW.subtotal := v_subtotal;
    NEW.amount := v_subtotal - COALESCE(NEW.discount_amount, 0) + COALESCE(NEW.tax_amount, 0);
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;

-- 2. Update triggers
-- Keep the existing AFTER trigger on invoice_items
DROP TRIGGER IF EXISTS trg_calc_invoice_total ON public.invoice_items;
CREATE TRIGGER trg_calc_invoice_total
AFTER INSERT OR UPDATE OR DELETE ON public.invoice_items
FOR EACH ROW EXECUTE FUNCTION public.calculate_invoice_total();

-- Change the invoice trigger to BEFORE UPDATE to modify the row directly
DROP TRIGGER IF EXISTS trg_calc_invoice_totals ON public.invoices;
CREATE TRIGGER trg_calc_invoice_totals
BEFORE UPDATE OF tax_amount, discount_amount, subtotal ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.calculate_invoice_total();

-- 3. Refresh metadata
select supasheet.refresh_metadata();
