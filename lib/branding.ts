// Login-page branding: which organization's name/logo the pre-auth screens
// should show. Resolved two ways, in priority order:
//   1. A branded login link — /login?org={slug} — resolved via the anon-safe
//      login_branding() RPC (migration 0025).
//   2. A localStorage cache written by the app layout whenever it resolves the
//      active org, so returning users see their own org on the login screen
//      even without the branded link.
// Falls back to the default CargoBook branding when neither is available.

export type LoginBranding = {
  name: string;
  logoUrl: string | null;
};

const BRANDING_KEY = "cargobook:branding";

export function readCachedBranding(): LoginBranding | null {
  try {
    const raw = localStorage.getItem(BRANDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LoginBranding>;
    if (typeof parsed.name !== "string" || !parsed.name) return null;
    return {
      name: parsed.name,
      logoUrl: typeof parsed.logoUrl === "string" ? parsed.logoUrl : null,
    };
  } catch {
    return null;
  }
}

export function cacheBranding(branding: LoginBranding | null) {
  try {
    if (branding) localStorage.setItem(BRANDING_KEY, JSON.stringify(branding));
    else localStorage.removeItem(BRANDING_KEY);
  } catch {
    // localStorage unavailable — the login page falls back to defaults.
  }
}
