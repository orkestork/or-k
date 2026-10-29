"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import type { Request, WorkflowState } from "@/types/work/domain";
import { updateRequestScheduleAction } from "@/lib/work/actions";
import { WORKFLOW, WORKFLOW_ORDER } from "@/lib/work/workflow";
import { clientStatus } from "@/components/work/portal/client-status";
import { cn } from "@/lib/work/utils";
import { Button } from "@/components/work/ui/button";
import { Input } from "@/components/work/ui/input";
import { Label } from "@/components/work/ui/label";
import { Textarea } from "@/components/work/ui/textarea";
import { nativeSelectClass } from "@/components/work/forms/fields";

const ymd = (iso: string) => new Date(iso).toLocaleDateString("en-CA");
const startOf = (r: Request) => r.startOn ?? ymd(r.createdAt);

/** Edits what the client portal shows per phase: title, dates, deliverables and stage. */
export function ScheduleEditor({ projectId, requests }: { projectId: string; requests: Request[] }) {
  const sorted = [...requests]
    .filter((r) => r.state !== "archived")
    .sort((a, b) => startOf(a).localeCompare(startOf(b)) || a.id.localeCompare(b.id));
  if (!sorted.length) return <p className="p-4 text-sm text-muted-foreground">Sin fases todavía.</p>;
  return (
    <ul className="flex flex-col divide-y divide-border">
      {sorted.map((r) => (
        <PhaseRow key={r.id} projectId={projectId} request={r} />
      ))}
    </ul>
  );
}

function PhaseRow({ projectId, request }: { projectId: string; request: Request }) {
  const initial = {
    title: request.title,
    startOn: startOf(request),
    deadline: ymd(request.deadline),
    deliverables: request.deliverables.join("\n"),
    state: request.state,
  };
  const [form, setForm] = useState(initial);
  const [pending, start] = useTransition();
  const dirty = (Object.keys(initial) as (keyof typeof initial)[]).some((k) => form[k] !== initial[k]);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const status = clientStatus(form.state);
  const f = (name: string) => `${request.id}-${name}`;

  const save = () =>
    start(async () => {
      try {
        await updateRequestScheduleAction(projectId, request.id, { ...form, deliverables: form.deliverables.split("\n") });
        toast.success("Cronograma actualizado");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo guardar");
      }
    });

  return (
    <li className="grid gap-3 p-4 md:grid-cols-[1fr_19rem]">
      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor={f("title")} className="text-xs text-muted-foreground">
            Título
          </Label>
          <Input id={f("title")} value={form.title} onChange={(e) => set("title", e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={f("deliverables")} className="text-xs text-muted-foreground">
            Entregables · uno por línea
          </Label>
          <Textarea
            id={f("deliverables")}
            rows={4}
            value={form.deliverables}
            onChange={(e) => set("deliverables", e.target.value)}
          />
        </div>
      </div>
      <div className="grid content-start gap-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1.5">
            <Label htmlFor={f("start")} className="text-xs text-muted-foreground">
              Inicio
            </Label>
            <Input id={f("start")} type="date" value={form.startOn} onChange={(e) => set("startOn", e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={f("end")} className="text-xs text-muted-foreground">
              Entrega
            </Label>
            <Input id={f("end")} type="date" value={form.deadline} onChange={(e) => set("deadline", e.target.value)} />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={f("state")} className="text-xs text-muted-foreground">
            Estado
          </Label>
          <select
            id={f("state")}
            className={nativeSelectClass}
            value={form.state}
            onChange={(e) => set("state", e.target.value as WorkflowState)}
          >
            {WORKFLOW_ORDER.map((s) => (
              <option key={s} value={s}>
                {WORKFLOW[s].label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            El cliente ve: <span className={cn("rounded-full px-2 py-0.5", status.className)}>{status.label}</span>
          </p>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Link
            href={`/work/requests/${request.id}`}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="size-3" /> {request.id}
          </Link>
          <div className="flex gap-1">
            {dirty ? (
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => setForm(initial)}>
                Descartar
              </Button>
            ) : null}
            <Button size="sm" disabled={!dirty || pending} onClick={save}>
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>
      </div>
    </li>
  );
}
