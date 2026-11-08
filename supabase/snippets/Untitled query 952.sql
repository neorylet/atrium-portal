-- 1. Hide the individual columns in the grid
comment on column public.invoice_items.id is '{"hidden": true}';
comment on column public.invoice_items.invoice_id is '{"hidden": true}';
comment on column public.invoice_items.created_at is '{"hidden": true}';

-- 2. Update the table comment to remove them from metadata
comment on table public.invoice_items is '{
  "display": "none",
  "hidden": true,
  "icon": "List",
  "fields": {
    "sections": [
      {"id": "details", "title": "Line Item", "fields": ["description", "quantity", "unit_price"]}
    ],
    "metadata": []
  }
}';

-- 3. Tell Supasheet to refresh the UI cache
select supasheet.refresh_metadata();