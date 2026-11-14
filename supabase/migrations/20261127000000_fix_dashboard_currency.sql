-- Fix dashboard currency handling and invoice currency inheritance.
--
-- This is intentionally timestamped after the 20261126* migrations:
--   * 20261126030000 creates public.invoice_currency, so the trigger below can
--     only reference it after that migration has run.
--   * 20261126000000 / 20261126020000 / 20261126030000 recreate
--     public.set_invoice_org_id() and reset invoices.currency to default 'USD'.
--     A migration dated 20261116000000 would be overwritten by those later
--     migrations during `supabase db reset`.
--   * The old total-revenue view only referenced `amount`; the new one groups by
--     `currency`, so it must be created after the enum type change is complete.

-- 1. Total Revenue: one card_6 metric per currency, never summed together.
-- CREATE OR REPLACE cannot change a view's column set, so drop and recreate.
drop view if exists public.widget_total_revenue;

create view public.widget_total_revenue
with (security_invoker = true) as
select coalesce(
  json_agg(
    json_build_object(
      'label', currency::text,
      'value', to_char(round(total, 2), 'FM999,999,990.00') || ' ' || currency::text
    )
    order by currency::text
  ),
  '[]'::json
) as metrics
from (
  select currency, sum(amount) as total
  from public.invoices
  where status = 'paid'
  group by currency
) t;

revoke all on public.widget_total_revenue from public, anon, authenticated, client;
grant select on public.widget_total_revenue to "x-admin";
comment on view public.widget_total_revenue is
  '{"type":"dashboard_widget","widget_type":"card_6","name":"Total Revenue","description":"Paid invoices by currency"}';

-- 2. Recent Invoices: show the real currency instead of a hardcoded '$'.
create or replace view public.widget_recent_invoices with (security_invoker = true) as
select
  i.id,
  i.invoice_number as title,
  (to_char(i.amount, 'FM999,999,990.00') || ' ' || i.currency::text) as description,
  i.status as variant,
  'receipt' as icon
from public.invoices i
order by i.issued_on desc limit 5;

revoke all on public.widget_recent_invoices from public, anon, authenticated;
grant select on public.widget_recent_invoices to client, "x-admin";
comment on view public.widget_recent_invoices is
  '{"type":"dashboard_widget","widget_type":"list_1","name":"Recent Invoices","description":"Latest five invoices"}';

-- 3. Invoice currency inherits the organisation currency when omitted.
-- Drop the USD default so a NULL here genuinely means "not provided".
alter table public.invoices alter column currency drop default;

create or replace function public.set_invoice_org_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.project_id is not null then
    select org_id into new.org_id from public.projects where id = new.project_id;
  end if;

  if new.org_id is null then
    new.org_id := (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid;
  end if;

  if new.currency is null and new.org_id is not null then
    select case
      when btrim(upper(o.currency_code::text)) = any (
        enum_range(null::public.invoice_currency)::text[]
      ) then btrim(upper(o.currency_code::text))::public.invoice_currency
      else 'USD'::public.invoice_currency
    end
    into new.currency
    from public.organisations o
    where o.id = new.org_id;
  end if;

  if new.currency is null then
    new.currency := 'USD'::public.invoice_currency;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_set_org_invoices on public.invoices;
create trigger trg_set_org_invoices
  before insert or update on public.invoices
  for each row execute function public.set_invoice_org_id();

select supasheet.refresh_metadata();
