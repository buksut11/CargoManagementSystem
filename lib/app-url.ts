import "server-only";

// Base URL for absolute links the server puts into outbound messages and
// redirects (invite emails, Stripe success/cancel URLs).
//
// Never build these from the Origin request header: Origin is fully
// client-controlled, so a forged request could plant a hostile host inside an
// email sent from our own domain (a credential-phishing link that looks
// legitimate). Prefer the explicitly configured site URL; fall back to the
// requested URL's origin, which on managed hosts is validated by the
// platform's router before the request ever reaches the app.
export function appBaseUrl(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  return new URL(request.url).origin;
}
