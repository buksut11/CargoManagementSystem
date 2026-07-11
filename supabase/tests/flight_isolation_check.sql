-- Flight module — cross-tenant RLS isolation check (Phase A verification).
--
-- Purpose: prove that a member of org A can never read or write org B's flight
-- data, and that an AGENT cannot see the money tables at all. Fulfils the
-- security requirement in SAAS_PLAN.md §6 for the new flight tables.
--
-- How to run: Supabase Dashboard → SQL Editor → paste this whole file → Run.
-- It runs inside BEGIN … ROLLBACK, so it creates NOTHING permanent — the fake
-- orgs/users/bookings are discarded when it finishes. Read the RAISE NOTICE
-- lines in the output: every one must say PASS.
--
-- Prerequisites: migrations 0026–0030 have been applied.

begin;

do $$
declare
  org_a  uuid;
  org_b  uuid;
  admin_a uuid := gen_random_uuid();   -- owner/admin of org A
  agent_a uuid := gen_random_uuid();   -- agent of org A
  bkg_a  bigint;
  bkg_b  bigint;
  visible int;
  denied  boolean;
begin
  -- ── Seed two organizations with the flight module on ──────────────────────
  insert into public.organizations (name, slug, modules)
    values ('Org A (test)', 'test-a-' || substr(admin_a::text,1,8), array['cargo','flights'])
    returning id into org_a;
  insert into public.organizations (name, slug, modules)
    values ('Org B (test)', 'test-b-' || substr(admin_a::text,1,8), array['cargo','flights'])
    returning id into org_b;

  -- Fake auth users + memberships (admin & agent in A; nobody the test uses in B)
  insert into auth.users (id, email) values
    (admin_a, 'admin_a@test.local'),
    (agent_a, 'agent_a@test.local')
    on conflict do nothing;
  insert into public.memberships (org_id, user_id, role) values
    (org_a, admin_a, 'admin'),
    (org_a, agent_a, 'agent');

  -- One booking + one customer receipt in EACH org (seeded as the privileged
  -- role, org set explicitly so we don't depend on current_org() here).
  insert into public.flight_bookings (organization_id, booking_ref, airline, net_cost, base_fare)
    values (org_a, 'A-001', 'AA', 100, 150) returning id into bkg_a;
  insert into public.flight_bookings (organization_id, booking_ref, airline, net_cost, base_fare)
    values (org_b, 'B-001', 'BB', 200, 250) returning id into bkg_b;
  insert into public.booking_payments (organization_id, booking_id, amount) values (org_a, bkg_a, 50);
  insert into public.booking_payments (organization_id, booking_id, amount) values (org_b, bkg_b, 75);

  -- ── Act as the ADMIN of org A ─────────────────────────────────────────────
  perform set_config('request.jwt.claims',
    json_build_object('sub', admin_a::text, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- 1. Admin A sees exactly org A's booking, never org B's.
  select count(*) into visible from public.flight_bookings;
  raise notice '% admin A sees % booking(s) (expected 1)',
    case when visible = 1 then 'PASS:' else 'FAIL:' end, visible;

  -- 2. Admin A cannot INSERT a booking into org B (RLS WITH CHECK blocks it).
  denied := false;
  begin
    insert into public.flight_bookings (organization_id, booking_ref) values (org_b, 'HACK');
  exception when others then denied := true;
  end;
  raise notice '% admin A blocked from writing into org B',
    case when denied then 'PASS:' else 'FAIL:' end;

  -- 3. Admin A sees org A's ledger (money table), one receipt.
  select count(*) into visible from public.booking_payments;
  raise notice '% admin A sees % payment(s) (expected 1)',
    case when visible = 1 then 'PASS:' else 'FAIL:' end, visible;

  reset role;

  -- ── Act as the AGENT of org A ─────────────────────────────────────────────
  perform set_config('request.jwt.claims',
    json_build_object('sub', agent_a::text, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- 4. Agent A can READ org A's booking …
  select count(*) into visible from public.flight_bookings;
  raise notice '% agent A sees % booking(s) (expected 1)',
    case when visible = 1 then 'PASS:' else 'FAIL:' end, visible;

  -- 5. … but the money table is editor-only, so agent sees ZERO payments.
  select count(*) into visible from public.booking_payments;
  raise notice '% agent A sees % payment(s) (expected 0 — ledger is editor-only)',
    case when visible = 0 then 'PASS:' else 'FAIL:' end, visible;

  -- 6. Agent A cannot WRITE a booking (agents are read-only for flights).
  denied := false;
  begin
    insert into public.flight_bookings (organization_id, booking_ref) values (org_a, 'AGENT-WRITE');
  exception when others then denied := true;
  end;
  raise notice '% agent A blocked from creating a booking',
    case when denied then 'PASS:' else 'FAIL:' end;

  reset role;
end $$;

rollback;
