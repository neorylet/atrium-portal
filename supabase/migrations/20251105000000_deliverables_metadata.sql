-- 1. Update the table metadata (removed the broken users join)
COMMENT ON TABLE public.deliverables IS '{
  "display": "Deliverables",
  "icon": "FileText",
  "primary_view": "gallery",
  "views": [
    { "id": "gallery", "type": "gallery", "name": "Deliverable Gallery", "cover": "file_path", "title": "title", "badge": "status" }
  ],
  "query": {
    "join": [
      {"table": "projects", "on": "project_id", "columns": ["name"]},
      {"table": "organisations", "on": "org_id", "columns": ["name"]}
    ]
  }
}';

-- 2. Use column metadata to look up the user's name
COMMENT ON COLUMN public.deliverables.updated_by IS '{"name": "Updated By", "foreignTable": "users", "displayColumn": "name"}';

SELECT supasheet.refresh_metadata();