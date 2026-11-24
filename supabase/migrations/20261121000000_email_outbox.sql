create table if not exists supasheet.email_outbox (
  id uuid primary key default extensions.uuid_generate_v4 (),
  recipient_email text not null,
  subject text not null,
  body text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

comment on table supasheet.email_outbox is '{
  "display": "none"
}';

revoke all on table supasheet.email_outbox
from
  public,
  anon,
  authenticated,
  service_role,
  client,
  "x-admin";

grant select, insert, update, delete on table supasheet.email_outbox to service_role;

alter table supasheet.email_outbox enable row level security;

create index if not exists idx_email_outbox_status_created_at
on supasheet.email_outbox (status, created_at);

create or replace function supasheet.get_user_email (p_user_id uuid)
returns text language sql security definer
set search_path = '' as $$
  select email from auth.users where id = p_user_id;
$$;

revoke all on function supasheet.get_user_email (uuid)
from
  public,
  anon,
  authenticated,
  service_role,
  client,
  "x-admin";

grant execute on function supasheet.get_user_email (uuid) to service_role;

create or replace function supasheet.queue_email_on_notification ()
returns trigger language plpgsql security definer
set search_path = '' as $$
declare
  v_email text;
  v_notification record;
begin
  v_email := supasheet.get_user_email (NEW.user_id);

  if v_email is null then
    return NEW;
  end if;

  select title, body into v_notification
  from supasheet.notifications
  where id = NEW.notification_id;

  if not found then
    return NEW;
  end if;

  insert into supasheet.email_outbox (recipient_email, subject, body)
  values (v_email, v_notification.title, coalesce (v_notification.body, ''));

  return NEW;
end;
$$;

revoke all on function supasheet.queue_email_on_notification ()
from
  public,
  anon,
  authenticated,
  service_role,
  client,
  "x-admin";

drop trigger if exists trg_queue_email_on_notification on supasheet.user_notifications;

create trigger trg_queue_email_on_notification
after insert on supasheet.user_notifications
for each row execute function supasheet.queue_email_on_notification ();

select supasheet.refresh_metadata();
