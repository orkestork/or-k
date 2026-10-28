"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CalendarEvent, Client } from "@/types/work/domain";
import { cn } from "@/lib/work/utils";
import { Button } from "@/components/work/ui/button";

const KIND_META: Record<
  CalendarEvent["kind"],
  { label: string; dot: string; chip: string }
> = {
  deadline: { label: "Deadline", dot: "bg-tone-warn", chip: "border-l-tone-warn" },
  delivery: { label: "Entrega", dot: "bg-tone-info", chip: "border-l-tone-info" },
  publish: { label: "Publicación", dot: "bg-tone-positive", chip: "border-l-tone-positive" },
  meeting: { label: "Reunión", dot: "bg-tone-progress", chip: "border-l-tone-progress" },
  campaign: { label: "Campaña", dot: "bg-primary", chip: "border-l-primary" },
};

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
/** Monday = 0 … Sunday = 6 */
function mondayIndex(d: Date) {
  return (d.getDay() + 6) % 7;
}

export function MonthCalendar({
  events,
  clients,
}: {
  events: CalendarEvent[];
  clients: Client[];
}) {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => startOfMonth(today));

  const clientById = (id: string) => clients.find((c) => c.id === id);

  const grid = useMemo(() => {
    const first = startOfMonth(cursor);
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - mondayIndex(first));
    return Array.from({ length: 42 }, (_, i) => {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + i);
      return day;
    });
  }, [cursor]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const key = new Date(e.date).toDateString();
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return map;
  }, [events]);

  const rawMonth = cursor.toLocaleDateString("es", {
    month: "long",
    year: "numeric",
  });
  const monthLabel = rawMonth.charAt(0).toUpperCase() + rawMonth.slice(1);

  const move = (delta: number) =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => move(-1)} aria-label="Mes anterior">
          <ChevronLeft className="size-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => move(1)} aria-label="Mes siguiente">
          <ChevronRight className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCursor(startOfMonth(today))}
        >
          Hoy
        </Button>
        <span className="ml-1 text-sm font-medium">{monthLabel}</span>

        <div className="ml-auto hidden flex-wrap items-center gap-3 text-xs text-muted-foreground sm:flex">
          {Object.values(KIND_META).map((k) => (
            <span key={k.label} className="flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full", k.dot)} />
              {k.label}
            </span>
          ))}
        </div>
      </div>

      {/* Grid (desktop) */}
      <div className="hidden overflow-hidden rounded-lg border border-border md:block">
        <div className="grid grid-cols-7 border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-2 py-1.5">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {grid.map((day, i) => {
            const inMonth = day.getMonth() === cursor.getMonth();
            const isToday = sameDay(day, today);
            const dayEvents = eventsByDay.get(day.toDateString()) ?? [];
            const shown = dayEvents.slice(0, 3);
            const extra = dayEvents.length - shown.length;
            return (
              <div
                key={i}
                className={cn(
                  "min-h-[104px] border-b border-r border-border p-1.5",
                  i % 7 === 6 && "border-r-0",
                  i >= 35 && "border-b-0",
                  !inMonth && "bg-muted/20",
                )}
              >
                <div className="mb-1 flex justify-end">
                  <span
                    className={cn(
                      "grid size-5 place-items-center rounded-full text-xs",
                      isToday
                        ? "bg-primary font-semibold text-primary-foreground"
                        : inMonth
                          ? "text-muted-foreground"
                          : "text-muted-foreground/40",
                    )}
                  >
                    {day.getDate()}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  {shown.map((e) => {
                    const client = clientById(e.clientId);
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() =>
                          e.requestId && router.push(`/work/requests/${e.requestId}`)
                        }
                        className={cn(
                          "flex w-full items-center gap-1 truncate rounded-sm border-l-2 bg-card px-1.5 py-0.5 text-left text-xs transition-colors hover:bg-muted",
                          KIND_META[e.kind].chip,
                        )}
                        title={`${e.title} — ${KIND_META[e.kind].label}`}
                      >
                        <span
                          className="size-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: client?.accentColor }}
                        />
                        <span className="truncate">{e.title}</span>
                      </button>
                    );
                  })}
                  {extra > 0 ? (
                    <span className="px-1.5 text-xs text-muted-foreground">
                      +{extra} más
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Agenda (mobile) */}
      <div className="flex flex-col gap-4 md:hidden">
        {[...eventsByDay.entries()]
          .filter(([key]) => {
            const d = new Date(key);
            return d.getMonth() === cursor.getMonth();
          })
          .sort(([a], [b]) => +new Date(a) - +new Date(b))
          .map(([key, list]) => (
            <div key={key}>
              <p className="mb-1.5 text-sm font-medium first-letter:uppercase">
                {new Date(key).toLocaleDateString("es", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
              <ul className="flex flex-col gap-1.5">
                {list.map((e) => {
                  const client = clientById(e.clientId);
                  return (
                    <li
                      key={e.id}
                      className={cn(
                        "flex items-center gap-2 rounded-md border border-l-2 border-border px-3 py-2 text-sm",
                        KIND_META[e.kind].chip,
                      )}
                      onClick={() =>
                        e.requestId && router.push(`/work/requests/${e.requestId}`)
                      }
                    >
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: client?.accentColor }}
                      />
                      <span className="flex-1 truncate">{e.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {KIND_META[e.kind].label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
      </div>
    </div>
  );
}
