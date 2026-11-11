"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, X } from "lucide-react";
import type { WorkUserRecord } from "@/types/work/domain";
import { CRM_STAGES, type CrmRecord, type CrmStage } from "@/lib/work/crm-types";
import { moveCrmRecord, saveCrmRecord } from "@/lib/work/crm";
import { PageHeader } from "@/components/work/shared/page-header";
import { Button } from "@/components/work/ui/button";
import { Input } from "@/components/work/ui/input";
import { Card } from "@/components/work/ui/card";

import { ProspectBoard } from "./prospect-board";
import { toast } from "sonner";

const money = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const closed = (r: CrmRecord) => r.stage === "ganado" || r.stage === "perdido";
const field = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

export function CrmWorkspace({ records, users, canEdit, preview }: { records: CrmRecord[]; users: WorkUserRecord[]; canEdit: boolean; preview: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("todos");
  const [editor, setEditor] = useState<CrmRecord | "new" | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [optimistic, moveOptimistic] = useOptimistic(records, (rows, change: { id: string; stage: CrmStage }) => rows.map(r => r.id === change.id ? { ...r, stage: change.stage } : r));
  const [owner, setOwner] = useState("");
  function move(id: string, stage: CrmStage) {
    if (!canEdit || pending || optimistic.find(r => r.id === id)?.stage === stage) return;
    startTransition(async () => {
      moveOptimistic({ id, stage });
      try {
        const result = await moveCrmRecord(id, stage);
        if (result.error) toast.error(result.error);
        else { toast.success(`Prospecto movido a ${CRM_STAGES[stage]}`); router.refresh(); }
      } catch { toast.error("No se pudo mover el prospecto. Inténtalo de nuevo."); }
    });
  }
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const open = optimistic.filter(r => !closed(r));
  const due = open.filter(r => r.follow_up && r.follow_up <= today);
  const visible = optimistic.filter(r => (!owner || r.owner_id === owner) && (filter === "todos" || (filter === "abiertos" ? !closed(r) : filter === "seguimientos" ? due.some(d => d.id === r.id) : r.stage === filter)) && `${r.company} ${r.contact} ${r.email}`.toLowerCase().includes(query.toLowerCase()));
  const current = editor && editor !== "new" ? editor : null;
  function edit(record: CrmRecord | "new") { setError(""); setEditor(record); }

  return <div className="min-w-0">
    <PageHeader title="Prospectos" description="Arrastra un prospecto a otra columna para cambiar su etapa comercial." actions={canEdit && <Button size="sm" onClick={() => edit("new")}><Plus className="size-4" />Nuevo prospecto</Button>} />
    {preview && <p className="mb-4 text-xs text-muted-foreground">Modo de vista previa: los registros se conservan solo mientras el servidor está encendido.</p>}
    <div className="mb-6 grid gap-3 sm:grid-cols-3">
      {[{ label: "Prospectos abiertos", value: open.length }, { label: "Valor potencial · COP", value: money(open.reduce((n, r) => n + Number(r.value), 0)) }, { label: "Seguimientos para hoy o vencidos", value: due.length }].map(m => <Card key={m.label} className="gap-2 p-5"><p className="text-xs text-muted-foreground">{m.label}</p><p className="text-2xl font-semibold tracking-tight">{m.value}</p></Card>)}
    </div>
    <div className="mb-5 flex flex-wrap gap-3">
      <div className="relative min-w-56 flex-1"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input aria-label="Buscar prospectos" placeholder="Buscar empresa, contacto o correo…" className="pl-9" value={query} onChange={e => setQuery(e.target.value)} /></div>
      <select aria-label="Filtrar prospectos" className={`${field} sm:w-56`} value={filter} onChange={e => setFilter(e.target.value)}><option value="abiertos">Oportunidades abiertas</option><option value="seguimientos">Seguimientos pendientes</option><option value="todos">Todos, incluidos ganados y desiertos</option>{Object.entries(CRM_STAGES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
      <select aria-label="Filtrar por responsable" className={`${field} sm:w-52`} value={owner} onChange={e => setOwner(e.target.value)}><option value="">Responsable: Todos</option>{users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
    </div>
    <p className="mb-3 text-xs text-muted-foreground" role="status">{pending ? "Guardando cambios…" : `${visible.length} prospectos · También puedes cambiar la etapa desde cada tarjeta.`}</p>
    <ProspectBoard records={visible} users={users} canEdit={canEdit} pending={pending} today={today} onMove={move} onEdit={edit} />
    {editor && <Card ref={node => { if (node) node.scrollIntoView({ behavior: "smooth", block: "start" }); }} className="mt-6 gap-5 p-6" key={current?.id ?? "new"}>
      <div className="flex items-center justify-between"><div><h2 className="font-semibold">{current ? current.company : "Nuevo prospecto"}</h2><p className="text-xs text-muted-foreground">Datos de contacto y seguimiento comercial.</p></div><Button disabled={pending} variant="ghost" size="icon" aria-label="Cerrar formulario" onClick={() => setEditor(null)}><X className="size-4" /></Button></div>
      <form onSubmit={e => { e.preventDefault(); const form = new FormData(e.currentTarget); startTransition(async () => { const result = await saveCrmRecord(form); if (result.error) setError(result.error); else { setEditor(null); router.refresh(); } }); }}>
        <input type="hidden" name="id" value={current?.id ?? ""} />
        <fieldset disabled={!canEdit || pending} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-1 text-xs">Empresa *<Input name="company" required maxLength={200} defaultValue={current?.company} /></label>
          <label className="space-y-1 text-xs">Nombre del contacto<Input name="contact" maxLength={200} defaultValue={current?.contact} /></label>
          <label className="space-y-1 text-xs">Correo<Input name="email" type="email" defaultValue={current?.email} /></label>
          <label className="space-y-1 text-xs">Teléfono<Input name="phone" type="tel" defaultValue={current?.phone} /></label>
          <label className="space-y-1 text-xs">Etapa<select className={field} name="stage" defaultValue={current?.stage ?? "nuevo"}>{Object.entries(CRM_STAGES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label className="space-y-1 text-xs">Responsable<select className={field} name="owner_id" defaultValue={current?.owner_id ?? ""}><option value="">Por asignar</option>{users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
          <label className="space-y-1 text-xs">Valor estimado · COP<Input name="value" type="number" min="0" max="1000000000000000" step="0.01" defaultValue={current?.value ?? 0} /></label>
          <label className="space-y-1 text-xs">Próximo contacto<Input name="follow_up" type="date" defaultValue={current?.follow_up ?? ""} /></label>
          <label className="space-y-1 text-xs sm:col-span-2 lg:col-span-3">Notas y conversaciones<textarea name="notes" maxLength={10000} rows={4} className="w-full rounded-md border bg-background p-3 text-sm" defaultValue={current?.notes} placeholder="Qué necesita, qué conversaron y cuál es el siguiente paso…" /></label>
        </fieldset>
        {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
        {canEdit && <div className="mt-4 flex items-center gap-3"><Button disabled={pending} type="submit">{pending ? "Guardando…" : "Guardar prospecto"}</Button><p className="text-xs text-muted-foreground">Los procesos desiertos salen de las oportunidades abiertas y pueden retomarse moviéndolos a una etapa activa.</p></div>}
      </form>
    </Card>}
  </div>;
}
