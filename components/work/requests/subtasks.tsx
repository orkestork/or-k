"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { RequestSubtask, WorkUserRecord } from "@/types/work/domain";
import { addSubtaskAction, deleteSubtaskAction, updateSubtaskAction } from "@/lib/work/actions";
import { cn } from "@/lib/work/utils";
import { Button } from "@/components/work/ui/button";
import { Input } from "@/components/work/ui/input";
import { Progress } from "@/components/work/ui/progress";

const smallSelect =
  "h-8 w-36 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50 dark:bg-input/30";

export function Subtasks({
  requestId,
  subtasks,
  users,
}: {
  requestId: string;
  subtasks: RequestSubtask[];
  users: WorkUserRecord[];
}) {
  const staff = users.filter((u) => u.active && u.role !== "client");
  const [pending, start] = useTransition();
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueOn, setDueOn] = useState("");
  const done = subtasks.filter((s) => s.done).length;

  const run = (fn: () => Promise<void>, ok?: string) =>
    start(async () => {
      try {
        await fn();
        if (ok) toast.success(ok);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo guardar");
      }
    });

  const add = () =>
    run(async () => {
      await addSubtaskAction(requestId, { title, assigneeId: assigneeId || null, dueOn: dueOn || null });
      setTitle("");
      setDueOn("");
    }, "Subtarea agregada");

  return (
    <div className="flex flex-col gap-3">
      {subtasks.length ? (
        <>
          <Progress value={(done / subtasks.length) * 100} />
          <ul className="flex flex-col divide-y divide-border">
            {subtasks.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-2 py-2">
                <input
                  type="checkbox"
                  checked={s.done}
                  disabled={pending}
                  aria-label={`Marcar "${s.title}" como hecha`}
                  onChange={(e) => run(() => updateSubtaskAction(requestId, s.id, { done: e.target.checked }))}
                />
                <span className={cn("min-w-0 flex-1 text-sm", s.done && "text-muted-foreground line-through")}>
                  {s.title}
                </span>
                <select
                  aria-label={`Responsable de "${s.title}"`}
                  className={smallSelect}
                  defaultValue={s.assigneeId ?? ""}
                  disabled={pending}
                  onChange={(e) =>
                    run(() => updateSubtaskAction(requestId, s.id, { assigneeId: e.target.value || null }), "Responsable asignado")
                  }
                >
                  <option value="">Sin asignar</option>
                  {staff.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                <Input
                  type="date"
                  aria-label={`Fecha de "${s.title}"`}
                  className="h-8 w-36 text-xs"
                  defaultValue={s.dueOn ?? ""}
                  disabled={pending}
                  onChange={(e) => run(() => updateSubtaskAction(requestId, s.id, { dueOn: e.target.value || null }))}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  disabled={pending}
                  aria-label={`Eliminar "${s.title}"`}
                  onClick={() => run(() => deleteSubtaskAction(requestId, s.id))}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Divide la tarea en pasos y asigna cada uno a una persona.</p>
      )}

      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (title.trim()) add();
        }}
      >
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nueva subtarea"
          className="h-8 min-w-48 flex-1 text-sm"
        />
        <select
          aria-label="Responsable de la nueva subtarea"
          className={smallSelect}
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
        >
          <option value="">Responsable</option>
          {staff.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <Input
          type="date"
          aria-label="Fecha de la nueva subtarea"
          className="h-8 w-36 text-xs"
          value={dueOn}
          onChange={(e) => setDueOn(e.target.value)}
        />
        <Button type="submit" size="sm" disabled={pending || !title.trim()}>
          <Plus className="size-4" /> Agregar
        </Button>
      </form>
    </div>
  );
}
