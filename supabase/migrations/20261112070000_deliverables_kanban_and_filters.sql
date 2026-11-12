-- Add Kanban view and filter presets to Deliverables
COMMENT ON TABLE public.deliverables IS '{
  "display": "Deliverables",
  "icon": "FileText",
  "primary_view": "kanban",
  "views": [
    {
      "id": "kanban",
      "name": "Kanban",
      "type": "kanban",
      "group": "status",
      "title": "title",
      "description": "description",
      "date": "due_date"
    },
    {
      "id": "gallery",
      "type": "gallery",
      "name": "Gallery",
      "cover": "file_path",
      "title": "title",
      "badge": "status"
    }
  ],
  "filter_presets": [
    {"id": "project_id", "name": "Project", "filters": [{"id": "project_id", "value": "", "operator": "eq"}]},
    {"id": "status", "name": "Status", "filters": [{"id": "status", "value": "", "operator": "eq"}]}
  ],
  "fields": {
    "sections": [
      {"id": "details", "title": "Deliverable Details", "fields": ["title", "project_id", "description", "due_date"]},
      {"id": "file", "title": "Attachment", "fields": ["file_path"]},
      {"id": "review", "title": "Client Review", "fields": ["client_feedback"]}
    ],
    "metadata": ["id", "org_id", "status", "created_at", "updated_at", "created_by", "updated_by", "approved_at"]
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
