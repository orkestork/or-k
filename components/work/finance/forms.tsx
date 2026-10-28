"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Client, Project } from "@/types/work/domain";
import type { FinIncome } from "@/lib/work/data";
import {
  deleteExpenseAction,
  deleteIncomeAction,
  deleteRecurringCostAction,
  saveBudgetAction,
  saveExpenseAction,
  saveIncomeAction,
  saveRecurringCostAction,
} from "@/lib/work/actions";
import { FIN_CATEGORIES, FREQ_LABEL, type Frequency, type Recurring } from "@/lib/work/finance";
import { uploadToWork } from "@/lib/work/upload";
import { Button } from "@/components/work/ui/button";
import { Input } from "@/components/work/ui/input";
import { Label } from "@/components/work/ui/label";
import { Textarea } from "@/components/work/ui/textarea";
import { Dropzone } from "@/components/work/shared/dropzone";
import { nativeSelectClass } from "@/components/work/forms/fields";
import { money } from "@/components/work/hr/labels";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/work/ui/dialog";

const today = () => new Date().toLocaleDateString("en-CA");
const EDITABLE = FIN_CATEGORIES.filter((c) => !("auto" in c));

export function useRun() {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<void>, ok?: string, after?: () => void) =>
    start(async () => {
      try {
        await fn();
        if (ok) toast.success(ok);
        after?.();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo guardar");
      }
    });
  return { pending, run };
}

function CategorySelect({ value, onChange, id }: { value: string; onChange: (v: string) => void; id: string }) {
  const groups = [...new Set(EDITABLE.map((c) => c.group))];
  return (
    <select id={id} className={nativeSelectClass} value={value} onChange={(e) => onChange(e.target.value)}>
      {groups.map((g) => (
        <optgroup key={g} label={g}>
          {EDITABLE.filter((c) => c.group === g).map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

export function MoneyInput({ id, value, onChange }: { id: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-muted-foreground">$</span>
      <Input
        id={id}
        inputMode="numeric"
        className="pl-6 font-mono"
        value={value ? value.toLocaleString("es-CO") : ""}
        onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, "")) || 0)}
        placeholder="0"
      />
    </div>
  );
}

export function F({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------ expense --- */

export function ExpenseDialog({
  clients,
  projects,
  preset,
  trigger,
}: {
  clients: Client[];
  projects: Project[];
  preset?: { category: string; vendor: string; description: string; amount: number; spentOn: string; recurringId: string };
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useRun();
  const [v, setV] = useState({
    spentOn: preset?.spentOn ?? today(),
    category: preset?.category ?? "software",
    vendor: preset?.vendor ?? "",
    description: preset?.description ?? "",
    amount: preset?.amount ?? 0,
    projectId: "",
    paid: true,
  });
  const [file, setFile] = useState<File | null>(null);
  const set = (k: keyof typeof v, x: unknown) => setV((o) => ({ ...o, [k]: x }));

  const save = () =>
    run(
      async () => {
        const receipt = file ? { path: await uploadToWork(`finance/${v.spentOn.slice(0, 7)}`, file), name: file.name } : null;
        const project = projects.find((p) => p.id === v.projectId);
        await saveExpenseAction({
          spentOn: v.spentOn,
          category: v.category,
          vendor: v.vendor,
          description: v.description,
          amount: v.amount,
          recurringId: preset?.recurringId ?? null,
          clientId: project?.clientId ?? null,
          projectId: project?.id ?? null,
          paid: v.paid,
          receipt,
        });
      },
      "Gasto registrado",
      () => {
        setOpen(false);
        setFile(null);
      },
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="size-4" /> Registrar gasto
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{preset ? `Registrar pago · ${preset.description}` : "Registrar gasto"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <F label="Valor" htmlFor="ex-amount">
            <MoneyInput id="ex-amount" value={v.amount} onChange={(n) => set("amount", n)} />
          </F>
          <F label="Fecha" htmlFor="ex-date">
            <Input id="ex-date" type="date" value={v.spentOn} onChange={(e) => set("spentOn", e.target.value)} />
          </F>
          <F label="Categoría" htmlFor="ex-cat">
            <CategorySelect id="ex-cat" value={v.category} onChange={(x) => set("category", x)} />
          </F>
          <F label="Proveedor" htmlFor="ex-vendor">
            <Input id="ex-vendor" value={v.vendor} onChange={(e) => set("vendor", e.target.value)} placeholder="Ej. Adobe, EPM, Claro…" />
          </F>
          <div className="sm:col-span-2">
            <F label="Descripción" htmlFor="ex-desc">
              <Input id="ex-desc" value={v.description} onChange={(e) => set("description", e.target.value)} />
            </F>
          </div>
          <F label="Proyecto (gasto directo, opcional)" htmlFor="ex-project">
            <select id="ex-project" className={nativeSelectClass} value={v.projectId} onChange={(e) => set("projectId", e.target.value)}>
              <option value="">Gasto general de OR-K</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {clients.find((c) => c.id === p.clientId)?.name} · {p.name}
                </option>
              ))}
            </select>
          </F>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input type="checkbox" checked={v.paid} onChange={(e) => set("paid", e.target.checked)} />
            Ya está pagado
          </label>
          <div className="sm:col-span-2">
            <Label className="mb-1.5 block">Factura o comprobante (opcional)</Label>
            {file ? (
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <span className="truncate">{file.name}</span>
                <Button size="sm" variant="ghost" onClick={() => setFile(null)}>
                  Quitar
                </Button>
              </div>
            ) : (
              <Dropzone multiple={false} onFiles={(f) => setFile(f[0])} hint="PDF o foto de la factura" />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button size="sm" disabled={pending || !v.amount} onClick={save}>
            {pending ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------------------------------- recurring --- */

export function RecurringDialog({ cost }: { cost?: Recurring }) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useRun();
  const [v, setV] = useState<Omit<Recurring, "id">>(
    cost ?? {
      name: "",
      category: "software",
      vendor: "",
      amount: 0,
      frequency: "monthly",
      dueDay: 5,
      startOn: `${today().slice(0, 7)}-01`,
      endOn: null,
      active: true,
      notes: "",
    },
  );
  const set = <K extends keyof typeof v>(k: K, x: (typeof v)[K]) => setV((o) => ({ ...o, [k]: x }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {cost ? (
          <Button size="icon" variant="ghost" className="size-7" aria-label={`Editar ${cost.name}`}>
            <Pencil className="size-3.5" />
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="size-4" /> Gasto fijo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{cost ? "Editar gasto fijo" : "Nuevo gasto fijo"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <F label="Nombre" htmlFor="rc-name">
              <Input id="rc-name" value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="Ej. Arriendo oficina, Adobe Creative Cloud" />
            </F>
          </div>
          <F label="Valor por pago" htmlFor="rc-amount">
            <MoneyInput id="rc-amount" value={v.amount} onChange={(n) => set("amount", n)} />
          </F>
          <F label="Frecuencia" htmlFor="rc-freq">
            <select id="rc-freq" className={nativeSelectClass} value={v.frequency} onChange={(e) => set("frequency", e.target.value as Frequency)}>
              {Object.entries(FREQ_LABEL).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </F>
          <F label="Categoría" htmlFor="rc-cat">
            <CategorySelect id="rc-cat" value={v.category} onChange={(x) => set("category", x)} />
          </F>
          <F label="Proveedor" htmlFor="rc-vendor">
            <Input id="rc-vendor" value={v.vendor} onChange={(e) => set("vendor", e.target.value)} />
          </F>
          <F label="Día de pago" htmlFor="rc-day">
            <Input id="rc-day" type="number" min={1} max={31} value={v.dueDay} onChange={(e) => set("dueDay", Number(e.target.value))} />
          </F>
          <F label={v.frequency === "monthly" ? "Desde" : "Primer pago"} htmlFor="rc-start">
            <Input id="rc-start" type="date" value={v.startOn} onChange={(e) => set("startOn", e.target.value)} />
          </F>
          <F label="Hasta (opcional)" htmlFor="rc-end">
            <Input id="rc-end" type="date" value={v.endOn ?? ""} onChange={(e) => set("endOn", e.target.value || null)} />
          </F>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input type="checkbox" checked={v.active} onChange={(e) => set("active", e.target.checked)} />
            Activo
          </label>
          <div className="sm:col-span-2">
            <F label="Notas" htmlFor="rc-notes">
              <Textarea id="rc-notes" value={v.notes} onChange={(e) => set("notes", e.target.value)} className="min-h-14" />
            </F>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={pending || !v.name.trim() || !v.amount}
            onClick={() => run(() => saveRecurringCostAction(cost?.id ?? null, v), "Gasto fijo guardado", () => setOpen(false))}
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------- income --- */

export function IncomeDialog({ clients, projects, income }: { clients: Client[]; projects: Project[]; income?: FinIncome }) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useRun();
  const [v, setV] = useState<Omit<FinIncome, "id">>(
    income ?? {
      issuedOn: today(),
      clientId: clients[0]?.id ?? null,
      projectId: null,
      description: "",
      invoiceNumber: "",
      amount: 0,
      status: "invoiced",
      paidOn: null,
    },
  );
  const set = <K extends keyof typeof v>(k: K, x: (typeof v)[K]) => setV((o) => ({ ...o, [k]: x }));
  const clientProjects = projects.filter((p) => p.clientId === v.clientId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {income ? (
          <Button size="icon" variant="ghost" className="size-7" aria-label="Editar ingreso">
            <Pencil className="size-3.5" />
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="size-4" /> Registrar ingreso
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{income ? "Editar ingreso" : "Registrar ingreso"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <F label="Cliente" htmlFor="in-client">
            <select
              id="in-client"
              className={nativeSelectClass}
              value={v.clientId ?? ""}
              onChange={(e) => setV((o) => ({ ...o, clientId: e.target.value || null, projectId: null }))}
            >
              <option value="">Sin cliente</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </F>
          <F label="Proyecto" htmlFor="in-project">
            <select id="in-project" className={nativeSelectClass} value={v.projectId ?? ""} onChange={(e) => set("projectId", e.target.value || null)}>
              <option value="">General</option>
              {clientProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </F>
          <F label="Valor (antes de IVA)" htmlFor="in-amount">
            <MoneyInput id="in-amount" value={v.amount} onChange={(n) => set("amount", n)} />
          </F>
          <F label="Estado" htmlFor="in-status">
            <select id="in-status" className={nativeSelectClass} value={v.status} onChange={(e) => set("status", e.target.value as FinIncome["status"])}>
              <option value="scheduled">Programado (cuota futura)</option>
              <option value="quoted">Cotizado</option>
              <option value="invoiced">Facturado (por cobrar)</option>
              <option value="paid">Pagado</option>
            </select>
          </F>
          <F label="Fecha de factura / cotización" htmlFor="in-date">
            <Input id="in-date" type="date" value={v.issuedOn} onChange={(e) => set("issuedOn", e.target.value)} />
          </F>
          {v.status === "paid" ? (
            <F label="Fecha de pago" htmlFor="in-paid">
              <Input id="in-paid" type="date" value={v.paidOn ?? today()} onChange={(e) => set("paidOn", e.target.value)} />
            </F>
          ) : (
            <F label="Número de factura" htmlFor="in-number">
              <Input id="in-number" value={v.invoiceNumber} onChange={(e) => set("invoiceNumber", e.target.value)} placeholder="FE-0001" />
            </F>
          )}
          <div className="sm:col-span-2">
            <F label="Concepto" htmlFor="in-desc">
              <Input id="in-desc" value={v.description} onChange={(e) => set("description", e.target.value)} placeholder="Ej. Anticipo 50% sitio web" />
            </F>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={pending || !v.amount}
            onClick={() => run(() => saveIncomeAction(income?.id ?? null, v), "Ingreso guardado", () => setOpen(false))}
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MarkPaidButton({ income }: { income: FinIncome }) {
  const { pending, run } = useRun();
  if (income.status === "paid") return null;
  if (income.status === "scheduled") {
    return (
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-2 text-xs"
        disabled={pending}
        onClick={() => run(() => saveIncomeAction(income.id, { ...income, status: "invoiced", issuedOn: today() }), "Marcada como facturada")}
      >
        Facturar
      </Button>
    );
  }
  return (
    <Button
      size="sm"
      variant="outline"
      className="h-7 px-2 text-xs"
      disabled={pending}
      onClick={() => run(() => saveIncomeAction(income.id, { ...income, status: "paid", paidOn: today() }), "Marcado como pagado")}
    >
      <Check className="size-3.5" /> Pagado
    </Button>
  );
}

/* ------------------------------------------------------------- delete --- */

export function DeleteButton({ kind, id, label }: { kind: "expense" | "income" | "recurring"; id: string; label: string }) {
  const { pending, run } = useRun();
  const action = kind === "expense" ? deleteExpenseAction : kind === "income" ? deleteIncomeAction : deleteRecurringCostAction;
  return (
    <Button
      size="icon"
      variant="ghost"
      className="size-7"
      disabled={pending}
      aria-label={`Eliminar ${label}`}
      onClick={() => run(() => action(id), "Eliminado")}
    >
      <Trash2 className="size-3.5" />
    </Button>
  );
}

/* ------------------------------------------------------------- budget --- */

export function BudgetEditor({
  year,
  month,
  current,
  previous,
  payroll,
  fixedByCategory,
}: {
  year: number;
  month: number;
  current: Record<string, number>;
  previous: Record<string, number>;
  payroll: number;
  fixedByCategory: Record<string, number>;
}) {
  const { pending, run } = useRun();
  const [v, setV] = useState<Record<string, number>>({ payroll: current.payroll ?? Math.round(payroll), ...current });
  const total = Object.values(v).reduce((a, b) => a + b, 0);
  const groups = [...new Set(FIN_CATEGORIES.map((c) => c.group))];

  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setV({ ...previous })} disabled={!Object.keys(previous).length}>
          Copiar del mes anterior
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setV((o) => ({ ...o, payroll: Math.round(payroll), ...Object.fromEntries(Object.entries(fixedByCategory).map(([k, n]) => [k, Math.max(o[k] ?? 0, Math.round(n))])) }))}
        >
          Sugerir desde nómina y gastos fijos
        </Button>
      </div>
      {groups.map((g) => (
        <div key={g}>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {FIN_CATEGORIES.filter((c) => c.group === g).map((c) => (
              <div key={c.id} className="grid grid-cols-[1fr_10rem] items-center gap-2">
                <Label htmlFor={`bg-${c.id}`} className="font-normal">
                  {c.label}
                </Label>
                <MoneyInput id={`bg-${c.id}`} value={v[c.id] ?? 0} onChange={(n) => setV((o) => ({ ...o, [c.id]: n }))} />
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between border-t border-border pt-3">
        <span>
          Presupuesto total del mes: <span className="font-mono font-semibold">{money(total)}</span>
        </span>
        <Button size="sm" disabled={pending} onClick={() => run(() => saveBudgetAction(year, month, v), "Presupuesto guardado")}>
          Guardar presupuesto
        </Button>
      </div>
    </div>
  );
}
