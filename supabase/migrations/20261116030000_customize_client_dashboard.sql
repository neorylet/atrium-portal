-- Client dashboard customization:
-- clients get action-oriented widgets only, not agency metrics.

-- Active Projects is an agency-level aggregate; hide it from clients.
revoke select on public.widget_active_projects from client;

-- Rename the review queue to an action-oriented title and guarantee its
-- widget type is table_1.
comment on view public.widget_pending_deliverables is
  '{"type":"dashboard_widget","widget_type":"table_1","name":"Needs your attention","description":"Deliverables waiting on your review, soonest due first"}';

select supasheet.refresh_metadata();
