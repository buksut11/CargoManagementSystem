# Monthly subscription billing lifecycle

Every registered organization is billed on a monthly cycle. This document
describes how the lifecycle works, what runs it, and how to set it up.

## The state machine

```
        payment received (any time — before due, in grace, or while frozen)
      ┌──────────────────────────────────────────────────────────┐
      ▼                                                          │
   ACTIVE ── month end − reminder days ──▶ invoice opens,        │
      │                                    reminder sent         │
      │  due date (month end) passes, invoice unpaid             │
      ▼                                                          │
  PAST_DUE  — 3-day grace period, service continues, banner ─────┤
      │                                                          │
      │  grace expires, invoice still unpaid                     │
      ▼                                                          │
   FROZEN   — read-only: browsing works, writes are blocked ─────┘
```

- **Paying at any point** settles the open invoice and advances the billing
  month by one — computed from the *later* of "now" and the old month's end,
  so paying early never costs days. Access is restored instantly.
- **No data is ever deleted or lost, in any state.** Freezing is a status
  value plus a database write-guard; every row stays exactly where it is and
  is fully visible (read-only) while frozen.
- Organizations whose subscription is managed by **Stripe**
  (`stripe_subscription_id` set) are skipped by this internal lifecycle — the
  Stripe webhook keeps their status in sync instead.

## Database (migration `0044_subscription_lifecycle.sql`)

| Piece | Purpose |
|---|---|
| `organizations.current_period_start/end` | The running billing month; `current_period_end` is the due date. Existing orgs are backfilled to a fresh month starting at migration time. |
| `organizations.billing_reminder_days` | Days before month-end the reminder goes out (default 5, per-org). |
| `subscription_invoices` | One row per billing month: amount, `due_at`, `grace_until` (= due + 3 days), `status` open/paid. Admin-readable via RLS; only the server writes. |
| `billing_notifications` | In-app notifications (`reminder`, `due`, `grace`, `frozen`, `paid`) with delivery flags for email/WhatsApp. Admins read and mark-as-read. |
| `billing_tick(amount, currency)` | The daily engine: opens invoices + reminders, sends the day-before nudge, starts grace (`past_due`), freezes after grace. Idempotent — safe to run any number of times. |
| `record_subscription_payment(org, ref)` | Called by every payment route on an approved charge: marks the invoice paid, advances the month, reactivates the org, queues a "payment received" notification. |
| `block_frozen_writes()` trigger | Attached to every org-scoped business table. While an org is frozen, INSERT/UPDATE/DELETE raise a clear error — the org is genuinely read-only *in the database*, not just in the UI. Billing tables and `organizations` itself are exempt so a frozen org can still pay its way out. |

> A table added by a future migration needs the freeze trigger too — re-run
> `0044` (it is idempotent) after adding tables.

## What runs the clock

Two interchangeable schedulers; use either or both (the tick is idempotent):

1. **pg_cron** — migration `0044` schedules `billing_tick()` daily at 03:10 UTC
   if the extension is enabled (Supabase Dashboard → Database → Extensions →
   `pg_cron`; re-run the migration after enabling). This advances states but
   does **not** send email/WhatsApp.
2. **`/api/billing/cron`** — runs the tick *and* delivers notifications.
   Protected by `CRON_SECRET` (env). On Vercel, `vercel.json` schedules it
   daily and Vercel Cron authenticates automatically once `CRON_SECRET` is
   set. Anywhere else:

   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" https://your-app/api/billing/cron
   ```

## Notifications

Every lifecycle event writes an **in-app notification** (Settings →
Subscription) — that always works with zero configuration. The cron route
additionally delivers each one:

- **Email — plain SMTP** (`SMTP_HOST/PORT/USER/PASS/FROM`), so any provider
  works. Sent to the organization's contact email plus every owner/admin's
  account email.
- **WhatsApp — Meta WhatsApp Cloud API** (`WHATSAPP_ACCESS_TOKEN`,
  `WHATSAPP_PHONE_NUMBER_ID`), sent to the organization's contact phone.
  Free-form text only reaches numbers that messaged you within 24 h; for
  reliable proactive reminders create a pre-approved **template** with two
  body parameters ({{1}} title, {{2}} body) and set `WHATSAPP_TEMPLATE_NAME`
  (+ `WHATSAPP_TEMPLATE_LANG`, default `en`).

Unconfigured channels are skipped silently; delivery is retried on later runs
(for notifications up to 7 days old) and each channel is marked sent per
notification, so nothing is double-sent.

## UI/UX flow

| State | Owners/Admins | Managers & Agents |
|---|---|---|
| Active, mid-month | Nothing new | Nothing new |
| Last *N* days (default 5) | Amber banner "billing month ends in X days" + **Renew** button → Settings; in-app notification (+ email/WhatsApp) | — |
| Grace (`past_due`) | Red banner with the grace deadline + **Pay** button; notifications | — (service uninterrupted) |
| Frozen | Red **read-only** banner on every page + **Pay now**; Settings shows the open invoice and the three payment cards (EVC Plus, eDahab, Premier Bank) | Same read-only banner ("ask an admin"); browsing/reading still works, any write fails with a clear message |
| Payment settles | "Payment received" notification; banner disappears; new month begins | Back to normal instantly |

The Settings page's **Subscription** card shows the current state, renewal
date, days remaining, the open invoice, and the notification history with
unread markers.

## Price

The monthly amount is `BILLING_PLAN_AMOUNT` / `BILLING_CURRENCY` (default
25 USD) — the same value the payment cards charge. Keep `lib/plans.ts`'s
`priceLabel` in step so the UI shows what is billed.
