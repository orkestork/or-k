import type { Priority } from "@/types/work/domain";

const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = then - now;
  const abs = Math.abs(diff);
  const min = 60_000;
  const hour = 60 * min;
  const day = 24 * hour;

  if (abs < hour) return rtf.format(Math.round(diff / min), "minute");
  if (abs < day) return rtf.format(Math.round(diff / hour), "hour");
  if (abs < 30 * day) return rtf.format(Math.round(diff / day), "day");
  return new Date(iso).toLocaleDateString("es", { day: "numeric", month: "short" });
}

// A bare "YYYY-MM-DD" parses as UTC midnight, which is the previous day in
// Bogotá; read it at local noon instead.
const toDate = (iso: string) => new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00` : iso);

export function shortDate(iso: string): string {
  return toDate(iso).toLocaleDateString("es", {
    day: "numeric",
    month: "short",
  });
}

export function fullDate(iso: string): string {
  return toDate(iso).toLocaleDateString("es", {
    weekday: "short",
    day: "numeric",
    month: "long",
  });
}

export function daysUntil(iso: string): number {
  const d = toDate(iso);
  d.setHours(23, 59, 59, 999);
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

export function deadlineTone(iso: string): "overdue" | "soon" | "ok" {
  const d = daysUntil(iso);
  if (d < 0) return "overdue";
  if (d <= 2) return "soon";
  return "ok";
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

export function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
