# Plan 1 — Foundation & authentication

**Read `SPEC.md` first (§2, §3, §6.1, §9).** This plan creates the project itself: scaffold,
Supabase auth, staff roles, and the app shell every later plan plugs into.

## Build

### 1. Scaffold

- `create-next-app` (Next.js 15, TypeScript, App Router, Tailwind 4, ESLint, Turbopack),
  then add: `@supabase/supabase-js`, `@supabase/ssr`, shadcn/ui (init with the slate base),
  `next-themes`, `lucide-react`, `sonner`, `react-hook-form`, `@hookform/resolvers`, `zod`,
  `date-fns`, and dev deps `vitest` + `@vitejs/plugin-react`.
- Scripts: `dev`, `build`, `start`, `lint`, `test` (vitest run). Add `vitest.config.ts`.
- Design system per SPEC §9: cargo-orange primary (`#ea580c` / dark `#fb923c`), slate
  neutrals, CSS variables in `app/globals.css` (shadcn convention), theme toggle via
  `next-themes` with no flash on load.
- `.env.example` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`. `.gitignore` covers `.env*.local`. Fail fast with a named
  error if env vars are missing (`lib/supabase/env.ts` + test).

### 2. Supabase plumbing

- `lib/supabase/client.ts` (browser), `server.ts` (server components/actions),
  `middleware.ts` + root `middleware.ts` that refreshes sessions and redirects signed-out
  users to `/login` (leave a documented allowlist hook for the future public `/track` page).
- `lib/supabase/admin.ts`: service-role client, `server-only`.

### 3. Migration `supabase/migrations/0001_profiles.sql`

- `profiles`: id (uuid pk = auth user id), `full_name`, `role` check (`admin`/`agent`),
  `active` boolean default true, timestamps.
- Helpers `is_admin()` and `is_active_staff()` (SECURITY DEFINER, used by all later RLS).
- RLS: active staff read all profiles; users update their own `full_name`; only admins
  insert/update others.
- `supabase/seed/first_admin.sql`: commented template to promote the first user to admin.

### 4. Screens

- `/login`: centered card with logo/name "CargoBook", email + password (Zod:
  `lib/validations/auth.ts` + tests), server action, friendly wrong-credentials error,
  deactivated-account guard (signed out with an explanatory message).
- Protected layout `app/(dashboard)/layout.tsx`: sidebar (desktop) / bottom nav (mobile)
  with the SPEC §6.1 sections — most link to placeholder pages that render a designed
  "coming soon" empty state for now; Reports and Settings visible to admins only. User
  menu: name, role badge, profile link, theme toggle, sign out.
- `/` (dashboard home): welcome header + placeholder stat cards ("wired up in Plan 11").
- `/profile`: edit own name; change password (Supabase auth update).
- `/settings/staff` (admin): staff list (name, email, role, active badge), create-staff
  dialog (email + temp password via the admin client, auto-confirm), edit role,
  deactivate/reactivate, reset-password dialog. Zod in `lib/validations/staff.ts` + tests.

### 5. README

Replace the repo README's "Status" section with real setup instructions: create the
Supabase project, disable public sign-ups, set env vars, run migration 0001, create the
first admin via the dashboard + seed file, `npm run dev`.

## How to verify (non-developer checklist)

1. Follow your own README: create the Supabase project, run migration 0001, create the
   first admin. `npm run dev` → you can log in.
2. Signed out, any dashboard URL redirects to `/login`; wrong password shows a friendly
   error, not a crash.
3. Sidebar shows all sections; a non-admin agent (create one from Settings → Staff) does
   not see Reports/Settings and cannot open `/settings/staff` by URL.
4. Deactivate the agent → they are locked out at next request with a clear message.
5. Theme toggle works and persists; the app looks intentional in both themes and on a
   phone-sized window.
6. `npm run lint`, `npm test`, `npm run build` all pass.
