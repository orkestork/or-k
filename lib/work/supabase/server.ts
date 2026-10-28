import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";
import { fetchWithClockRetry } from "./clock-retry";

/**
 * Server-side Supabase client (RSC, Route Handlers, Server Actions).
 * Reads/writes the auth cookies through Next's cookie store.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { fetch: fetchWithClockRetry },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — safe to ignore, the middleware
          // refreshes the session on the next request.
        }
      },
    },
  });
}
