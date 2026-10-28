/**
 * A freshly refreshed session token can be rejected for a moment with
 * "JWT issued at future" (PGRST303) when Supabase's servers disagree on the
 * time by a few seconds. Retry a few times with growing pauses instead of
 * failing the user's action.
 */
export async function fetchWithClockRetry(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const waits = [800, 1500, 2500, 4000];
  let res = await fetch(input, init);
  for (const wait of waits) {
    if (res.status !== 401 && res.status !== 403) return res;
    const body = await res.clone().text();
    if (!/issued at future/i.test(body)) return res;
    await new Promise((r) => setTimeout(r, wait));
    // Next/React memoizes identical GETs during a render, including failures.
    // An explicit signal bypasses that memoization so retries hit Supabase.
    // Preserve a caller's cancellation signal when one was supplied.
    const signal = init?.signal ?? (input instanceof Request ? input.signal : undefined);
    res = await fetch(input, {
      ...init,
      cache: "no-store",
      signal: signal ?? new AbortController().signal,
    });
  }
  return res;
}
