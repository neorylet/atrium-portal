COMMENT ON COLUMN public.deliverables.file_path IS '{
  "name": "File",
  "variant": "file",
  "accept": ["image/jpeg", "image/png", "image/webp", "application/pdf", "application/zip"]
}';

select supasheet.refresh_metadata();
