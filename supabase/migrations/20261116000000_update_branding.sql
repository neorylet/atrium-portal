-- ==========================================
-- FIX: Update branding from Supasheet to Atrium Portal
-- ==========================================

INSERT INTO supasheet.configs (key, value, is_public)
VALUES 
  ('app.name', '"Atrium Portal"', true),
  ('app.description', '"Agency Project Management"', true)
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value;
