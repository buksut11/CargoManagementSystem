-- SaaS Phase 1 (4/5): put every business row under an organization.
-- Adds organization_id to all business tables, backfills the existing
-- single-tenant data into ONE organization (you become its owner), enforces
-- per-org uniqueness, and installs BEFORE INSERT triggers that auto-fill
-- organization_id — so the current app keeps inserting without any code
-- change. RLS is rewritten separately in 0016.
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.

-- ── A. Add the columns (nullable for now, so the backfill can populate them) ─
alter table public.destinations       add column organization_id uuid references public.organizations (id) on delete cascade;
alter table public.invoices           add column organization_id uuid references public.organizations (id) on delete cascade;
alter table public.shipments          add column organization_id uuid references public.organizations (id) on delete cascade;
alter table public.payments           add column organization_id uuid references public.organizations (id) on delete cascade;
alter table public.expenses           add column organization_id uuid references public.organizations (id) on delete cascade;
alter table public.expense_categories add column organization_id uuid references public.organizations (id) on delete cascade;
alter table public.audit_log          add column organization_id uuid references public.organizations (id) on delete cascade;

-- ── B. Backfill existing data into one organization ─────────────────────────
-- Re-runnable: reuses an org if one already exists, and only touches rows that
-- have no organization yet.
do $$
declare
  v_org uuid;
begin
  select id into v_org from public.organizations order by created_at limit 1;
  if v_org is null then
    insert into public.organizations (name, slug)
    values ('My Cargo Business', 'default')
    returning id into v_org;
  end if;

  update public.destinations       set organization_id = v_org where organization_id is null;
  update public.invoices           set organization_id = v_org where organization_id is null;
  update public.shipments          set organization_id = v_org where organization_id is null;
  update public.payments           set organization_id = v_org where organization_id is null;
  update public.expenses           set organization_id = v_org where organization_id is null;
  update public.expense_categories set organization_id = v_org where organization_id is null;
  update public.audit_log          set organization_id = v_org where organization_id is null;

  -- Existing users join that org: current admins become owners, agents stay
  -- agents. (profiles.role is still what the app reads, in Phase 1.)
  insert into public.memberships (org_id, user_id, role)
  select v_org, id, case when role = 'admin' then 'owner' else 'agent' end
  from public.profiles
  on conflict (org_id, user_id) do nothing;
end $$;

-- ── C. Now that every row has an org, make the column mandatory ─────────────
alter table public.destinations       alter column organization_id set not null;
alter table public.invoices           alter column organization_id set not null;
alter table public.shipments          alter column organization_id set not null;
alter table public.payments           alter column organization_id set not null;
alter table public.expenses           alter column organization_id set not null;
alter table public.expense_categories alter column organization_id set not null;
alter table public.audit_log          alter column organization_id set not null;

-- ── D. Uniqueness becomes per-organization ──────────────────────────────────
-- A destination name / expense-type name only has to be unique within an org,
-- so two different businesses can each have "Istanbul" or "🚗 Car".
alter table public.destinations       drop constraint destinations_name_key;
alter table public.destinations       add constraint destinations_org_name_key unique (organization_id, name);
alter table public.expense_categories drop constraint expense_categories_name_key;
alter table public.expense_categories add constraint expense_categories_org_name_key unique (organization_id, name);

-- ── E. Indexes on the new foreign key (every query now filters by org) ───────
create index if not exists destinations_org_idx       on public.destinations (organization_id);
create index if not exists invoices_org_idx           on public.invoices (organization_id);
create index if not exists shipments_org_idx          on public.shipments (organization_id);
create index if not exists payments_org_idx           on public.payments (organization_id);
create index if not exists expenses_org_idx           on public.expenses (organization_id);
create index if not exists expense_categories_org_idx on public.expense_categories (organization_id);
create index if not exists audit_log_org_idx          on public.audit_log (organization_id);

-- ── F. Auto-fill organization_id on insert ──────────────────────────────────
-- The current app inserts rows without an organization_id. These BEFORE INSERT
-- triggers fill it in (from the caller's org, or from the parent row for
-- expenses/payments) so no app change is needed. RLS WITH CHECK is evaluated
-- AFTER before-triggers, so the filled value is what gets authorized.

create function public.set_org_from_current()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.organization_id is null then
    new.organization_id := public.current_org();
  end if;
  return new;
end;
$$;

create function public.set_org_from_shipment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.organization_id is null then
    select organization_id into new.organization_id
    from public.shipments where id = new.shipment_id;
  end if;
  return new;
end;
$$;

create function public.set_org_from_invoice()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.organization_id is null then
    select organization_id into new.organization_id
    from public.invoices where id = new.invoice_id;
  end if;
  return new;
end;
$$;

create trigger destinations_set_org       before insert on public.destinations       for each row execute function public.set_org_from_current();
create trigger invoices_set_org           before insert on public.invoices           for each row execute function public.set_org_from_current();
create trigger shipments_set_org          before insert on public.shipments          for each row execute function public.set_org_from_current();
create trigger expense_categories_set_org before insert on public.expense_categories for each row execute function public.set_org_from_current();
create trigger expenses_set_org           before insert on public.expenses           for each row execute function public.set_org_from_shipment();
create trigger payments_set_org           before insert on public.payments           for each row execute function public.set_org_from_invoice();

-- ── G. Stamp the audit trail with the organization ──────────────────────────
-- The audit trigger already records who changed a shipment; now it also
-- records which org the shipment belongs to, so the trail stays per-tenant.
create or replace function public.log_shipment_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_role text;
  v_changes jsonb;
begin
  select email, role into v_email, v_role
  from public.profiles where id = auth.uid();

  if tg_op = 'INSERT' then
    insert into public.audit_log
      (organization_id, user_id, user_email, user_role, action, shipment_id, shipment_desc)
    values (new.organization_id, auth.uid(), v_email, v_role, 'create', new.id, new.description);
    return new;
  elsif tg_op = 'UPDATE' then
    select jsonb_object_agg(o.key, jsonb_build_object('from', o.value, 'to', n.value))
      into v_changes
      from jsonb_each(to_jsonb(old)) o
      join jsonb_each(to_jsonb(new)) n on n.key = o.key
      where o.value is distinct from n.value
        and o.key <> 'created_at'
        and o.key <> 'organization_id';
    if v_changes is null then
      return new;
    end if;
    insert into public.audit_log
      (organization_id, user_id, user_email, user_role, action, shipment_id, shipment_desc, changes)
    values (new.organization_id, auth.uid(), v_email, v_role, 'update', new.id, new.description, v_changes);
    return new;
  else
    insert into public.audit_log
      (organization_id, user_id, user_email, user_role, action, shipment_id, shipment_desc)
    values (old.organization_id, auth.uid(), v_email, v_role, 'delete', old.id, old.description);
    return old;
  end if;
end;
$$;
