import { createClient } from "@supabase/supabase-js";
import { getEnv } from "@/lib/env";

/** Service-role client for trusted server mutations only. */
export function createAdminClient() {
  const env = getEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
