import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

// POST /api/invitations { orgId, email, role } → creates an invite and, if an
// email provider (Resend) is configured, emails the link. Always returns the
// link so it can also be copied/shared manually.
export async function POST(request: Request) {
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  let body: { orgId?: string; email?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const orgId = body.orgId;
  const email = body.email?.trim().toLowerCase();
  const role = ["admin", "manager", "agent"].includes(body.role ?? "")
    ? (body.role as string)
    : "agent";
  if (!token || !orgId || !email) {
    return NextResponse.json({ error: "Missing email or organization." }, { status: 400 });
  }

  let admin;
  try {
    admin = createServiceClient();
  } catch {
    return NextResponse.json({ error: "Server is not configured." }, { status: 500 });
  }

  const { data: userData } = await admin.auth.getUser(token);
  const user = userData.user;
  if (!user) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  // Caller must be an owner/admin of the organization.
  const { data: mem } = await admin
    .from("memberships")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!mem || !["owner", "admin"].includes(mem.role as string)) {
    return NextResponse.json(
      { error: "Only organization admins can invite people." },
      { status: 403 },
    );
  }

  const inviteToken = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
  const { error: insErr } = await admin.from("invitations").insert({
    org_id: orgId,
    email,
    role,
    token: inviteToken,
    invited_by: user.id,
  });
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  const link = `${origin}/invite/${inviteToken}`;

  // Fetch the org name for a friendlier email (best-effort).
  const { data: orgRow } = await admin
    .from("organizations")
    .select("name")
    .eq("id", orgId)
    .single();
  const orgName = (orgRow?.name as string) ?? "a CargoBook organization";

  let emailed = false;
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const from = process.env.RESEND_FROM ?? "CargoBook <onboarding@resend.dev>";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: email,
        subject: `You've been invited to ${orgName} on CargoBook`,
        html: `<p>You've been invited to join <strong>${orgName}</strong> on CargoBook as ${role}.</p>
<p><a href="${link}">Click here to accept and set your password</a>.</p>
<p>Or paste this link into your browser:<br>${link}</p>
<p>This invite expires in 7 days.</p>`,
      }),
    });
    emailed = res.ok;
  }

  return NextResponse.json({ link, emailed });
}
