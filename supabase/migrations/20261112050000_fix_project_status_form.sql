-- Fix Projects: Hide the generic status dropdown and rely on the visual stepper
COMMENT ON TABLE public.projects IS '{
  "display": "Projects",
  "icon": "FolderKanban",
  "primary_view": "kanban",
  "views": [
    {"id": "kanban", "name": "Kanban", "type": "kanban", "group": "status", "title": "name", "description": "description", "date": "due_date"}
  ],
  "fields": {
    "sections": [
      {"id": "overview", "title": "Overview", "fields": ["name", "org_id", "start_date", "due_date"]},
      {"id": "details", "title": "Details", "fields": ["description"]}
    ],
    "metadata": ["id", "status", "created_at", "updated_at", "created_by", "updated_by"]
  },
  "detail": {
    "header": {"title": "name", "badges": ["status"]},
    "tabs": ["deliverables", "invoices"]
  },
  "query": {
    "join": [
      {"table": "organisations", "on": "org_id", "columns": ["name"]}
    ]
  }
}';

-- Ensure the status column has the progress flag so the stepper renders
COMMENT ON COLUMN public.projects.status IS '{
  "progress": true,
  "values": {
    "planning": {"variant": "secondary", "icon": "Pencil"},
    "active": {"variant": "info", "icon": "Loader"},
    "on_hold": {"variant": "warning", "icon": "Pause"},
    "completed": {"variant": "success", "icon": "CheckCircle2"},
    "archived": {"variant": "default", "icon": "Archive"}
  }
}';

select supasheet.refresh_metadata();