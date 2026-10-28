"use client";

import { useState, useTransition } from "react";
import { Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { TimeEntry, WorkUserRecord } from "@/types/work/domain";
import { addTimeEntryAction, deleteTimeEntryAction } from "@/lib/work/actions";
import { formatHours, parseHours } from "@/lib/work/hours";
import { Button } from "@/components/work/ui/button";
import { Input } from "@/components/work/ui/input";
import { PersonAvatar } from "@/components/work/shared/people";

export function TimeTracker({
  requestId,
  entries,
  users,
  meId,
  isAdmin,
}: {
  requestId: string;
  entries: TimeEntry[];
  users: WorkUserRecord[];
  meId: string;
  isAdmin: boolean;
}) {
  const [pending, start] = useTransition();
  const [hours, setHours] = useState("");
  const [workedOn, setWorkedOn] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [note, setNote] = useState("");
  const [showAll, setShowAll] = useState(false);
  const total = entries.reduce((a, e) => a + e.minutes, 0);
  const mine = entries.filter((e) => e.userId === meId).reduce((a, e) => a + e.minutes, 0);
  const userById = (id: string) => users.find((u) => u.id === id);
  const shown = showAll ? entries : entries.slice(0, 4);

  const add = () => {
    const minutes = parseHours(hours);
    if (!minutes) {
      toast.error("Escribe las horas, por ejemplo 1.5 o 1:30");
      return;
    }
    start(async () => {
      try {
        await addTimeEntryAction({ requestId, minutes, workedOn, note });
        setHours("");
        setNote("");
        toast.success(`${formatHours(minutes)} registradas`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo registrar");
      }
    });
  };

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex items-baseline justify-between">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="size-4" /> Horas
        </span>
        <span className="font-mono">
          {formatHours(total)}
          {mine && mine !== total ? <span className="text-xs text-muted-foreground"> · tuyas {formatHours(mine)}</span> : null}
        </span>
      </div>

      <form
        className="grid grid-cols-[4.5rem_1fr] gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <Input value={hours} onChange={(e) => setHours(e.target.value)} placeholder="1.5" aria-label="Horas trabajadas" />
        <Input type="date" value={workedOn} onChange={(e) => setWorkedOn(e.target.value)} aria-label="Fecha" />
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Qué hiciste (opcional)"
          className="col-span-2"
          aria-label="Nota"
        />
        <Button type="submit" size="sm" variant="outline" className="col-span-2" disabled={pending || !hours.trim()}>
          Registrar horas
        </Button>
      </form>

      {entries.length ? (
        <ul className="flex flex-col gap-1.5">
          {shown.map((e) => {
            const who = userById(e.userId);
            return (
              <li key={e.id} className="flex items-center gap-2">
                {who ? <PersonAvatar person={who} size="xs" /> : null}
                <span className="font-mono text-xs">{formatHours(e.minutes)}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground" title={e.note}>
                  {new Date(`${e.workedOn}T12:00:00`).toLocaleDateString("es", { day: "numeric", month: "short" })}
                  {e.note ? ` · ${e.note}` : ""}
                </span>
                {e.userId === meId || isAdmin ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-6"
                    aria-label="Eliminar registro"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        try {
                          await deleteTimeEntryAction(requestId, e.id);
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "No se pudo eliminar");
                        }
                      })
                    }
                  >
                    <Trash2 className="size-3" />
                  </Button>
                ) : null}
              </li>
            );
          })}
          {entries.length > 4 ? (
            <button type="button" className="self-start text-xs text-primary hover:underline" onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Ver menos" : `Ver los ${entries.length} registros`}
            </button>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
