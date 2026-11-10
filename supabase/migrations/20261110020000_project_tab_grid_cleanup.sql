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
-- 2. CLEAN UP INVOICES GRID
-- ==========================================
COMMENT ON TABLE public.invoices IS '{
  "display": "Invoices",
  "icon": "Receipt",
  "fields": {
    "sections": [
      {"id": "overview", "title": "Invoice Details", "fields": ["invoice_number", "currency", "amount", "status", "issued_on", "due_on"]},
      {"id": "financials", "title": "Financials", "fields": ["notes"]}
    ],
    "metadata": ["id", "org_id", "project_id", "paid_on", "created_at", "updated_at", "created_by", "updated_by"]
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

-- 3. Hide the 'amount' field from the create form (since it auto-calculates), but keep it in the grid!
COMMENT ON COLUMN public.invoices.amount IS '{"name": "Amount", "variant": "money", "hidden_in_form": true}';

-- 4. Refresh Supasheet
select supasheet.refresh_metadata();