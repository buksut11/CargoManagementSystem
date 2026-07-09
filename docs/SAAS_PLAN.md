# CargoBook → SaaS conversion plan

A concrete, reviewable plan for turning the current single-tenant CargoBook
into a multi-tenant SaaS. Written before any code so we agree on the shape
first.

**Decisions locked in for this plan**

- **Tenancy model:** shared database + shared schema, isolated by
  `organization_id` and enforced with Postgres Row-Level Security (RLS).
- **Onboarding:** **invite-only** — no open public sign-up. New people join
  only by invitation, and new organizations are provisioned deliberately (by a
  platform owner) rather than self-serve.
- **Billing:** **deferred.** We build the tenancy so billing drops in cleanly
  later (org-level placeholder columns, no Stripe yet).

---

## 1. Where the app is today (baseline)

- **Stack:** Next.js 16 (App Router) + Tailwind v4 + Supabase, all data access
  is **client-side** via `supabase-js` with the public **anon key**
  (`lib/supabase.ts`).
- **Single tenant:** every business table is world-readable to any signed-in
  user. From `0001_init.sql`:

  ```sql
  create policy "authenticated full access" on public.shipments
    for all to authenticated using (true) with check (true);
  ```

  One Supabase project = one cargo business. There is no notion of "which
  company owns this row."

- **Roles are global, not per-tenant:** `profiles.role` is `admin` | `agent`
  (`0003`). It controls *what you can do*, not *whose data you see*. Enforced by
  RLS + a trigger (`0006`, `0008`).
- **Auth/session:** `app/login/page.tsx` calls
  `supabase.auth.signInWithPassword`; `app/(app)/layout.tsx` reads the session
  and loads `profiles.role` to pick the nav. Users are created **by hand** in
  the Supabase dashboard (per the README).
- **Tables today:** `destinations`, `invoices`, `shipments`, `payments`,
  `profiles`, `expenses`, `expense_categories`, `audit_log`, plus a storage
  bucket for shipment attachments (`0009`).

**Implication:** the entire security model has to move from "any authenticated
user" to "any authenticated user *within their own organization*." That is the
heart of this project.

---

## 2. Target architecture

### 2.1 The tenant model

Two new tables become the backbone:

- **`organizations`** — the tenant. One row per customer business. Carries
  billing placeholders so Stripe can be added later without a migration
  scramble.
- **`memberships`** — the join between a user and an organization, with a
  **per-org** role. Replaces the global `profiles.role`. A user can belong to
  more than one org.

Every business table gains a non-null `organization_id` foreign key. RLS is
rewritten so a row is visible only to members of its organization.

```
auth.users ──< memberships >── organizations
                                    │
        shipments / invoices / payments / destinations /
        expenses / expense_categories / audit_log
        (each carries organization_id)
```

### 2.2 Multi-tenancy isolation — why shared DB + RLS

| Model | Isolation | Ops cost | Fit |
| --- | --- | --- | --- |
| **Shared DB + `org_id` + RLS** | Row-level, enforced in Postgres | Low | **Chosen** |
| Schema-per-tenant | Schema-level | High (N× migrations) | Overkill |
| DB-per-tenant | Physical | Very high | Overkill |

Shared-DB + RLS is the native Supabase pattern, is the cheapest to run, and is
a direct evolution of the RLS already in the repo. The trade-off — one bad
policy can leak across tenants — is handled by making RLS the single choke
point and testing it explicitly (§6).

### 2.3 How "current org" is resolved

RLS policies need to know *which* org the caller is acting as. Approach:

- A helper `public.is_org_member(org_id)` / `public.current_org()` SQL function
  (mirrors the existing `is_admin()` in `0003`).
- Membership is looked up from the `memberships` table keyed on `auth.uid()`.
- For users in a single org (the common case), "current org" is simply their
  one membership. Multi-org users get an org switcher in the UI that stores the
  active org id; server-trusted paths validate membership before acting.

---

## 3. Data model changes (migrations)

New migrations, numbered continuing from `0011` (the transport-category change).
Sketches below are the intent, not final SQL.

### `0012_organizations.sql`

```sql
create table public.organizations (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text unique,
  created_at   timestamptz not null default now(),
  -- billing placeholders (unused until the billing phase)
  plan                 text not null default 'free',
  subscription_status  text,            -- e.g. active / past_due / canceled
  stripe_customer_id   text,
  stripe_subscription_id text
);
```

### `0013_memberships.sql`

```sql
create table public.memberships (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null default 'agent' check (role in ('owner','admin','agent')),
  created_at   timestamptz not null default now(),
  unique (org_id, user_id)
);
```

- Note the new **`owner`** role (billing/org-lifecycle authority) alongside the
  existing `admin` / `agent`. `admin` and `agent` keep their current meaning,
  now scoped to the org.

### `0014_invitations.sql` (invite-only onboarding)

```sql
create table public.invitations (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  email        text not null,
  role         text not null default 'agent' check (role in ('admin','agent')),
  token        text not null unique,          -- random, emailed to the invitee
  invited_by   uuid references auth.users(id),
  accepted_at  timestamptz,
  expires_at   timestamptz not null,
  created_at   timestamptz not null default now()
);
```

### `0015_add_org_id.sql` (the big one)

- Add `organization_id uuid references public.organizations(id)` to:
  `destinations`, `invoices`, `shipments`, `payments`, `expenses`,
  `expense_categories`, `audit_log`.
- **Backfill:** create one organization for the existing data, set every
  existing row's `organization_id` to it, and create `owner` memberships for
  the current admin user(s) (mapped from today's `profiles.role = 'admin'`).
- Then set the columns `not null` and add indexes on `organization_id`
  (extends `0010`'s index work).

### `0016_rls_rewrite.sql` (the security boundary)

- Add helper functions: `current_org_ids()` (all orgs the caller belongs to),
  `is_org_admin(org_id)`, `is_org_member(org_id)`.
- Drop every `using (true)` policy and replace with org-scoped ones. Example
  for `shipments`:

  ```sql
  create policy "members read org shipments" on public.shipments
    for select to authenticated
    using (organization_id in (select org_id from public.memberships
                               where user_id = auth.uid()));

  create policy "admins write org shipments" on public.shipments
    for all to authenticated
    using (is_org_admin(organization_id))
    with check (is_org_admin(organization_id));
  ```

- Preserve today's **agent restrictions** (agents may only change
  `status`/`notes`, enforced by the trigger in `0008`) — now additionally
  scoped to the agent's org.
- Update the audit trigger (`0006`) to stamp `organization_id` on every audit
  row so the trail stays per-tenant.

### `0017_profiles_cleanup.sql`

- `profiles.role` is superseded by `memberships.role`. Keep `profiles` for
  per-user data (email, display name, active-org preference) but stop using its
  `role` for authorization. Migrate `handle_new_user()` so it no longer assumes
  a global role.

> **Migration safety:** every step is written to be re-runnable and to keep the
> current single business working throughout — existing rows all land in one
> "default" organization and the current admins become its owners.

---

## 4. Application changes (Next.js)

### 4.1 New server-trusted surface (this is a shift)

Today everything is client-side with the anon key. Invite-accept, org
provisioning, and (later) Stripe webhooks must run with the **service-role
key**, which can never reach the browser. Introduce:

- `lib/supabase-server.ts` — a server-only client using
  `SUPABASE_SERVICE_ROLE_KEY` (read from server env, never `NEXT_PUBLIC_*`).
- **Route handlers** under `app/api/…`:
  - `POST /api/invitations` — an org admin creates an invite, emails a token.
  - `POST /api/invitations/accept` — an invited user redeems a token → creates
    their `membership` (and profile if new).
  - `POST /api/orgs` — provision a new organization + owner (invite-only, so
    gated to a platform owner / allowlist for now).

The existing client-side reads/writes stay client-side — RLS keeps them safe.

### 4.2 Auth-context / org-context

- New `components/org-context.tsx` (mirrors `role-context.tsx`): resolves the
  caller's memberships and the **active org**, exposes `{ orgId, role }`.
- `app/(app)/layout.tsx` changes: after loading the session, load memberships
  instead of `profiles.role`; if the user has none → "no access / awaiting
  invite" screen; if multiple → show an **org switcher** in the sidebar.
- Nav gating (`ADMIN_NAV` / `AGENT_NAV`) keys off the **membership role for the
  active org** instead of the global profile role.

### 4.3 Onboarding flow (invite-only)

- **No public sign-up page.** The login screen stays sign-in only.
- **Invite acceptance page** `app/invite/[token]/page.tsx`: validates the
  token, lets the invitee set a password (new user) or sign in (existing),
  then calls `/api/invitations/accept`.
- **Members admin page** (org admins): list members, invite by email, change
  role, remove member.
- Bootstrapping the very first org for a new customer is a deliberate,
  platform-owner action (a script or an allowlisted `/api/orgs` call) — matches
  the invite-only decision.

### 4.4 Types

- `lib/types.ts`: add `Organization`, `Membership`, `Invitation`; extend the
  role union to `'owner' | 'admin' | 'agent'`; add `organization_id` to
  `Shipment`, `Invoice`, `Payment`, `Destination`, `Expense`, `AuditEntry`.
- New-record inserts must set `organization_id` from the active org (or let a
  DB default derived from membership fill it — decided during build).

### 4.5 Storage

- The shipment-attachment bucket (`0009`) needs its storage RLS updated so
  files are readable/writable only within the owning org (prefix object paths
  with the org id, and scope the storage policies accordingly).

---

## 5. Billing — deferred, but designed for

We are **not** building Stripe now. We only make sure nothing blocks it:

- `organizations` already carries `plan`, `subscription_status`,
  `stripe_customer_id`, `stripe_subscription_id`.
- The server-trusted surface (`app/api/…` + service-role client) that billing
  webhooks need will already exist from the onboarding work.
- **When we do it:** add `app/api/stripe/webhook`, a checkout/customer-portal
  flow, and plan-gating helpers (e.g. `assertWithinPlanLimits(orgId)`). The
  pricing model (free+tiers vs. per-seat vs. flat) is still an open decision
  (§8) and only affects this phase.

---

## 6. Security & testing (non-negotiable for multi-tenant)

- **RLS is the whole game.** Add a test suite that signs in as users in
  different orgs and asserts that org A can never read or write org B's
  shipments/invoices/payments/expenses/audit rows.
- Verify the **agent** restriction still holds *and* is org-scoped (agent in
  org A can't touch anything in org B, and can only edit status/notes in A).
- Keep the service-role key strictly server-side; confirm it is never bundled
  into client code.
- Re-check the security headers / data-query work from the recent commits still
  applies per-tenant.

---

## 7. Phased roadmap (build order)

1. **Phase 1 — Tenancy foundation** (`0012`–`0017`): org + membership +
   invitations tables, `organization_id` everywhere, backfill existing data
   into one org, RLS rewrite, storage RLS. *No user-visible change; the current
   business keeps working.*
2. **Phase 2 — Org context in the app:** org-context provider, layout/nav
   keyed off membership role, org switcher, "awaiting invite" state.
3. **Phase 3 — Invite-only onboarding:** server route handlers + service-role
   client, invite-accept page, members admin page, org provisioning script.
4. **Phase 4 — Billing (later):** Stripe subscriptions, webhook, plan gating —
   pending the pricing decision.
5. **Phase 5 — Polish:** landing/pricing page, per-org settings & branding,
   usage limits, custom domain.

Order matters: **billing on top of imperfect isolation is a data-leak waiting
to happen**, so isolation lands first and is tested before anything is charged.

---

## 8. Open decisions (needed before their phase)

- **Pricing model** (blocks Phase 4 only): free + paid tiers vs. per-seat vs.
  flat. Chosen "not sure yet" — fine, foundation is built to accommodate any.
- **Org provisioning trigger** (Phase 3): who/what creates the first org for a
  new customer under invite-only — a manual script, an admin console, or a
  gated waitlist form?
- **Multi-org UX** (Phase 2): do we expect users in multiple orgs on day one,
  or defer the org switcher until it's actually needed?
- **Email delivery** (Phase 3): invitations need transactional email — use
  Supabase Auth email, or a provider (Resend/Postmark)?

---

## 9. First concrete step when we start building

Phase 1, migration `0012_organizations.sql` + `0013_memberships.sql`, followed
immediately by `0015_add_org_id.sql` with the backfill so the existing data is
never left un-tenanted. Nothing user-facing changes until Phase 2, which makes
Phase 1 safe to ship and verify on its own.
