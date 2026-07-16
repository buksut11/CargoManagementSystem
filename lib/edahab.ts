import "server-only";
import { createHash } from "crypto";
import type { ChargeResult } from "@/lib/billing";

// eDahab is Somtel / Dahabshiil's mobile money. It has its own merchant API
// (edahab.net) — separate from WaafiPay. Requests are signed with a SHA-256
// hash of the payload plus your secret key, passed as ?hash=… on the URL.
//
// SCAFFOLD: this models eDahab's documented direct-payment flow, but the exact
// field names and the hash recipe MUST be confirmed against the merchant docs
// you receive when you register — providers differ in what goes into the hash
// and in the response shape. Until the three secrets below are set the route
// reports "not configured", so nothing here runs against a live gateway yet.
//
// Configure with SERVER-ONLY secrets (no NEXT_PUBLIC_ prefix):
//   EDAHAB_API_KEY, EDAHAB_API_SECRET, EDAHAB_AGENT_CODE
// Optional EDAHAB_API_URL points at the sandbox while testing.

const DEFAULT_API_URL = "https://edahab.net/api";

export type EdahabConfig = {
  apiUrl: string;
  apiKey: string;
  apiSecret: string;
  agentCode: string;
};

export function getEdahabConfig(): EdahabConfig | null {
  const apiKey = process.env.EDAHAB_API_KEY;
  const apiSecret = process.env.EDAHAB_API_SECRET;
  const agentCode = process.env.EDAHAB_AGENT_CODE;
  if (!apiKey || !apiSecret || !agentCode) return null;
  return {
    apiUrl: process.env.EDAHAB_API_URL || DEFAULT_API_URL,
    apiKey,
    apiSecret,
    agentCode,
  };
}

// eDahab signs the request body by hashing it together with the secret key.
// VERIFY the exact order/encoding against your merchant docs before going live.
function signPayload(secret: string, payload: string): string {
  return createHash("sha256").update(payload + secret).digest("hex").toUpperCase();
}

export async function edahabPurchase(
  cfg: EdahabConfig,
  args: {
    accountNo: string; // normalised phone, e.g. "252625000000"
    amount: number;
    currency?: string;
    referenceId: string;
    description?: string;
    timeoutMs?: number;
  },
): Promise<ChargeResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), args.timeoutMs ?? 60_000);

  try {
    // Field names below follow eDahab's agent-payment request; adjust to match
    // the docs you receive if they differ.
    const payload = JSON.stringify({
      apiKey: cfg.apiKey,
      edahabNumber: args.accountNo,
      amount: args.amount,
      currency: args.currency ?? "USD",
      agentCode: cfg.agentCode,
      referenceId: args.referenceId,
      description: args.description ?? "CargoBook payment",
    });
    const hash = signPayload(cfg.apiSecret, payload);

    const res = await fetch(`${cfg.apiUrl}/api/agentPayment?hash=${hash}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: payload,
    });

    const data = (await res.json().catch(() => null)) as
      | {
          TransactionId?: string;
          TransactionStatus?: string;
          StatusCode?: number | string;
          StatusDescription?: string;
        }
      | null;

    if (!data) return { ok: false, message: "No response from eDahab." };

    const ok =
      String(data.TransactionStatus).toLowerCase() === "approved" ||
      String(data.StatusCode) === "0";
    return {
      ok,
      code: data.StatusCode != null ? String(data.StatusCode) : undefined,
      message: data.StatusDescription,
      transactionId: data.TransactionId,
    };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      message: aborted
        ? "The payment timed out. If you approved it on your phone, check before retrying."
        : "Could not reach eDahab. Please try again.",
    };
  } finally {
    clearTimeout(timeout);
  }
}
