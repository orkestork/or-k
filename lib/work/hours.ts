/** "1.5", "1,5", "1:30", "90m" or "2h" → minutes (0 when invalid). */
export function parseHours(input: string): number {
  const v = input.trim().toLowerCase().replace(",", ".");
  if (!v) return 0;
  const hm = v.match(/^(\d+):(\d{1,2})$/);
  if (hm) return Number(hm[1]) * 60 + Number(hm[2]);
  const m = v.match(/^(\d+(?:\.\d+)?)\s*m(in)?$/);
  if (m) return Math.round(Number(m[1]));
  const h = v.match(/^(\d+(?:\.\d+)?)\s*h?$/);
  if (h) return Math.round(Number(h[1]) * 60);
  return 0;
}

/** Minutes → "1 h 30 min" style, compact. */
export function formatHours(minutes: number): string {
  if (!minutes) return "0 h";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export const toHours = (minutes: number) => Math.round((minutes / 60) * 10) / 10;
