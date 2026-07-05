import { createClient } from "@supabase/supabase-js";

// Placeholder values keep `next build` working before you add your own
// .env.local — the app itself needs the real values to function.
const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder";

export const isConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const supabase = createClient(url, anonKey);
