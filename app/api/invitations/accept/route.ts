import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

// GET /api/invitations/accept?token=... → details about an invite so the
// accept page can show who it's for. Uses the service role because invitees
// are not yet members and cannot read the invitations table themselves.
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) {
    return NextResponse.json({ valid: false, reason: "missing" }, { status: 400 });
  }

  let admin;
  try {
    admin = createServiceClient();
  } catch {
    return NextResponse.json({ valid: false, reason: "server" }, { status: 500 });
  }

  const { data: invite } = await admin
    .from("invitations")
    .select("email, role, accepted_at, expires_at, organizations(name)")
    .eq("token", token)
    .maybeSingle();

  if (!invite) {
    return NextResponse.json({ valid: false, reason: "not_found" });
  }
  if (invite.accepted_at) {
    return NextResponse.json({ valid: false, reason: "used" });
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ valid: false, reason: "expired" });
  }

  const orgRel = invite.organizations as
    | { name?: string }
    | { name?: string }[]
    | null;
  const orgName = Array.isArray(orgRel) ? orgRel[0]?.name : orgRel?.name;

  return NextResponse.json({
    valid: true,
    email: invite.email,
    role: invite.role,
    orgName: orgName ?? "the organization",
  });
}

// POST /api/invitations/accept { token, password } → creates (or reuses) the
// invitee's account, adds their membership, and marks the invite accepted.
export async function POST(request: Request) {
  let body: { token?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { token, password } = body;
  if (!token || !password || password.length < 8) {
    return NextResponse.json(
      { error: "A token and a password of at least 8 characters are required." },
      { status: 400 },
    );
  }

  let admin;
  try {
    admin = createServiceClient();
  } catch {
    return NextResponse.json(
      { error: "Server is not configured for invitations." },
      { status: 500 },
    );
  }

  const { data: invite } = await admin
    .from("invitations")
    .select("id, org_id, email, role, accepted_at, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!invite || invite.accepted_at) {
    return NextResponse.json(
      { error: "This invitation is no longer valid." },
      { status: 400 },
    );
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "This invitation has expired." }, { status: 400 });
  }

  const email = invite.email.toLowerCase();

  // Create the account, or find it if the email already has one.
  let userId: string | null = null;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created?.user) {
    userId = created.user.id;
  } else if (createErr) {
    // Already registered → locate the existing user and add them to the org.
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    userId = list?.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
    if (!userId) {
      return NextResponse.json(
        { error: "Could not create or find this account. Try signing in instead." },
        { status: 400 },
      );
    }
  }

  // Add the membership (idempotent) and mark the invite accepted.
  const { error: memErr } = await admin
    .from("memberships")
    .upsert(
      { org_id: invite.org_id, user_id: userId, role: invite.role },
      { onConflict: "org_id,user_id" },
    );
  if (memErr) {
    return NextResponse.json({ error: memErr.message }, { status: 500 });
  }

  await admin
    .from("invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  return NextResponse.json({ ok: true, email });
}
