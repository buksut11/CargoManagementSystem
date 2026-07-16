# Security & Performance Audit — CargoBook

**Date:** 2026-07-16
**Scope:** full repository — Next.js app (App Router, client components), API route
handlers, Supabase schema/RLS migrations, storage policies, Stripe billing
integration, dependencies, HTTP security headers.

Severity scale: **Critical / High / Medium / Low / Informational**.
Findings marked **✅ Fixed in this branch** were remediated alongside this report;
the rest include concrete remediation guidance.

---

## 1. Architecture summary

- **Frontend:** Next.js 16 client components talking directly to Supabase with the
  anon key. All data access is gated by Postgres Row-Level Security.
- **Tenancy:** organizations → memberships (`owner/admin/manager/agent`), enforced
  by `is_org_member` / `is_org_editor` / `is_org_admin` SECURITY DEFINER helpers.
- **Server:** four route handlers (`/api/invitations`, `/api/invitations/accept`,
  `/api/stripe/checkout`, `/api/stripe/webhook`) using the service-role key.
- **Storage:** private `shipment-attachments` bucket, org-scoped policies,
  short-lived signed URLs.

## 2. Verified strengths (no action needed)

These were audited and found sound — kept here so future reviews don't re-litigate:

- **Tenant isolation:** every business table carries `organization_id` with
  member-read / editor-write policies (migrations 0016, 0018, 0029). Flight money
  tables have *no* member-read policy, so agents can't reach the ledger.
- **Privilege-escalation guards:** `enforce_membership_authz` trigger (0022) blocks
  admin self-promotion, owner-row tampering, and owner lockout — closing the gap
  RLS alone leaves on `memberships` writes. `enforce_agent_status_only` limits
  agent shipment edits to status/notes at the database, not just the UI.
- **Service-role hygiene:** `lib/supabase-server.ts` imports `server-only`, so a
  client-side import is a build error. No `NEXT_PUBLIC_` leakage of the key.
- **Auth on API routes:** all privileged handlers verify the caller's Supabase JWT
  *and* re-check org-admin membership server-side. Bearer-token auth (no ambient
  cookies) makes classic CSRF inapplicable to these endpoints.
- **Stripe webhook:** signature verified with `constructEvent` against the raw body.
- **Storage:** attachments moved to a private bucket (0024); reads/writes scoped to
  the org whose UUID prefixes the object path; app renders via signed URLs.
- **XSS:** no `dangerouslySetInnerHTML` with dynamic data (the one usage is a
  static theme-init constant). Invite-email HTML escapes interpolated values and
  strips CR/LF from the subject header.
- **CSV formula injection:** `lib/csv.ts` neutralizes `= + - @` / tab / CR prefixes.
- **Headers:** CSP, HSTS (preload), `frame-ancestors 'none'` + `X-Frame-Options`,
  `nosniff`, Referrer-Policy, Permissions-Policy; `poweredByHeader` off.
- **SQLi:** no string-built SQL anywhere; all access goes through supabase-js
  builders / RPCs with bound parameters.

---

## 3. Security findings

### S-1 (Medium-High) — Invite-email links built from the attacker-controlled `Origin` header — ✅ Fixed in this branch

**Where:** `app/api/invitations/route.ts`

**Risk.** The invite link placed into the email was
`` `${request.headers.get("origin")}/invite/${token}` ``. `Origin` is a plain
request header the caller sets freely. Any org admin (including a self-served
attacker org on a SaaS deployment) could send
`Origin: https://evil.example` and have **our domain** email a victim a
legitimate-looking CargoBook invitation whose "set your password" link lands on a
credential-harvesting page. This is host-header injection weaponized through
transactional email — the classic password-reset-poisoning pattern.

**Fix applied.** Links are now built by `lib/app-url.ts`: the configured
`NEXT_PUBLIC_APP_URL` wins; otherwise the request URL's origin (validated by the
hosting platform's router) is used. The `Origin` header is never consulted.
Set `NEXT_PUBLIC_APP_URL=https://<your-domain>` in production.

### S-2 (Medium) — Invitation tokens stored in plaintext — ✅ Fixed in this branch

**Where:** `app/api/invitations/route.ts`, `app/api/invitations/accept/route.ts`

**Risk.** An invite token is a bearer credential: presenting it joins the org and
(for a new invitee) sets the account password. Tokens were stored raw in
`invitations.token`, so any read exposure of that table — a leaked backup, a
misconfigured dashboard export, an over-broad future RLS policy — converts
directly into live account-takeover links. Password-reset/invite tokens should be
treated like passwords: store a digest, not the secret.

**Fix applied.** `lib/invite-token.ts` hashes tokens with SHA-256 before insert
(the 256-bit random token makes offline brute force meaningless, so no salt/KDF is
needed). Redemption hashes the presented token for lookup, with a plaintext
fallback so invites issued before this change stay redeemable — those rows age out
within the 7-day expiry, after which the fallback can be deleted.

### S-3 (Low-Medium) — Stripe redirect URLs derived from the `Origin` header — ✅ Fixed in this branch

**Where:** `app/api/stripe/checkout/route.ts`

**Risk.** `success_url`/`cancel_url` came from the same spoofable header, letting a
crafted request bounce a completed-payment browser session to an arbitrary site
(open-redirect through Stripe, useful for "payment confirmed, now re-enter your
card" phishing). Lower severity than S-1 because the caller must be an
authenticated org admin, but the same class of bug.

**Fix applied.** Both URLs now use `appBaseUrl()` (S-1's helper).

### S-4 (Low) — Checkout completion granted a paid plan before payment settled — ✅ Fixed in this branch

**Where:** `app/api/stripe/webhook/route.ts`

**Risk.** `checkout.session.completed` fires even when the payment method is
asynchronous and still pending (`payment_status: "unpaid"`); the handler
unconditionally set `plan = 'pro'`. A user paying with a delayed method that later
fails would keep Pro until the next subscription event happened to correct it.

**Fix applied.** The upgrade now requires `payment_status` of `paid` or
`no_payment_required`; the `customer.subscription.*` handlers reconcile all later
transitions as before.

### S-5 (Low) — No server-side email validation on invite creation — ✅ Fixed in this branch

**Where:** `app/api/invitations/route.ts`

**Risk.** Any string was persisted and handed to the mail provider as a recipient.
No header injection was possible (Resend takes JSON, and the subject already strips
CR/LF), but garbage recipients pollute the invitations table and waste provider
quota. A shape check (`EMAIL_RE`) now rejects plainly invalid addresses; Supabase
Auth remains the final authority at account creation.

### S-6 (Medium, recommendation) — No rate limiting on the API routes

`/api/invitations` (sends email), `/api/invitations/accept` (creates accounts),
and `/api/stripe/checkout` (creates Stripe objects) accept unlimited request
rates. Token entropy (256 bits) makes invite brute force infeasible, but a
compromised admin account can spam invite email from your domain (reputation
damage), and unauthenticated `accept` probes generate database and Auth-API load.

**Recommendation.** Enforce limits at the edge (Vercel WAF rule or middleware with
a durable store — in-memory counters don't survive serverless instances):

```ts
// middleware.ts (with @upstash/ratelimit + Redis)
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const limiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 req/min/IP on /api/*
});

export async function middleware(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const { success } = await limiter.limit(`api:${ip}`);
  if (!success) return new Response("Too many requests", { status: 429 });
}
export const config = { matcher: "/api/:path*" };
```

Supabase Auth's own login/signup rate limits (Dashboard → Auth → Rate limits)
cover the password-guessing surface.

### S-7 (Low, recommendation) — CSP allows `'unsafe-inline'` scripts

`next.config.ts` documents why: Next's bootstrap inline script plus the theme-init
snippet. This CSP still blocks external script injection, but an attacker who finds
an HTML-injection foothold could execute inline script. The stricter fix is
nonce-based CSP via middleware (Next supports per-request nonces), at the cost of
forcing dynamic rendering:

```ts
// middleware.ts (sketch)
const nonce = crypto.randomUUID();
res.headers.set(
  "Content-Security-Policy",
  `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
);
```

Worth doing if the app ever renders rich user-supplied content; optional at the
current exposure level (React escapes all interpolated output).

### S-8 (Informational) — Accepted invite discloses invitee email to the link holder

`GET /api/invitations/accept?token=…` returns the invite's email/role/org. That is
capability-URL semantics — the token *is* the authorization — and is required for
the accept page UX. Acceptable; noted so it's a conscious choice.

### S-9 (Informational) — Dependency advisories

`npm audit`: 2 moderate advisories, both the same root cause — `postcss < 8.5.10`
**bundled inside `next`'s compiled dependencies** (GHSA-qx2v-qp2m-jg93, XSS via
unescaped `</style>` in stringified output). This is a build-time code path; the
app never stringifies untrusted CSS, so practical risk is negligible. Do **not**
run `npm audit fix --force` (it would downgrade Next to 9.x). Clear it by
upgrading Next when a release past `16.3.0` ships the patched bundle.

---

## 4. Performance findings

### P-1 (High impact at scale) — Unbounded list queries with client-side filtering

**Where:** every list page (`shipments`, `invoices`, `payments`, `expenses`,
`customers`, `flights/*`, statement pages). Example —
`app/(app)/shipments/page.tsx` fetches **every** shipment row (`select("*")` plus
two joined tables) *and* every payment row, then filters/searches in React.

**Risk.** Fine at hundreds of rows; at tens of thousands it means multi-megabyte
payloads, slow Supabase responses, and main-thread jank on every keystroke-driven
re-filter. Only the audit pages currently cap results (`.limit(300)`).

**Recommendation.** Page and filter in the database — RLS applies identically:

```ts
const PAGE = 50;
const { data, count } = await supabase
  .from("shipments")
  .select("id, description, weight_kg, total, status, ship_date, invoice_id, destinations(name)",
          { count: "exact" })
  .ilike("description", `%${q}%`)          // server-side search
  .eq(statusFilter ? "status" : "", …)     // apply filters conditionally
  .order("created_at", { ascending: false })
  .range(page * PAGE, page * PAGE + PAGE - 1);
```

Also narrow `select("*")` to the columns each page renders — several pages join
`invoices(bill_to, phone, address)` and render only `bill_to`/`phone`.

As an interim one-liner, add a defensive `.limit(1000)` to every unpaginated list
so a large tenant degrades instead of stalling.

### P-2 (Medium) — Per-invoice payment status computed by shipping all payment rows to the browser

`shipments/page.tsx` downloads the whole `payments` table (per org) to compute
Paid/Partial/Unpaid badges. Follow the `dashboard_summary` precedent (migration
0023) and aggregate in SQL:

```sql
create or replace function public.invoice_payment_totals()
returns table (invoice_id bigint, paid numeric)
language sql stable security invoker as $$
  select invoice_id, sum(amount) from public.payments group by invoice_id;
$$;
```

One row per invoice instead of one per payment.

### P-3 (Low) — Dashboard fallback path

`app/(app)/page.tsx` falls back to fetching three whole tables when the
`dashboard_summary` RPC is missing. Fine as a migration bridge; delete the
fallback once 0023 is confirmed in production so a silent RPC failure (e.g. after
a rename) can't quietly re-enable the slow path.

### P-4 (Positive) — Things already done right

- `dashboard_summary` RPC aggregates totals/series server-side (0023).
- Heavy libraries are handled: `three.js` background is `dynamic(..., { ssr:
  false })` on the login page only; charts are hand-rolled SVG (no chart lib in
  the bundle).
- `0010_performance_indexes.sql` covers hot foreign keys; `memberships(user_id)`
  and `invitations(token unique, org_id, lower(email))` are indexed — the RLS
  helper functions hit `memberships (user_id, org_id)` efficiently.
- Audit pages cap at 300 rows; uploads are client-side downscaled
  (`lib/image.ts`) before hitting storage.

### P-5 (Recommendation) — The app is 100% client-rendered

Every page is `"use client"` and fetches after mount, so each navigation pays
network round-trips post-hydration (spinner → data). Migrating list pages to
React Server Components with `@supabase/ssr` (cookie-based sessions) would cut
first-paint-to-data latency substantially, but it's an architectural change —
pair it with the P-1 pagination work rather than doing it piecemeal.

---

## 5. Prioritized backlog

| # | Item | Severity / Impact | Status |
|---|------|-------------------|--------|
| 1 | Invite link host injection (S-1) | Medium-High | ✅ Fixed |
| 2 | Hash invite tokens at rest (S-2) | Medium | ✅ Fixed |
| 3 | Stripe redirect origin (S-3) | Low-Medium | ✅ Fixed |
| 4 | Webhook unpaid-checkout upgrade (S-4) | Low | ✅ Fixed |
| 5 | Invite email validation (S-5) | Low | ✅ Fixed |
| 6 | Edge rate limiting on `/api/*` (S-6) | Medium | Recommended |
| 7 | Server-side pagination + column narrowing (P-1) | High at scale | Recommended |
| 8 | Payment-totals RPC (P-2) | Medium | Recommended |
| 9 | Nonce-based CSP (S-7) | Low | Optional |
| 10 | Next.js upgrade to clear postcss advisory (S-9) | Low | When available |
| 11 | RSC migration for list pages (P-5) | Perf/UX | Long-term |

**Deployment note:** set `NEXT_PUBLIC_APP_URL` in production (see `.env.example`).
No database migration is required for any fix in this branch.
