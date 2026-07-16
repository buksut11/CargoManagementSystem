import "server-only";
import { createHash } from "node:crypto";

// An invite token is a bearer credential: whoever presents it can join the
// organization and, for a new account, set its password. Only the SHA-256
// digest of the token is stored, so a leaked invitations row (backup, log,
// misconfigured access) cannot be replayed as a live invite link — the raw
// token exists solely in the link the inviter shares.
export function hashInviteToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
