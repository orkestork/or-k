"use client";

import { useState } from "react";
import { Building2, CalendarClock, GripVertical } from "lucide-react";
import { CRM_STAGES, type CrmRecord, type CrmStage } from "@/lib/work/crm-types";
import type { WorkUserRecord } from "@/types/work/domain";
import { Button } from "@/components/work/ui/button";
import { cn } from "@/lib/work/utils";

const colors: Record<CrmStage, string> = { nuevo: "bg-sky-400", contactado: "bg-violet-400", propuesta: "bg-amber-400", negociacion: "bg-primary", ganado: "bg-emerald-400", perdido: "bg-zinc-400" };
const money = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

export function ProspectBoard({ records, users, canEdit, pending, today, onMove, onEdit }: {
  records: CrmRecord[]; users: WorkUserRecord[]; canEdit: boolean; pending: boolean; today: string;
  onMove: (id: string, stage: CrmStage) => void; onEdit: (record: CrmRecord) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<CrmStage | null>(null);
  return <div aria-label="Tablero comercial de prospectos" className="flex h-[calc(100dvh-23rem)] min-h-96 gap-3 overflow-x-auto pb-3">
    {(Object.entries(CRM_STAGES) as [CrmStage, string][]).map(([stage, label]) => {
      const items = records.filter(r => r.stage === stage).sort((a, b) => (a.follow_up ?? "9999").localeCompare(b.follow_up ?? "9999"));
      return <section key={stage} aria-label={`Etapa ${label}`} onDragOver={e => { if (canEdit && !pending && dragId) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setOver(stage); } }} onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null); }} onDrop={e => { e.preventDefault(); if (canEdit && !pending && dragId) onMove(dragId, stage); setDragId(null); setOver(null); }} className={cn("flex min-h-0 w-72 shrink-0 flex-col rounded-lg border bg-card/40 transition-colors", over === stage && "border-primary bg-primary/5")}>
        <header className="border-b px-3 py-3"><div className="flex items-center gap-2"><span className={cn("size-2 rounded-full", colors[stage])} /><h2 className="text-sm font-medium">{label}</h2><span className="ml-auto text-xs text-muted-foreground">{items.length}</span></div><p className="mt-1 pl-4 text-xs text-muted-foreground">{money(items.reduce((sum, r) => sum + Number(r.value), 0))}</p>{stage === "perdido" && <p className="mt-2 text-xs text-muted-foreground">El proceso no continuó. Puede retomarse como oportunidad futura.</p>}</header>
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
          {items.map(r => <article key={r.id} aria-label={`Prospecto ${r.company}`} draggable={canEdit && !pending} onDragStart={e => { setDragId(r.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", r.id); }} onDragEnd={() => { setDragId(null); setOver(null); }} className={cn("rounded-md border bg-card p-3 shadow-sm", canEdit && !pending && "cursor-grab active:cursor-grabbing", dragId === r.id && "opacity-40")}>
            <div className="flex items-start gap-2"><Building2 className="mt-0.5 size-4 shrink-0 text-primary" /><button type="button" onClick={() => onEdit(r)} className="min-w-0 flex-1 text-left text-sm font-medium hover:text-primary">{r.company}</button>{canEdit && <GripVertical aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />}</div>
            <p className="mt-1 truncate text-xs text-muted-foreground">{r.contact || "Sin contacto registrado"}</p>
            <p className="mt-3 text-sm font-semibold">{money(Number(r.value))}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">{users.find(u => u.id === r.owner_id)?.name || "Por asignar"}</p>
            <p className={cn("mt-3 flex items-center gap-1.5 text-xs", r.follow_up && r.follow_up <= today && !["ganado", "perdido"].includes(r.stage) ? "text-amber-400" : "text-muted-foreground")}><CalendarClock className="size-3.5" />{r.follow_up ? `Contacto: ${r.follow_up}` : "Sin seguimiento"}</p>
            <div className="mt-3 flex items-center gap-2 border-t pt-2">{canEdit && <select aria-label={`Mover ${r.company} a etapa`} disabled={pending} value={r.stage} onChange={e => onMove(r.id, e.target.value as CrmStage)} className="min-w-0 flex-1 rounded border bg-background p-1 text-xs">{Object.entries(CRM_STAGES).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select>}<Button size="sm" variant="ghost" disabled={pending} onClick={() => onEdit(r)}>Gestionar</Button></div>
          </article>)}
          {!items.length && <p className="px-2 py-8 text-center text-xs text-muted-foreground">{over === stage ? "Suelta aquí" : "Sin prospectos"}</p>}
        </div>
      </section>;
    })}
  </div>;
}
