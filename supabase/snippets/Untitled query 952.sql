-- Change the column back to text
ALTER TABLE public.deliverables 
ALTER COLUMN file_path TYPE text USING 
  CASE 
    WHEN file_path IS NULL THEN NULL 
    ELSE file_path::text 
  END;

-- Update the comment so it knows it's a file
COMMENT ON COLUMN public.deliverables.file_path IS '{"name": "Attachment", "variant": "file", "accept": "*"}';

-- Reload the cache
NOTIFY pgrst, 'reload schema';
SELECT supasheet.refresh_metadata();