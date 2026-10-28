import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/** True when the service-role key is present (needed to create users). */
export const adminConfigured = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

/**
 * Service-role client. Bypasses RLS — only call it from server code that has
 * already checked the caller is an admin.
 */
export function createAdminClient() {
  if (!adminConfigured) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en el servidor");
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
