-- Monthly subscription billing lifecycle.
-- Every organization is billed monthly: a billing month is tracked on the org
-- row, an invoice opens near the end of the month, admins get reminders, an
-- unpaid invoice earns a 3-day grace period, and after grace the org is
-- FROZEN — read-only at the database level. Nothing is ever deleted: freezing
-- is a status value plus a write guard, and settling the invoice restores the
-- org instantly.
--
-- Orgs whose subscription is managed by Stripe (stripe_subscription_id set)
-- are skipped by the internal lifecycle — the Stripe webhook drives those.
--
-- The engine is billing_tick(), meant to run daily. It is scheduled two ways:
--   1. pg_cron, if the extension is enabled in this Supabase project
--      (Dashboard → Database → Extensions → pg_cron), attempted at the bottom.
--   2. The app's /api/billing/cron route (protected by CRON_SECRET), which
--      also delivers the email / WhatsApp notifications. See vercel.json for
--      a daily schedule, or point any scheduler at the route.
-- Both paths are idempotent — running the tick twice does nothing extra.
--
-- Idempotent; safe to re-run.
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.

-- ── 1. The billing month, tracked on the organization ───────────────────────
-- current_period_end is the due date: the day the running month ends. Existing
-- orgs are backfilled to a fresh month starting now, so nobody is instantly
-- overdue when this migration lands.
alter table public.organizations
  add column if not exists current_period_start timestamptz not null default now(),
  add column if not exists current_period_end   timestamptz not null default (now() + interval '1 month'),
  -- How many days before month-end the renewal reminder goes out.
  add column if not exists billing_reminder_days integer not null default 5;

-- ── 2. One invoice per billing month ────────────────────────────────────────
-- The durable record the reminders, grace period and freeze all key off.
-- due_at = the month's end; grace_until = due_at + 3 days.
create table if not exists public.subscription_invoices (
  id              bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  period_start    timestamptz not null,
  period_end      timestamptz not null,
  amount          numeric(12, 2) not null,
  currency        text not null default 'USD',
  status          text not null default 'open' check (status in ('open', 'paid', 'void')),
  due_at          timestamptz not null,
  grace_until     timestamptz not null,
  -- Set once, by the tick, when the "due tomorrow" nudge has gone out.
  due_notice_sent boolean not null default false,
  paid_at         timestamptz,
  -- The billing_transactions.reference_id (or Stripe id) that settled it.
  transaction_ref text,
  created_at      timestamptz not null default now(),
  unique (organization_id, period_end)
);
create index if not exists subscription_invoices_open_idx
  on public.subscription_invoices (organization_id) where status = 'open';

alter table public.subscription_invoices enable row level security;

-- Admins read their own org's invoices; all writes come from the server
-- (service role / the security-definer functions below), so no write policies.
drop policy if exists "admins read subscription invoices" on public.subscription_invoices;
create policy "admins read subscription invoices" on public.subscription_invoices
  for select to authenticated using (public.is_org_admin(organization_id));

-- ── 3. In-app notifications for the org's admins ────────────────────────────
-- Written by the lifecycle functions; the cron route also delivers each row by
-- email / WhatsApp and flips the *_sent flags.
create table if not exists public.billing_notifications (
  id              bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  kind            text not null check (kind in ('reminder', 'due', 'grace', 'frozen', 'paid')),
  title           text not null,
  body            text not null,
  read_at         timestamptz,
  email_sent      boolean not null default false,
  whatsapp_sent   boolean not null default false,
  created_at      timestamptz not null default now()
);
create index if not exists billing_notifications_org_idx
  on public.billing_notifications (organization_id, created_at desc);
-- The cron route scans for undelivered rows.
create index if not exists billing_notifications_undelivered_idx
  on public.billing_notifications (created_at)
  where email_sent = false or whatsapp_sent = false;

alter table public.billing_notifications enable row level security;

drop policy if exists "admins read billing notifications" on public.billing_notifications;
create policy "admins read billing notifications" on public.billing_notifications
  for select to authenticated using (public.is_org_admin(organization_id));
-- Admins may mark their org's notifications as read (the only client write).
drop policy if exists "admins update billing notifications" on public.billing_notifications;
create policy "admins update billing notifications" on public.billing_notifications
  for update to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

-- ── 4. The freeze write-guard: frozen orgs are read-only in the DATABASE ────
-- One generic trigger raises on any INSERT/UPDATE/DELETE against a row that
-- belongs to a frozen organization, so even a client that bypasses the UI
-- cannot change (or delete) data while the subscription is unpaid. Reads are
-- untouched — all data stays visible and intact, and unfreezing is just a
-- status flip when the payment settles.
create or replace function public.block_frozen_writes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org    uuid;
  v_status text;
begin
  v_org := case when tg_op = 'DELETE' then old.organization_id
                else new.organization_id end;
  if v_org is null then
    return coalesce(new, old);
  end if;
  select subscription_status into v_status
    from public.organizations where id = v_org;
  if v_status = 'frozen' then
    raise exception
      'This organization is read-only: its subscription is unpaid. An administrator can settle the invoice on the Settings page to restore full access. No data has been changed or deleted.';
  end if;
  return coalesce(new, old);
end;
$$;

-- Attach the guard to every org-scoped business table. Billing tables stay
-- exempt so a frozen org can still pay its way out (and mark notifications
-- read); organizations itself stays exempt so the status can be flipped.
-- NOTE: a table added by a FUTURE migration needs this trigger too — re-running
-- this whole file (it is idempotent) is the easiest way to pick it up.
do $do$
declare
  t record;
begin
  for t in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables tb
      on tb.table_schema = c.table_schema
     and tb.table_name  = c.table_name
     and tb.table_type  = 'BASE TABLE'
    where c.table_schema = 'public'
      and c.column_name  = 'organization_id'
      and c.table_name not in
        ('billing_transactions', 'subscription_invoices', 'billing_notifications')
  loop
    execute format('drop trigger if exists frozen_org_guard on public.%I', t.table_name);
    execute format(
      'create trigger frozen_org_guard before insert or update or delete on public.%I
         for each row execute function public.block_frozen_writes()',
      t.table_name);
  end loop;
end;
$do$;

-- ── 5. Settle a payment: mark the invoice paid & advance the month ──────────
-- Called (via RPC, service role only) by every payment route the moment a
-- charge is approved — before due, during grace, or while frozen. The new
-- month starts from the LATER of now and the old month's end, so paying early
-- never costs days. Returns the new paid-through date.
create or replace function public.record_subscription_payment(
  p_org       uuid,
  p_reference text default null
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now  timestamptz := now();
  v_base timestamptz;
  v_end  timestamptz;
begin
  update public.subscription_invoices
     set status = 'paid',
         paid_at = v_now,
         transaction_ref = coalesce(p_reference, transaction_ref)
   where organization_id = p_org and status = 'open';

  select greatest(current_period_end, v_now) into v_base
    from public.organizations where id = p_org;
  if v_base is null then
    raise exception 'Unknown organization %', p_org;
  end if;
  v_end := v_base + interval '1 month';

  update public.organizations
     set plan = 'pro',
         subscription_status = 'active',
         current_period_start = v_base,
         current_period_end   = v_end
   where id = p_org;

  insert into public.billing_notifications (organization_id, kind, title, body)
  values (p_org, 'paid', 'Payment received — thank you',
          'Your subscription payment was received. Your organization is active and paid through '
          || to_char(v_end, 'FMDD Mon YYYY') || '.');

  return v_end;
end;
$$;

revoke all on function public.record_subscription_payment(uuid, text) from public, anon, authenticated;

-- ── 6. The daily lifecycle engine ───────────────────────────────────────────
-- Idempotent. Each run:
--   a) opens the month's invoice + sends the renewal reminder, once, when an
--      org is within billing_reminder_days of its month end;
--   b) sends a one-time "due tomorrow" nudge the day before the due date;
--   c) moves orgs past their due date to PAST_DUE and announces the 3-day
--      grace period (service continues);
--   d) moves orgs past their grace deadline to FROZEN (read-only) and says so.
-- Amount/currency for the invoices it opens come from the caller (the cron
-- route passes BILLING_PLAN_AMOUNT / BILLING_CURRENCY); the defaults match
-- lib/billing.ts.
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
  v_reminded int := 0;
  v_nudged   int := 0;
  v_graced   int := 0;
  v_frozen   int := 0;
begin
  -- a) Open the invoice + renewal reminder.
  for r in
    select o.id, o.current_period_start, o.current_period_end
      from public.organizations o
     where o.stripe_subscription_id is null
       and now() >= o.current_period_end - make_interval(days => greatest(o.billing_reminder_days, 0))
       and not exists (
             select 1 from public.subscription_invoices i
              where i.organization_id = o.id
                and i.period_end = o.current_period_end)
  loop
    insert into public.subscription_invoices
      (organization_id, period_start, period_end, amount, currency, due_at, grace_until)
    values
      (r.id, r.current_period_start, r.current_period_end, p_amount, p_currency,
       r.current_period_end, r.current_period_end + interval '3 days');
    insert into public.billing_notifications (organization_id, kind, title, body)
    values (r.id, 'reminder', 'Your billing month is ending soon',
            'Your monthly subscription ('
            || p_currency || ' ' || trim(to_char(p_amount, 'FM999999990.00'))
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

-- ── 7. Schedule the tick with pg_cron, when the extension is available ──────
-- Runs daily at 03:10 UTC. If pg_cron is not enabled this block is a no-op —
-- enable it (Dashboard → Database → Extensions) and re-run this file, or rely
-- on the app's /api/billing/cron route instead.
do $do$
begin
  perform cron.schedule(
    'cargobook-billing-tick',
    '10 3 * * *',
    'select public.billing_tick();');
exception when others then
  raise notice 'pg_cron not available — schedule /api/billing/cron externally instead.';
end;
$do$;
