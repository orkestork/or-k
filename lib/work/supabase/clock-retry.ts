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
    if (!/PGRST303|issued at future/i.test(body)) return res;
    await new Promise((r) => setTimeout(r, wait));
    res = await fetch(input, init);
  }
  return res;
}
