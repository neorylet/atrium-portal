alter table supasheet.email_outbox add column if not exists claimed_at timestamptz;

alter table supasheet.email_outbox drop constraint if exists email_outbox_status_check;

alter table supasheet.email_outbox
add constraint email_outbox_status_check
check (status in ('pending', 'processing', 'sent', 'failed'));

create index if not exists idx_email_outbox_claim
on supasheet.email_outbox (status, claimed_at, created_at);

create or replace function supasheet.claim_email_outbox_batch (
  p_limit int default 10,
  p_stale_after interval default interval '10 minutes'
) returns table (
  id uuid,
  recipient_email text,
  subject text,
  body text
) language sql security definer
set search_path = '' as $$
  with candidates as (
    select id
    from supasheet.email_outbox
    where status = 'pending'
      or (
        status = 'processing'
        and claimed_at is not null
        and claimed_at < now() - p_stale_after
      )
    order by created_at
    for update skip locked
    limit least(greatest(p_limit, 1), 100)
  )
  update supasheet.email_outbox o
  set status = 'processing',
      claimed_at = now(),
      error_message = null
  from candidates c
  where o.id = c.id
  returning o.id, o.recipient_email, o.subject, o.body;
$$;

revoke all on function supasheet.claim_email_outbox_batch (int, interval)
from public, anon, authenticated, service_role, client, "x-admin";

grant execute on function supasheet.claim_email_outbox_batch (int, interval) to service_role;

select supasheet.refresh_metadata();
