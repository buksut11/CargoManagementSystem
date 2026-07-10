---
name: verify
description: Build, run, and visually verify the CargoBook Next.js app.
---

# Verifying CargoBook changes

## Build & run

```bash
npm install
npx next build            # must pass; ~1 min
npx next start -p 3111    # production server (run in background)
curl -s -o /dev/null -w "%{http_code}" http://localhost:3111/login   # expect 200
```

No `.env.local` in CI/sandbox environments — Supabase is unconfigured, so
`/login` shows an amber "Supabase is not configured yet" notice and sign-in
cannot complete. That notice is expected, not a regression. App pages under
`app/(app)/` redirect to `/login` without a session.

## Driving UI (screenshots)

Chromium is pre-installed for Playwright. Install `playwright-core` in the
scratchpad (not the repo) and launch with:

```js
chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox"],
});
```

Theme is a `.dark` class on `<html>`, initialised from `localStorage.theme`
or `prefers-color-scheme` — use Playwright's `colorScheme: "dark" | "light"`
context option to pick a theme. Wait ~1.8s after load for the GSAP entrance
animation before screenshotting the login page.

## Gotchas

- Rebuilding while `next start` is running serves a stale BUILD_ID and the
  page renders blank — kill and restart the server after every rebuild.
- `npm run lint`: `app/login/page.tsx` has a pre-existing
  `react-hooks/set-state-in-effect` error (remember-email prefill effect).
