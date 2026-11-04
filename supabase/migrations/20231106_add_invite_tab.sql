-- Add the Invite tab to the organisation detail view while preserving all fields
COMMENT ON TABLE public.organisations IS '{
  "display": "Organisations",
  "icon": "Building2",
  "fields": {
    "sections": [
      {"id": "general", "title": "Company Profile", "fields": ["name", "slug", "status", "logo_url", "website", "phone_number"]},
      {"id": "billing", "title": "Billing & Financials", "fields": ["billing_email", "currency_code", "tax_id"]},
      {"id": "address", "title": "Registered Address", "fields": ["address_line_1", "address_line_2", "city", "state_province", "postal_code", "country_code"]},
      {"id": "settings", "title": "System Settings", "fields": ["timezone"]}
    ]
  },
  "detail": {
    "header": {"title": "name"},
    "tabs": ["projects", "deliverables", "invoices", "invite"]
  }
}';