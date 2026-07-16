import "server-only";
import type { ChargeResult } from "@/lib/billing";

// Premier Bank Somalia — charged through the bank's own merchant API (Premier
// Wallet). Separate from WaafiPay and eDahab.
//
// SCAFFOLD: Premier's API is issued per-merchant and isn't publicly documented,
// so this is a generic bearer-token request whose ENDPOINT PATH, FIELD NAMES and
// RESPONSE SHAPE must be filled in from the integration guide you receive. It is
// wired the same way as the other two providers (auth, logging, plan upgrade),
// so once the request/response below match their docs it works end-to-end.
//
// Configure with SERVER-ONLY secrets (no NEXT_PUBLIC_ prefix):
//   PREMIER_API_URL, PREMIER_API_KEY, PREMIER_MERCHANT_ID
// There is no default URL — set PREMIER_API_URL to the base they give you.

export type PremierConfig = {
  apiUrl: string;
  apiKey: string;
  merchantId: string;
};

export function getPremierConfig(): PremierConfig | null {
  const apiUrl = process.env.PREMIER_API_URL;
  const apiKey = process.env.PREMIER_API_KEY;
  const merchantId = process.env.PREMIER_MERCHANT_ID;
  if (!apiUrl || !apiKey || !merchantId) return null;
  return { apiUrl, apiKey, merchantId };
}

export async function premierPurchase(
  cfg: PremierConfig,
  args: {
    accountNo: string; // customer phone or Premier account, as entered
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
    // TODO: replace the path, body fields and auth header with Premier Bank's
    // real merchant API once you have the docs. This is a sensible placeholder.
    const res = await fetch(`${cfg.apiUrl}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        merchantId: cfg.merchantId,
        account: args.accountNo,
        amount: args.amount.toFixed(2),
        currency: args.currency ?? "USD",
        reference: args.referenceId,
        description: args.description ?? "CargoBook payment",
      }),
    });

    const data = (await res.json().catch(() => null)) as
      | {
          status?: string;
          transactionId?: string;
          code?: string | number;
          message?: string;
        }
      | null;

    if (!data) return { ok: false, message: "No response from Premier Bank." };

    const ok =
      String(data.status).toLowerCase() === "success" ||
      String(data.status).toLowerCase() === "approved";
    return {
      ok,
      code: data.code != null ? String(data.code) : undefined,
      message: data.message,
      transactionId: data.transactionId,
    };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      message: aborted
        ? "The payment timed out. Check your account before retrying."
        : "Could not reach Premier Bank. Please try again.",
    };
  } finally {
    clearTimeout(timeout);
  }
}
