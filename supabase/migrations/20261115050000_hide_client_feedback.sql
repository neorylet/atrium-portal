-- ==========================================
-- FIX: Hide client_feedback from admin form
-- Move client_feedback from sections to metadata array
-- ==========================================
COMMENT ON TABLE public.deliverables IS '{
  "display": "Deliverables",
  "icon": "FileText",
  "primary_view": "gallery",
  "views": [
    {
      "id": "gallery",
      "type": "gallery",
      "name": "Deliverable Gallery",
      "cover": "file_path",
      "title": "title",
      "badge": "status"
    }
  ],
  "fields": {
    "sections": [
      {"id": "details", "title": "Deliverable Details", "fields": ["title", "project_id", "description", "due_date"]},
      {"id": "file", "title": "Attachment", "fields": ["file_path"]}
    ],
    "metadata": ["id", "org_id", "status", "client_feedback", "created_at", "updated_at", "created_by", "updated_by", "approved_at"]
  },
  "detail": {
    "header": {"title": "title", "badges": ["status"]},
    "tabs": []
  },
  "query": {
    "join": [
      {"table": "projects", "on": "project_id", "columns": ["name"]},
      {"table": "organisations", "on": "org_id", "columns": ["name"]}
    ]
  }
}';

select supasheet.refresh_metadata();
