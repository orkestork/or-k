"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import type { Request, WorkUserRecord } from "@/types/work/domain";
import { updateRequestDatesAction } from "@/lib/work/actions";
import { WORKFLOW } from "@/lib/work/workflow";
import { peopleOn } from "@/lib/work/people";
import { cn } from "@/lib/work/utils";
import { PersonStack } from "@/components/work/shared/people";

const DAY = 86_400_000;
const COL = 30; // px per day
const DONE = ["approved", "scheduled", "published", "completed"];

// Calendar days as integers on a UTC grid, so no timezone can shift a bar.
const toDay = (ymd: string) => Date.parse(`${ymd}T00:00:00Z`) / DAY;
const fromDay = (n: number) => new Date(n * DAY).toISOString().slice(0, 10);
const ymdOf = (iso: string) => new Date(iso).toLocaleDateString("en-CA");

type Span = { start: number; end: number };
type Drag = { id: string; mode: "move" | "start" | "end"; x: number; orig: Span };

/** Gantt view of a project's requests. Drag a bar to move it, its edges to resize. */
export function Timeline({
  requests,
  users,
  projectStart,
  projectEnd,
  editable = true,
}: {
  requests: Request[];
  users: WorkUserRecord[];
  projectStart: string;
  projectEnd: string;
  /** Read-only for people who can't reschedule. */
  editable?: boolean;
}) {
  const [, start] = useTransition();
  const [spans, setSpans] = useState<Record<string, Span>>(() =>
    Object.fromEntries(
      requests.map((r) => {
        const end = toDay(ymdOf(r.deadline));
        const s = r.startOn ? toDay(r.startOn) : Math.min(end, toDay(ymdOf(r.createdAt)));
        return [r.id, { start: Math.min(s, end), end }];
      }),
    ),
  );
  const drag = useRef<Drag | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  const rows = useMemo(
    () => [...requests].sort((a, b) => (spans[a.id]?.start ?? 0) - (spans[b.id]?.start ?? 0) || a.id.localeCompare(b.id)),
    [requests, spans],
  );
  const all = Object.values(spans);
  const first = Math.min(toDay(projectStart), ...all.map((s) => s.start)) - 2;
  const last = Math.max(toDay(projectEnd), ...all.map((s) => s.end)) + 3;
  const days = Array.from({ length: last - first + 1 }, (_, i) => first + i);
  const today = toDay(new Date().toLocaleDateString("en-CA"));
  const byId = new Map(requests.map((r) => [r.id, r]));
  const userById = (id: string) => users.find((u) => u.id === id);

  const onPointerDown = (e: React.PointerEvent, id: string, mode: Drag["mode"]) => {
    if (!editable) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { id, mode, x: e.clientX, orig: spans[id] };
    setDragging(id);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const delta = Math.round((e.clientX - d.x) / COL);
    const next =
      d.mode === "move"
        ? { start: d.orig.start + delta, end: d.orig.end + delta }
        : d.mode === "start"
          ? { start: Math.min(d.orig.start + delta, d.orig.end), end: d.orig.end }
          : { start: d.orig.start, end: Math.max(d.orig.end + delta, d.orig.start) };
    setSpans((s) => ({ ...s, [d.id]: next }));
  };

  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    setDragging(null);
    if (!d) return;
    const next = spans[d.id];
    if (next.start === d.orig.start && next.end === d.orig.end) return;
    start(async () => {
      try {
        await updateRequestDatesAction(d.id, fromDay(next.start), fromDay(next.end));
        toast.success(`${d.id}: ${fmt(next.start)} → ${fmt(next.end)}`);
      } catch (err) {
        setSpans((s) => ({ ...s, [d.id]: d.orig }));
        toast.error(err instanceof Error ? err.message : "No se pudo reprogramar");
      }
    });
  };

  if (!requests.length) {
    return <p className="p-4 text-sm text-muted-foreground">Sin tareas para mostrar.</p>;
  }

  return (
    <div className="overflow-x-auto" onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
      <div style={{ width: 240 + days.length * COL }} className="relative select-none">
        {/* header */}
        <div className="sticky top-0 z-10 flex border-b border-border bg-card">
          <div className="sticky left-0 z-20 w-60 shrink-0 border-r border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground">
            Tarea
          </div>
          {days.map((d) => {
            const date = new Date(d * DAY);
            const monday = date.getUTCDay() === 1;
            return (
              <div
                key={d}
                style={{ width: COL }}
                className={cn(
                  "shrink-0 border-r border-border/50 py-1 text-center text-[11px] leading-tight text-muted-foreground",
                  [0, 6].includes(date.getUTCDay()) && "bg-muted/40",
                  d === today && "font-semibold text-primary",
                )}
              >
                {monday || d === first ? (
                  <span className="block font-medium text-foreground">
                    {date.toLocaleDateString("es", { month: "short", timeZone: "UTC" })}
                  </span>
                ) : (
                  <span className="block">&nbsp;</span>
                )}
                {date.getUTCDate()}
              </div>
            );
          })}
        </div>

        {/* rows */}
        {rows.map((r) => {
          const span = spans[r.id];
          const left = (span.start - first) * COL;
          const width = (span.end - span.start + 1) * COL;
          const done = DONE.includes(r.state);
          const blockers = (r.dependsOn ?? []).map((id) => byId.get(id)).filter((b) => b && !DONE.includes(b.state));
          const people = peopleOn(r).map(userById).filter(Boolean) as WorkUserRecord[];
          return (
            <div key={r.id} className="relative flex h-11 border-b border-border/60">
              <div className="sticky left-0 z-10 flex w-60 shrink-0 items-center gap-2 border-r border-border bg-card px-3">
                {blockers.length ? (
                  <span title={`Bloqueada por ${blockers.map((b) => b!.id).join(", ")}`}>
                    <Lock className="size-3.5 shrink-0 text-tone-warn" />
                  </span>
                ) : null}
                <Link href={`/work/requests/${r.id}`} className="min-w-0 flex-1 truncate text-sm hover:text-primary">
                  {r.title}
                </Link>
                {people.length ? <PersonStack people={people} max={2} /> : null}
              </div>
              <div className="relative flex-1">
                {days.map((d) => (
                  <div
                    key={d}
                    style={{ left: (d - first) * COL, width: COL }}
                    className={cn("absolute inset-y-0 border-r border-border/30", [0, 6].includes(new Date(d * DAY).getUTCDay()) && "bg-muted/30")}
                  />
                ))}
                {today >= first && today <= last ? (
                  <div style={{ left: (today - first) * COL + COL / 2 }} className="absolute inset-y-0 w-px bg-primary/60" />
                ) : null}
                <div
                  title={`${r.id} · ${WORKFLOW[r.state].label} · ${fmt(span.start)} → ${fmt(span.end)}`}
                  onPointerDown={(e) => onPointerDown(e, r.id, "move")}
                  style={{ left: left + 2, width: Math.max(width - 4, 12) }}
                  className={cn(
                    "absolute top-2 flex h-7 items-center rounded-md px-2 text-xs font-medium shadow-sm",
                    editable && "cursor-grab active:cursor-grabbing",
                    done ? "bg-tone-positive/20 text-tone-positive" : "bg-primary text-primary-foreground",
                    dragging === r.id && "ring-2 ring-primary/40",
                  )}
                >
                  <span
                    onPointerDown={(e) => onPointerDown(e, r.id, "start")}
                    className="absolute inset-y-0 left-0 w-2 cursor-ew-resize rounded-l-md hover:bg-black/10"
                  />
                  <span className="truncate">{WORKFLOW[r.state].label}</span>
                  <span
                    onPointerDown={(e) => onPointerDown(e, r.id, "end")}
                    className="absolute inset-y-0 right-0 w-2 cursor-ew-resize rounded-r-md hover:bg-black/10"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function fmt(day: number) {
  return new Date(day * DAY).toLocaleDateString("es", { day: "numeric", month: "short", timeZone: "UTC" });
}
