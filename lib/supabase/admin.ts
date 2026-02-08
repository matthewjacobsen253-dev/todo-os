import { createClient } from "@supabase/supabase-js";

/**
 * Admin Supabase client using the service role key.
 * Bypasses Row Level Security — use only in server-side API routes
 * for operations where RLS policies would block legitimate actions.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
