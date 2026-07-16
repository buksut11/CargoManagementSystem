import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { hashInviteToken } from "@/lib/invite-token";

export const runtime = "nodejs";

// Look up an invite by the token from the link. Tokens are stored as SHA-256
// digests (lib/invite-token.ts); the plain-text fallback keeps invites issued
// before hashing redeemable — those rows age out within the 7-day expiry.
async function findInvite(
  admin: ReturnType<typeof createServiceClient>,
  columns: string,
  rawToken: string,
) {
  const { data } = await admin
    .from("invitations")
    .select(columns)
    .eq("token", hashInviteToken(rawToken))
    .maybeSingle();
  if (data) return data;
  const { data: legacy } = await admin
    .from("invitations")
    .select(columns)
    .eq("token", rawToken)
    .maybeSingle();
  return legacy;
}

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

  const invite = (await findInvite(
    admin,
    "email, role, accepted_at, expires_at, organizations(name)",
    token,
  )) as {
    email: string;
    role: string;
    accepted_at: string | null;
    expires_at: string;
    organizations: { name?: string } | { name?: string }[] | null;
  } | null;

  if (!invite) {
    return NextResponse.json({ valid: false, reason: "not_found" });
  }
  if (invite.accepted_at) {
    return NextResponse.json({ valid: false, reason: "used" });
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ valid: false, reason: "expired" });
  }

  const orgRel = invite.organizations;
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

  const invite = (await findInvite(
    admin,
    "id, org_id, email, role, accepted_at, expires_at",
    token,
  )) as {
    id: string;
    org_id: string;
    email: string;
    role: string;
    accepted_at: string | null;
    expires_at: string;
  } | null;

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

  // Create the account for a brand-new invitee.
  let userId: string | null = null;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created?.user) {
    userId = created.user.id;
  } else if (createErr) {
    // The email already has an account. We must NOT silently attach it to this
    // org — the person redeeming the link may not be its owner. Require proof
    // of ownership: the caller must be signed in as that exact account (the
    // client forwards their access token when a session exists).
    const authToken = (request.headers.get("authorization") ?? "").replace(
      /^Bearer\s+/i,
      "",
    );
    if (authToken) {
      const { data: authData } = await admin.auth.getUser(authToken);
      const authUser = authData.user;
      if (authUser && authUser.email?.toLowerCase() === email) {
        userId = authUser.id;
      }
    }
    if (!userId) {
      return NextResponse.json(
        {
          error:
            "An account with this email already exists. Please sign in with it first, then open this invite link again to join.",
        },
        { status: 409 },
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
