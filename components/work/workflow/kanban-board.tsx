"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { Client, Request, WorkUserRecord, WorkflowState } from "@/types/work/domain";
import { BOARD_COLUMNS, WORKFLOW } from "@/lib/work/workflow";
import { setRequestStateAction } from "@/lib/work/actions";
import { cn } from "@/lib/work/utils";
import { PriorityBadge, DeadlinePill } from "@/components/work/shared/badges";
import { PersonAvatar, PersonStack } from "@/components/work/shared/people";
import { ClientMark } from "@/components/work/shared/page-header";
import { peopleOn } from "@/lib/work/people";
import { ListChecks, Lock } from "lucide-react";

export function KanbanBoard({
  requests,
  clients,
  users,
}: {
  requests: Request[];
  clients: Client[];
  users: WorkUserRecord[];
}) {
  const [optimistic, moveOptimistic] = useOptimistic(
    requests,
    (state, { id, to }: { id: string; to: WorkflowState }) =>
      state.map((r) => (r.id === id ? { ...r, state: to } : r)),
  );
  const [, start] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  const clientById = (id: string) => clients.find((c) => c.id === id);
  const userById = (id: string | null) =>
    id ? users.find((u) => u.id === id) : undefined;

  const drop = (columnId: string, targetState: WorkflowState) => {
    setOverCol(null);
    const id = dragId;
    setDragId(null);
    if (!id) return;
    const req = optimistic.find((r) => r.id === id);
    if (!req || req.state === targetState) return;
    start(async () => {
      moveOptimistic({ id, to: targetState });
      try {
        await setRequestStateAction(id, targetState);
        toast.success(`${id} → ${WORKFLOW[targetState].label}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo mover");
      }
    });
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {BOARD_COLUMNS.map((col) => {
        const items = optimistic
          .filter((r) => col.states.includes(r.state))
          .sort((a, b) => +new Date(a.deadline) - +new Date(b.deadline));
        const targetState = col.states[col.states.length - 1];
        return (
          <div
            key={col.id}
            onDragOver={(e) => {
              e.preventDefault();
              setOverCol(col.id);
            }}
            onDragLeave={() => setOverCol((c) => (c === col.id ? null : c))}
            onDrop={() => drop(col.id, targetState)}
            className={cn(
              "flex w-72 shrink-0 flex-col rounded-lg border border-border bg-card/40 transition-colors",
              overCol === col.id && "border-primary/50 bg-primary/5",
            )}
          >
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <span className="text-sm font-medium">{col.label}</span>
              <span className="ml-auto font-mono text-xs text-muted-foreground">
                {items.length}
              </span>
            </div>
            <div className="flex flex-col gap-2 p-2">
              {items.map((r) => {
                const client = clientById(r.clientId);
                const people = peopleOn(r).map((id) => userById(id)).filter(Boolean) as WorkUserRecord[];
                const subtasks = r.subtasks ?? [];
                const blocked = (r.dependsOn ?? []).some((d) => {
                  const dep = optimistic.find((x) => x.id === d);
                  return dep && !["approved", "scheduled", "published", "completed"].includes(dep.state);
                });
                return (
                  <Link
                    key={r.id}
                    href={`/work/requests/${r.id}`}
                    draggable
                    onDragStart={() => setDragId(r.id)}
                    onDragEnd={() => setDragId(null)}
                    className={cn(
                      "block rounded-md border border-border bg-card p-2.5 transition-shadow hover:shadow-md",
                      dragId === r.id && "opacity-40",
                    )}
                  >
                    <div className="mb-1.5 flex items-center gap-1.5">
                      {client ? (
                        <ClientMark
                          name={client.name}
                          logoText={client.logoText}
                          color={client.accentColor}
                          size={18}
                        />
                      ) : null}
                      <span className="font-mono text-xs text-muted-foreground">
                        {r.id}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {WORKFLOW[r.state].label}
                      </span>
                    </div>
                    <p className="flex items-start gap-1.5 text-sm leading-snug">
                      {blocked ? (
                        <span title="Bloqueada: depende de otra tarea sin aprobar">
                          <Lock className="mt-0.5 size-3.5 shrink-0 text-tone-warn" />
                        </span>
                      ) : null}
                      {r.title}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <PriorityBadge priority={r.priority} />
                      <DeadlinePill iso={r.deadline} />
                      {subtasks.length ? (
                        <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
                          <ListChecks className="size-3" />
                          {subtasks.filter((s) => s.done).length}/{subtasks.length}
                        </span>
                      ) : null}
                      {people.length ? (
                        <div className="ml-auto">
                          <PersonStack people={people} max={3} />
                        </div>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
              {items.length === 0 ? (
                <p className="px-1 py-4 text-center text-xs text-muted-foreground">
                  Vacío
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
