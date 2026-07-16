import "server-only";
import type { ChargeResult } from "@/lib/billing";

// EVC Plus is Hormuud's mobile money. It's charged through WaafiPay, Hormuud's
// official gateway (api.waafipay.net). Unlike Stripe there is no redirect and no
// webhook: we call the gateway with the customer's phone number, they approve on
// their handset with a USSD PIN prompt, and the result comes back synchronously
// in the same HTTP response.
//
// Configure with three SERVER-ONLY secrets (no NEXT_PUBLIC_ prefix), issued when
// you register as a WaafiPay merchant:
//   WAAFI_MERCHANT_UID, WAAFI_API_USER_ID, WAAFI_API_KEY
// Optional WAAFI_API_URL points at the sandbox endpoint while testing.

const DEFAULT_API_URL = "https://api.waafipay.net/asm";

export type WaafiConfig = {
  apiUrl: string;
  merchantUid: string;
  apiUserId: string;
  apiKey: string;
};

// Returns the config only when every required secret is present, so the route
// can respond "not configured yet" (501).
export function getWaafiConfig(): WaafiConfig | null {
  const merchantUid = process.env.WAAFI_MERCHANT_UID;
  const apiUserId = process.env.WAAFI_API_USER_ID;
  const apiKey = process.env.WAAFI_API_KEY;
  if (!merchantUid || !apiUserId || !apiKey) return null;
  return {
    apiUrl: process.env.WAAFI_API_URL || DEFAULT_API_URL,
    merchantUid,
    apiUserId,
    apiKey,
  };
}

// Runs an API_PURCHASE against a customer's EVC wallet and waits for the
// synchronous result. responseCode "2001" is success; anything else is a
// decline/error whose reason is surfaced to the caller.
export async function waafiPurchase(
  cfg: WaafiConfig,
  args: {
    accountNo: string; // normalised phone, e.g. "252615000000"
    amount: number;
    currency?: string;
    referenceId: string;
    invoiceId?: string;
    description?: string;
    timeoutMs?: number;
  },
): Promise<ChargeResult> {
  const controller = new AbortController();
  // The USSD prompt can take a while as the customer finds their phone and
  // types their PIN, so allow a generous window before giving up.
  const timeout = setTimeout(() => controller.abort(), args.timeoutMs ?? 60_000);

  try {
    const res = await fetch(cfg.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        schemaVersion: "1.0",
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        channelName: "WEB",
        serviceName: "API_PURCHASE",
        serviceParams: {
          merchantUid: cfg.merchantUid,
          apiUserId: cfg.apiUserId,
          apiKey: cfg.apiKey,
          paymentMethod: "MWALLET_ACCOUNT",
          payerInfo: { accountNo: args.accountNo },
          transactionInfo: {
            referenceId: args.referenceId,
            invoiceId: args.invoiceId ?? args.referenceId,
            amount: args.amount.toFixed(2),
            currency: args.currency ?? "USD",
            description: args.description ?? "CargoBook payment",
          },
        },
      }),
    });

    const data = (await res.json().catch(() => null)) as
      | {
          responseCode?: string;
          responseMsg?: string;
          params?: { transactionId?: string; referenceId?: string; state?: string };
        }
      | null;

    if (!data) return { ok: false, message: "No response from WaafiPay." };

    return {
      ok: data.responseCode === "2001",
      code: data.responseCode,
      message: data.responseMsg,
      transactionId: data.params?.transactionId,
    };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      message: aborted
        ? "The payment timed out. If you approved it on your phone, check before retrying."
        : "Could not reach WaafiPay. Please try again.",
    };
  } finally {
    clearTimeout(timeout);
  }
}
