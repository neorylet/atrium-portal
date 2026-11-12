-- Fix file_path column metadata to ensure it renders as a file download button
COMMENT ON COLUMN public.deliverables.file_path IS '{"name": "File", "variant": "file"}';

SELECT supasheet.refresh_metadata();
