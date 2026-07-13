# How to create a new organization (manual, step by step)

This is the checklist for adding a brand-new organization (a separate business
workspace) to CargoBook. Follow it top to bottom every time.

## What you're actually creating

Three things, in order:

1. **A login** for the person who will own the new organization (the "owner").
2. **The organization** itself — an empty, isolated workspace.
3. **A membership** that links that person to that organization as `owner`,
   plus the starter transport/expense types so their dropdown isn't empty.

Once that's done, the owner logs in, sees a completely empty workspace (none of
your other organizations' data), and invites their own team from the **Members**
page. Every organization is fully isolated — nobody in one org can ever see
another org's shipments, invoices, or anything else.

---

## Step 1 — Create the owner's login

1. Go to your **Supabase dashboard** → **Authentication** (left sidebar) →
   **Users**.
2. Click **Add user** → **Create new user**.
3. Enter the owner's **email** and a **password**.
4. Tick **Auto Confirm User** (so they can log in immediately, no email step).
5. Click **Create user**.

## Step 2 — Copy that user's ID

1. Still on **Authentication → Users**, click the user you just created.
2. Copy their **User UID** — a long code like
   `a1b2c3d4-5678-90ab-cdef-1234567890ab`.
3. Keep it handy; you paste it in the next step.

## Step 3 — Create the organization (SQL Editor)

1. Supabase dashboard → **SQL Editor** → **New query**.
2. Paste the block below.
3. Change **three things**:
   - `'Second Business'` → the new organization's name.
   - `array['cargo']` → which products this org gets (see **Modules** below).
   - `'PASTE-USER-UID-HERE'` → the User UID you copied in Step 2.
4. Click **Run**.

```sql
do $$
declare
  v_org uuid;
begin
  -- 1. Create the organization (the isolated workspace)
  --    `modules` decides which products it runs — see the Modules note below.
  insert into public.organizations (name, modules)
  values ('Second Business', array['cargo'])
  returning id into v_org;

  -- 2. Make the user its owner
  insert into public.memberships (org_id, user_id, role)
  values (v_org, 'PASTE-USER-UID-HERE', 'owner');

  -- 3. Seed the transport / expense types for this org
  insert into public.expense_categories (organization_id, name) values
    (v_org, '✈️ Airplane'),
    (v_org, '🚗 Car'),
    (v_org, '🏍️ Motorcycle'),
    (v_org, '🚐 Sahal'),
    (v_org, '🚶 Porter');
end $$;
```

If it runs with no error, the organization exists.

### Modules — which products this org gets

An organization runs **Cargo**, **Flights**, or **both**. You choose this; the
org's own owner/admins can't change it (that's enforced in the database — see
migration `0036_lock_org_modules.sql`). Set it in the `modules` line above:

- Cargo only → `array['cargo']`
- Flights only → `array['flights']`
- Both → `array['cargo', 'flights']`

**Changing an existing org later** (SQL Editor → New query → Run):

```sql
-- Give this org Flights only. Allowed values: 'cargo', 'flights'.
select public.set_org_modules('PASTE-ORG-UID-HERE', array['flights']);
```

The org's sidebar updates to match the next time its users load the app. At
least one module is required — an empty list is rejected.

## Step 4 — Verify (optional but recommended)

Run this to see the new org and its owner:

```sql
select o.name as organization, m.role, u.email
from public.organizations o
join public.memberships m on m.org_id = o.id
join auth.users u on u.id = m.user_id
order by o.created_at desc;
```

You should see the new organization with one `owner` row.

## Step 5 — Owner signs in and builds their team

1. The owner goes to the app's **login** page and signs in with the email and
   password from Step 1.
2. They land on an **empty dashboard** — their own workspace.
3. They open **Members** and invite their teammates (as `agent`, `manager`, or
   `admin`). Those invites are per-organization, so everyone they add only ever
   sees this organization.

Done. Repeat Steps 1–3 for each new organization.

---

## Notes & gotchas

- **Only the first owner is manual.** After that, the owner adds everyone else
  through the Members page — no SQL needed.
- **The User UID must be the real one** from Authentication → Users. A wrong or
  made-up ID will fail (it must match an existing login).
- **Don't skip Step 3's category seeding** — without it, that org's
  transport/expense dropdown starts empty (existing orgs already have theirs).
- **Isolation is automatic.** You never have to "hide" one org from another;
  the database does it. Adding a new org can't affect any existing org's data.
- **A person can be in more than one org** by giving them a membership row in
  each. (Heads-up: the app doesn't yet have an org switcher, so multi-org users
  are a future enhancement — for now, keep one person to one org.)
