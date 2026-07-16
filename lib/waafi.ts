import "server-only";

// WaafiPay is Hormuud's official payment gateway. One merchant account exposes
// EVC Plus (Hormuud), ZAAD (Telesom) and Sahal (Golis) through the same API.
// Unlike Stripe there is no redirect and no webhook: we call the gateway with
// the customer's phone number, they approve on their handset with a USSD PIN
// prompt, and the result comes back synchronously in the same HTTP response.
//
// Configure it with three SERVER-ONLY secrets (no NEXT_PUBLIC_ prefix), issued
// when you register as a WaafiPay merchant:
//   WAAFI_MERCHANT_UID, WAAFI_API_USER_ID, WAAFI_API_KEY
// Optional: WAAFI_API_URL (defaults to the live endpoint; point at the sandbox
// endpoint from your merchant onboarding while testing).

const DEFAULT_API_URL = "https://api.waafipay.net/asm";

export type WaafiConfig = {
  apiUrl: string;
  merchantUid: string;
  apiUserId: string;
  apiKey: string;
};

// Returns the config only when every required secret is present, so callers can
// respond "not configured yet" (501) exactly like the Stripe routes do.
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

// Normalises a Somali mobile number to WaafiPay's expected form: full
// international, digits only, no leading "+" or "0" (e.g. "252615000000").
// Accepts "0615…", "615…", "+252615…" and "252615…". Returns null if it
// can't produce a plausible 12-digit 252 number.
export function normalizeSomaliPhone(input: string): string | null {
  let digits = (input || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("252")) {
    // already international
  } else if (digits.startsWith("0")) {
    digits = "252" + digits.slice(1);
  } else if (digits.length === 9) {
    // bare subscriber number like 615000000
    digits = "252" + digits;
  } else {
    return null;
  }
  // 252 + 9-digit subscriber number.
  return /^252\d{9}$/.test(digits) ? digits : null;
}

export type WaafiPurchaseResult = {
  ok: boolean;
  transactionId?: string;
  referenceId?: string;
  // WaafiPay's human-readable message (e.g. "RCS_SUCCESS" or a decline reason).
  message?: string;
  code?: string;
};

// Runs an API_PURCHASE against a customer's mobile wallet and waits for the
// synchronous result. responseCode "2001" is success; anything else is a
// decline/error whose reason is surfaced to the caller.
export async function waafiPurchase(
  cfg: WaafiConfig,
  args: {
    accountNo: string; // normalised phone, e.g. "252615000000"
    amount: number;
    currency?: string; // "USD" (default) or "SOS"
    referenceId: string; // unique per attempt — guards against double charges
    invoiceId?: string;
    description?: string;
    timeoutMs?: number;
  },
): Promise<WaafiPurchaseResult> {
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

    if (!data) {
      return { ok: false, message: "No response from WaafiPay." };
    }

    const ok = data.responseCode === "2001";
    return {
      ok,
      code: data.responseCode,
      message: data.responseMsg,
      transactionId: data.params?.transactionId,
      referenceId: data.params?.referenceId,
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
