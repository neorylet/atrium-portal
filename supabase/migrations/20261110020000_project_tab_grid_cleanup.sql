-- ==========================================
-- 1. CLEAN UP DELIVERABLES GRID
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
      {"id": "details", "title": "Deliverable Details", "fields": ["title", "description", "status", "due_date"]},
      {"id": "file", "title": "Attachment", "fields": ["file_path"]},
      {"id": "review", "title": "Client Review", "fields": ["client_feedback"]}
    ],
    "metadata": ["id", "org_id", "project_id", "created_at", "updated_at", "created_by", "updated_by", "approved_at"]
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

-- ==========================================
-- 2. CLEAN UP INVOICES GRID (Exact Order)
-- ==========================================
COMMENT ON TABLE public.invoices IS '{
  "display": "Invoices",
  "icon": "Receipt",
  "fields": {
    "sections": [
      {
        "id": "overview", 
        "title": "Invoice Details", 
        "fields": [
          "invoice_number", 
          "currency", 
          "amount", 
          "status", 
          "issued_on", 
          "due_on", 
          "paid_on", 
          "project_id", 
          "notes"
        ]
      }
    ],
    "metadata": ["id", "org_id", "created_at", "updated_at", "created_by", "updated_by"]
  },
  "detail": {
    "header": {"title": "invoice_number", "badges": ["status"]},
    "tabs": ["invoice_items"]
  },
  "query": {
    "join": [
      {"table": "projects", "on": "project_id", "columns": ["name"]},
      {"table": "organisations", "on": "org_id", "columns": ["name"]}
    ]
  }
}';

-- 3. Ensure clean labels
COMMENT ON COLUMN public.invoices.issued_on IS '{"name": "Issued On"}';
COMMENT ON COLUMN public.invoices.due_on IS '{"name": "Due On"}';
COMMENT ON COLUMN public.invoices.paid_on IS '{"name": "Paid On"}';
COMMENT ON COLUMN public.invoices.project_id IS '{"name": "Project", "foreignTable": "projects", "displayColumn": "name"}';
COMMENT ON COLUMN public.invoices.notes IS '{"name": "Notes"}';

-- 4. The Magic Flag! Hides in form, shows in grid.
COMMENT ON COLUMN public.invoices.amount IS '{"name": "Amount", "variant": "money", "hidden_in_form": true}';

-- 5. Refresh Supasheet
select supasheet.refresh_metadata();