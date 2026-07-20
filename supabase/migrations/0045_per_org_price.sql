-- Per-organization monthly price.
-- The platform operator negotiates locally, so each organization can carry its
-- own monthly subscription amount. NULL (the default) means "use the global
-- price" — BILLING_PLAN_AMOUNT / the billing_tick default. The charge routes
-- and the lifecycle both honour it, so the invoice an org sees, the amount the
-- gateway charges, and the transaction log always agree.
--
-- Until the platform console exists, set a custom price in the SQL Editor:
--   update public.organizations set monthly_amount = 15 where id = '<org-uuid>';
-- and clear it again with:
--   update public.organizations set monthly_amount = null where id = '<org-uuid>';
--
-- Idempotent; safe to re-run. Run AFTER 0044_subscription_lifecycle.sql.

alter table public.organizations
  add column if not exists monthly_amount numeric(12, 2)
    check (monthly_amount is null or monthly_amount > 0);

-- Recreate billing_tick so the invoices it opens use the org's own price when
-- one is set, falling back to the caller's global amount. Identical to 0044's
-- version apart from the coalesce (and the reminder text using that amount).
create or replace function public.billing_tick(
  p_amount   numeric default 25,
  p_currency text default 'USD'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r          record;
  v_amt      numeric;
  v_reminded int := 0;
  v_nudged   int := 0;
  v_graced   int := 0;
  v_frozen   int := 0;
begin
  -- a) Open the invoice + renewal reminder.
  for r in
    select o.id, o.current_period_start, o.current_period_end, o.monthly_amount
      from public.organizations o
     where o.stripe_subscription_id is null
       and now() >= o.current_period_end - make_interval(days => greatest(o.billing_reminder_days, 0))
       and not exists (
             select 1 from public.subscription_invoices i
              where i.organization_id = o.id
                and i.period_end = o.current_period_end)
  loop
    v_amt := coalesce(r.monthly_amount, p_amount);
    insert into public.subscription_invoices
      (organization_id, period_start, period_end, amount, currency, due_at, grace_until)
    values
      (r.id, r.current_period_start, r.current_period_end, v_amt, p_currency,
       r.current_period_end, r.current_period_end + interval '3 days');
    insert into public.billing_notifications (organization_id, kind, title, body)
    values (r.id, 'reminder', 'Your billing month is ending soon',
            'Your monthly subscription ('
            || p_currency || ' ' || trim(to_char(v_amt, 'FM999999990.00'))
            || ') is due on ' || to_char(r.current_period_end, 'FMDD Mon YYYY')
            || '. Please renew from Settings → Billing to keep full access.');
    v_reminded := v_reminded + 1;
  end loop;

  -- b) "Due tomorrow" nudge, once per invoice.
  for r in
    select i.id, i.organization_id, i.due_at
      from public.subscription_invoices i
     where i.status = 'open'
       and i.due_notice_sent = false
       and now() >= i.due_at - interval '1 day'
  loop
    update public.subscription_invoices set due_notice_sent = true where id = r.id;
    insert into public.billing_notifications (organization_id, kind, title, body)
    values (r.organization_id, 'due', 'Subscription payment due',
            'Your monthly subscription is due on '
            || to_char(r.due_at, 'FMDD Mon YYYY')
            || '. Pay from Settings → Billing to avoid the grace period.');
    v_nudged := v_nudged + 1;
  end loop;

  -- c) Due date passed → grace period (service continues, 3 days).
  for r in
    select i.organization_id, i.grace_until
      from public.subscription_invoices i
      join public.organizations o on o.id = i.organization_id
     where i.status = 'open'
       and o.stripe_subscription_id is null
       and now() >= i.due_at
       and now() <  i.grace_until
       and coalesce(o.subscription_status, '') not in ('past_due', 'frozen')
  loop
    update public.organizations
       set subscription_status = 'past_due'
     where id = r.organization_id;
    insert into public.billing_notifications (organization_id, kind, title, body)
    values (r.organization_id, 'grace', 'Payment overdue — grace period started',
            'Your subscription payment was not received by the due date. Service continues normally during a 3-day grace period, until '
            || to_char(r.grace_until, 'FMDD Mon YYYY')
            || '. Please pay from Settings → Billing before then to avoid your account becoming read-only.');
    v_graced := v_graced + 1;
  end loop;

  -- d) Grace expired → freeze (read-only). Data is never touched.
  for r in
    select i.organization_id
      from public.subscription_invoices i
      join public.organizations o on o.id = i.organization_id
     where i.status = 'open'
       and o.stripe_subscription_id is null
       and now() >= i.grace_until
       and o.subscription_status is distinct from 'frozen'
  loop
    update public.organizations
       set subscription_status = 'frozen'
     where id = r.organization_id;
    insert into public.billing_notifications (organization_id, kind, title, body)
    values (r.organization_id, 'frozen', 'Account frozen — payment required',
            'The grace period ended with the invoice unpaid, so your organization is now read-only. All of your data is safe and untouched — nothing is ever deleted. Settle the invoice from Settings → Billing and full access is restored instantly.');
    v_frozen := v_frozen + 1;
  end loop;

  return jsonb_build_object(
    'reminders', v_reminded,
    'due_notices', v_nudged,
    'grace_started', v_graced,
    'frozen', v_frozen);
end;
$$;

revoke all on function public.billing_tick(numeric, text) from public, anon, authenticated;
