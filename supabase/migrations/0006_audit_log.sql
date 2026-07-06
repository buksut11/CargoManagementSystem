-- Audit trail: every create / update / delete on shipments is recorded with
-- who did it (email + role) and a field-by-field diff. Written by a trigger
-- so it cannot be bypassed from the app; only admins can read it.
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.

create table public.audit_log (
  id bigint generated always as identity primary key,
  user_id uuid,
  user_email text,
  user_role text,
  action text not null check (action in ('create', 'update', 'delete')),
  shipment_id bigint,
  shipment_desc text,
  changes jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_created_at_idx on public.audit_log (created_at desc);

alter table public.audit_log enable row level security;

-- Read-only, admins only. No insert/update/delete policies: rows are written
-- exclusively by the security-definer trigger below, and nobody can edit them.
create policy "admin read" on public.audit_log
  for select to authenticated using (public.is_admin());

create function public.log_shipment_change()
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
      (user_id, user_email, user_role, action, shipment_id, shipment_desc)
    values (auth.uid(), v_email, v_role, 'create', new.id, new.description);
    return new;
  elsif tg_op = 'UPDATE' then
    -- Field-by-field diff: {"status": {"from": "pending", "to": "shipped"}, …}
    select jsonb_object_agg(o.key, jsonb_build_object('from', o.value, 'to', n.value))
      into v_changes
      from jsonb_each(to_jsonb(old)) o
      join jsonb_each(to_jsonb(new)) n on n.key = o.key
      where o.value is distinct from n.value and o.key <> 'created_at';
    if v_changes is null then
      return new; -- no-op update, nothing to record
    end if;
    insert into public.audit_log
      (user_id, user_email, user_role, action, shipment_id, shipment_desc, changes)
    values (auth.uid(), v_email, v_role, 'update', new.id, new.description, v_changes);
    return new;
  else
    insert into public.audit_log
      (user_id, user_email, user_role, action, shipment_id, shipment_desc)
    values (auth.uid(), v_email, v_role, 'delete', old.id, old.description);
    return old;
  end if;
end;
$$;

create trigger shipments_audit
  after insert or update or delete on public.shipments
  for each row execute function public.log_shipment_change();
