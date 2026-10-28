"use client";

import { useState, useTransition } from "react";
import { Pause, Play, Plus, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Recurrence, WorkUserRecord } from "@/types/work/domain";
import { deleteRecurrenceAction, saveRecurrenceAction } from "@/lib/work/actions";
import { Button } from "@/components/work/ui/button";
import { Input } from "@/components/work/ui/input";
import { Label } from "@/components/work/ui/label";
import { nativeSelectClass } from "@/components/work/forms/fields";

const FREQ: Record<Recurrence["frequency"], string> = {
  weekly: "Cada semana",
  biweekly: "Cada 2 semanas",
  monthly: "Cada mes",
};

export function Recurrences({
  projectId,
  recurrences,
  users,
}: {
  projectId: string;
  recurrences: Recurrence[];
  users: WorkUserRecord[];
}) {
  const staff = users.filter((u) => u.active && u.role !== "client");
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [frequency, setFrequency] = useState<Recurrence["frequency"]>("monthly");
  const [nextRun, setNextRun] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [leadDays, setLeadDays] = useState(4);
  const [assigneeId, setAssigneeId] = useState("");

  const run = (fn: () => Promise<void>, ok?: string) =>
    start(async () => {
      try {
        await fn();
        if (ok) toast.success(ok);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo guardar");
      }
    });

  const base = (r: Recurrence): Omit<Recurrence, "id"> => ({ ...r });

  return (
    <div className="flex flex-col gap-3 text-sm">
      {recurrences.length ? (
        <ul className="flex flex-col divide-y divide-border">
          {recurrences.map((r) => {
            const who = users.find((u) => u.id === r.assigneeId);
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-2 py-2">
                <Repeat className="size-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className={r.active ? "" : "text-muted-foreground line-through"}>{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {FREQ[r.frequency]} · próxima {new Date(`${r.nextRun}T12:00:00`).toLocaleDateString("es", { day: "numeric", month: "short" })}
                    {who ? ` · ${who.name.split(" ")[0]}` : ""} · entrega a {r.leadDays} día(s)
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  disabled={pending}
                  aria-label={r.active ? "Pausar" : "Reanudar"}
                  onClick={() => run(() => saveRecurrenceAction(r.id, { ...base(r), active: !r.active }), r.active ? "Pausada" : "Reanudada")}
                >
                  {r.active ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  disabled={pending}
                  aria-label="Eliminar"
                  onClick={() => run(() => deleteRecurrenceAction(projectId, r.id), "Eliminada")}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-muted-foreground">
          Tareas que se crean solas cada cierto tiempo: parrilla mensual, reporte de resultados, mantenimiento…
        </p>
      )}

      {adding ? (
        <form
          className="grid gap-3 rounded-md border border-border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await saveRecurrenceAction(null, {
                projectId,
                title,
                objective: "",
                deliverables: [],
                priority: "medium",
                assigneeId: assigneeId || null,
                collaboratorIds: [],
                frequency,
                leadDays,
                nextRun,
                active: true,
              });
              setAdding(false);
              setTitle("");
            }, "Tarea recurrente creada");
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="rec-title">Tarea</Label>
            <Input id="rec-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Parrilla de contenido" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="rec-freq">Frecuencia</Label>
              <select id="rec-freq" className={nativeSelectClass} value={frequency} onChange={(e) => setFrequency(e.target.value as Recurrence["frequency"])}>
                {Object.entries(FREQ).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="rec-next">Primera vez</Label>
              <Input id="rec-next" type="date" value={nextRun} onChange={(e) => setNextRun(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="rec-owner">Responsable</Label>
              <select id="rec-owner" className={nativeSelectClass} value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                <option value="">Sin asignar</option>
                {staff.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="rec-lead">Días para entregar</Label>
              <Input id="rec-lead" type="number" min={0} max={60} value={leadDays} onChange={(e) => setLeadDays(Number(e.target.value))} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={pending || !title.trim()}>
              Crear
            </Button>
          </div>
        </form>
      ) : (
        <Button size="sm" variant="outline" className="self-start" onClick={() => setAdding(true)}>
          <Plus className="size-4" /> Tarea recurrente
        </Button>
      )}
    </div>
  );
}
