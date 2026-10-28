"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";
import { fetchWithClockRetry } from "./clock-retry";

/** Browser-side Supabase client for the OR-K WORK module. */
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { fetch: fetchWithClockRetry } });
}
