import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role Supabase client for trusted server code ONLY (route handlers).
// It bypasses Row-Level Security, so it must never be imported by a client
// component. The "server-only" import above makes the build fail if it is.
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase service client not configured: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
