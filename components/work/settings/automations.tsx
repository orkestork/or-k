"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";
import type { Automation, Priority, Project, RoleSlug, WorkflowState, WorkUserRecord } from "@/types/work/domain";
import { deleteAutomationAction, saveAutomationAction, setAutomationActiveAction } from "@/lib/work/actions";
import { WORKFLOW, WORKFLOW_ORDER } from "@/lib/work/workflow";
import { Button } from "@/components/work/ui/button";
import { Label } from "@/components/work/ui/label";
import { nativeSelectClass } from "@/components/work/forms/fields";
import { ROLE_LABEL } from "./roles";
import { RoleOptions } from "./role-options";

const ACTION_LABEL: Record<Automation["action"], string> = {
  notify_role: "Avisar a todo un rol",
  notify_user: "Avisar a una persona",
  assign_user: "Asignar a una persona",
  set_priority: "Cambiar la prioridad",
};
const PRIORITY_LABEL: Record<Priority, string> = { low: "Baja", medium: "Media", high: "Alta", urgent: "Urgente" };

export function Automations({
  automations,
  projects,
  users,
}: {
  automations: Automation[];
  projects: Project[];
  users: WorkUserRecord[];
}) {
  const staff = users.filter((u) => u.active && u.role !== "client");
  const [pending, start] = useTransition();
  const [toState, setToState] = useState<WorkflowState>("approved");
  const [projectId, setProjectId] = useState("");
  const [action, setAction] = useState<Automation["action"]>("notify_role");
  const [role, setRole] = useState<RoleSlug>("community_manager");
  const [userId, setUserId] = useState(staff[0]?.id ?? "");
  const [priority, setPriority] = useState<Priority>("high");

  const run = (fn: () => Promise<void>, ok?: string) =>
    start(async () => {
      try {
        await fn();
        if (ok) toast.success(ok);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo guardar");
      }
    });

  const describe = (a: Automation) => {
    const target =
      a.action === "notify_role"
        ? `avisar a ${a.role ? ROLE_LABEL[a.role] : "—"}`
        : a.action === "set_priority"
          ? `poner prioridad ${a.priority ? PRIORITY_LABEL[a.priority] : "—"}`
          : `${a.action === "assign_user" ? "asignar a" : "avisar a"} ${users.find((u) => u.id === a.userId)?.name ?? "—"}`;
    const scope = a.projectId ? ` en ${projects.find((p) => p.id === a.projectId)?.name ?? "un proyecto"}` : "";
    return (
      <>
        Cuando una solicitud{scope} pase a <strong>{WORKFLOW[a.toState].label}</strong> → {target}
      </>
    );
  };

  return (
    <div className="flex flex-col gap-4 text-sm">
      {automations.length ? (
        <ul className="flex flex-col divide-y divide-border">
          {automations.map((a) => (
            <li key={a.id} className="flex items-center gap-3 py-2.5">
              <Zap className={a.active ? "size-4 text-primary" : "size-4 text-muted-foreground"} />
              <span className={a.active ? "flex-1" : "flex-1 text-muted-foreground"}>{describe(a)}</span>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={a.active}
                  disabled={pending}
                  onChange={(e) => run(() => setAutomationActiveAction(a.id, e.target.checked))}
                />
                Activa
              </label>
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                aria-label="Eliminar automatización"
                disabled={pending}
                onClick={() => run(() => deleteAutomationAction(a.id), "Automatización eliminada")}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">
          Reglas que trabajan solas, por ejemplo: «cuando una pieza pase a Aprobado → avisar a Community manager».
        </p>
      )}

      <div className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="auto-state">Cuando una solicitud pase a</Label>
          <select id="auto-state" className={nativeSelectClass} value={toState} onChange={(e) => setToState(e.target.value as WorkflowState)}>
            {WORKFLOW_ORDER.map((s) => (
              <option key={s} value={s}>
                {WORKFLOW[s].label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="auto-project">En</Label>
          <select id="auto-project" className={nativeSelectClass} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">Todos los proyectos</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="auto-action">Entonces</Label>
          <select id="auto-action" className={nativeSelectClass} value={action} onChange={(e) => setAction(e.target.value as Automation["action"])}>
            {Object.entries(ACTION_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="auto-target">{action === "notify_role" ? "Rol" : action === "set_priority" ? "Prioridad" : "Persona"}</Label>
          {action === "notify_role" ? (
            <select id="auto-target" className={nativeSelectClass} value={role} onChange={(e) => setRole(e.target.value as RoleSlug)}>
              <RoleOptions />
            </select>
          ) : action === "set_priority" ? (
            <select id="auto-target" className={nativeSelectClass} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          ) : (
            <select id="auto-target" className={nativeSelectClass} value={userId} onChange={(e) => setUserId(e.target.value)}>
              {staff.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <Button
          size="sm"
          className="justify-self-start sm:col-span-2"
          disabled={pending}
          onClick={() =>
            run(
              () =>
                saveAutomationAction({
                  name: "",
                  toState,
                  projectId: projectId || null,
                  action,
                  role,
                  userId: userId || null,
                  priority,
                }),
              "Automatización creada",
            )
          }
        >
          <Plus className="size-4" /> Agregar automatización
        </Button>
      </div>
    </div>
  );
}
