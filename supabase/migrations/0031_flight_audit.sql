-- Flight module (polish): an audit trail for bookings, parallel to the cargo
-- audit_log (0006) but in its OWN table so cargo's trail is never touched.
-- Every create/update/delete on a booking is recorded with who did it and a
-- field-by-field diff, written by a security-definer trigger the app can't
-- bypass. Editors (owner/admin/manager) of the owning org may read it.
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.

create table public.flight_audit_log (
  id              bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id         uuid,
  user_email      text,
  user_role       text,
  action          text not null check (action in ('create', 'update', 'delete')),
  booking_id      bigint,
  booking_ref     text,
  changes         jsonb,
  created_at      timestamptz not null default now()
);

create index flight_audit_log_org_idx on public.flight_audit_log (organization_id, created_at desc);

alter table public.flight_audit_log enable row level security;

-- Read-only, editors of the org only. No write policies: rows come exclusively
-- from the trigger below (security definer), and nobody can edit them.
create policy "editors read flight audit" on public.flight_audit_log
  for select to authenticated using (public.is_org_editor(organization_id));

create function public.log_flight_booking_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_role text;
  v_changes jsonb;
  v_label text;
begin
  select email into v_email from public.profiles where id = auth.uid();
  select role into v_role
    from public.memberships
    where user_id = auth.uid()
      and org_id = coalesce(new.organization_id, old.organization_id)
    limit 1;

  if tg_op = 'INSERT' then
    insert into public.flight_audit_log
      (organization_id, user_id, user_email, user_role, action, booking_id, booking_ref)
    values (new.organization_id, auth.uid(), v_email, v_role, 'create', new.id,
            coalesce(new.booking_ref, new.pnr));
    return new;
  elsif tg_op = 'UPDATE' then
    -- Diff every changed column except the timestamp, the org and the two
    -- generated totals (which move only as a consequence of other fields).
    select jsonb_object_agg(o.key, jsonb_build_object('from', o.value, 'to', n.value))
      into v_changes
      from jsonb_each(to_jsonb(old)) o
      join jsonb_each(to_jsonb(new)) n on n.key = o.key
      where o.value is distinct from n.value
        and o.key not in ('created_at', 'organization_id', 'sale_total', 'profit');
    if v_changes is null then
      return new;
    end if;
    insert into public.flight_audit_log
      (organization_id, user_id, user_email, user_role, action, booking_id, booking_ref, changes)
    values (new.organization_id, auth.uid(), v_email, v_role, 'update', new.id,
            coalesce(new.booking_ref, new.pnr), v_changes);
    return new;
  else
    v_label := coalesce(old.booking_ref, old.pnr);
    insert into public.flight_audit_log
      (organization_id, user_id, user_email, user_role, action, booking_id, booking_ref)
    values (old.organization_id, auth.uid(), v_email, v_role, 'delete', old.id, v_label);
    return old;
  end if;
end;
$$;

create trigger flight_bookings_audit
  after insert or update or delete on public.flight_bookings
  for each row execute function public.log_flight_booking_change();
