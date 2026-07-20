import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { PLAN_AMOUNT, PLAN_CURRENCY } from "@/lib/billing";
import {
  emailConfigured,
  sendBillingEmail,
  sendBillingWhatsApp,
  whatsappConfigured,
} from "@/lib/notify";

export const runtime = "nodejs";

// The daily billing heartbeat. Call it once a day from any scheduler:
//   - Vercel Cron (see vercel.json) — sends "Authorization: Bearer CRON_SECRET"
//     automatically when the CRON_SECRET env var is set;
//   - or curl -H "Authorization: Bearer $CRON_SECRET" https://…/api/billing/cron
// It (1) runs billing_tick() — open invoices, reminders, grace, freeze — and
// (2) delivers any undelivered billing notifications by SMTP email (to the
// org's contact email + every owner/admin) and WhatsApp (to the org's phone).
// Both steps are idempotent, so overlapping or repeated runs are harmless.

type PendingNotification = {
  id: number;
  organization_id: string;
  title: string;
  body: string;
  email_sent: boolean;
  whatsapp_sent: boolean;
};

async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Set CRON_SECRET to enable the billing cron." },
      { status: 501 },
    );
  }
  const auth = request.headers.get("authorization") ?? "";
  if (auth.replace(/^Bearer\s+/i, "") !== secret) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  let admin;
  try {
    admin = createServiceClient();
  } catch {
    return NextResponse.json({ error: "Server is not configured." }, { status: 500 });
  }

  // 1) Advance the lifecycle.
  const { data: tick, error: tickErr } = await admin.rpc("billing_tick", {
    p_amount: PLAN_AMOUNT,
    p_currency: PLAN_CURRENCY,
  });
  if (tickErr) {
    return NextResponse.json(
      { error: `billing_tick failed: ${tickErr.message}` },
      { status: 500 },
    );
  }

  // 2) Deliver what the tick (and payments) queued. Only channels that are
  // actually configured are considered, so an unconfigured channel neither
  // blocks delivery of the other nor marks anything as sent. Recent rows only:
  // configuring a channel weeks later must not replay ancient reminders.
  const doEmail = emailConfigured();
  const doWhatsApp = whatsappConfigured();
  let emailed = 0;
  let messaged = 0;

  if (doEmail || doWhatsApp) {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const filters = [
      doEmail ? "email_sent.eq.false" : null,
      doWhatsApp ? "whatsapp_sent.eq.false" : null,
    ].filter(Boolean);
    const { data: pending } = await admin
      .from("billing_notifications")
      .select("id, organization_id, title, body, email_sent, whatsapp_sent")
      .or(filters.join(","))
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(100);

    // Look up each org's contacts once, not per notification.
    const orgIds = [...new Set((pending ?? []).map((n) => n.organization_id))];
    const contacts = new Map<string, { emails: string[]; phone: string | null }>();
    for (const orgId of orgIds) {
      const { data: org } = await admin
        .from("organizations")
        .select("email, phone")
        .eq("id", orgId)
        .single();
      const { data: admins } = await admin
        .from("memberships")
        .select("user_id")
        .eq("org_id", orgId)
        .in("role", ["owner", "admin"]);
      const ids = (admins ?? []).map((m) => m.user_id);
      let adminEmails: string[] = [];
      if (ids.length) {
        const { data: profiles } = await admin
          .from("profiles")
          .select("email")
          .in("id", ids);
        adminEmails = (profiles ?? [])
          .map((p) => p.email)
          .filter((e): e is string => Boolean(e));
      }
      const emails = [...new Set([org?.email, ...adminEmails].filter(Boolean))] as string[];
      contacts.set(orgId, { emails, phone: org?.phone ?? null });
    }

    for (const n of (pending ?? []) as PendingNotification[]) {
      const contact = contacts.get(n.organization_id);
      if (!contact) continue;
      const updates: Record<string, boolean> = {};
      if (doEmail && !n.email_sent) {
        if (await sendBillingEmail(contact.emails, n.title, n.body)) {
          updates.email_sent = true;
          emailed++;
        }
      }
      if (doWhatsApp && !n.whatsapp_sent) {
        if (await sendBillingWhatsApp(contact.phone, n.title, n.body)) {
          updates.whatsapp_sent = true;
          messaged++;
        }
      }
      if (Object.keys(updates).length) {
        await admin.from("billing_notifications").update(updates).eq("id", n.id);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    tick,
    delivered: { email: emailed, whatsapp: messaged },
    channels: { email: doEmail, whatsapp: doWhatsApp },
  });
}

export { handle as GET, handle as POST };
