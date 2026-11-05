-- Recreate the trigger function as SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.touch_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the trigger to bypass the caller's column-level restrictions
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  IF TG_TABLE_NAME = 'deliverables' AND NEW.status = 'approved' AND OLD.status != 'approved' THEN
    NEW.approved_at = now();
  END IF;
  RETURN NEW;
END;
$$;
