-- 1. Restore project_id to the form and keep status in metadata (so the stepper handles it)
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

-- 2. Enable the visual stepper for status (REMOVED hidden_in_form)
COMMENT ON COLUMN public.deliverables.status IS '{
  "name": "Status",
  "progress": true,
  "values": {
    "draft": {"variant": "secondary", "icon": "File"},
    "in_review": {"variant": "warning", "icon": "Eye"},
    "changes_requested": {"variant": "destructive", "icon": "AlertCircle"},
    "approved": {"variant": "success", "icon": "CheckCircle2"}
  }
}';

-- 3. Fix the trigger so it doesn't crash if no project is selected
create or replace function public.set_org_from_project()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- If a project is selected, get the org_id from the project
  if new.project_id is not null then
    select org_id into new.org_id from public.projects where id = new.project_id;
  end if;
  
  -- If org_id is STILL null (no project selected), fallback to the user's JWT org_id
  if new.org_id is null then
    new.org_id := (select (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);
  end if;
  
  return new;
end $$;