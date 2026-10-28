"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  deleteAppAction,
  deleteAppPlanAction,
  saveAppAction,
  saveAppPlanAction,
  saveAppSubscribersAction,
} from "@/lib/work/actions";
import { APP_STATUS_LABEL, type AppPlan, type AppStatus, type FinApp } from "@/lib/work/finance";
import { Button } from "@/components/work/ui/button";
import { Input } from "@/components/work/ui/input";
import { Textarea } from "@/components/work/ui/textarea";
import { nativeSelectClass } from "@/components/work/forms/fields";
import { F, MoneyInput, useRun } from "@/components/work/finance/forms";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/work/ui/dialog";

/* ---------------------------------------------------------------- app --- */

export function AppDialog({ app }: { app?: FinApp }) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useRun();
  const [v, setV] = useState<Omit<FinApp, "id">>(
    app ?? { name: "", description: "", status: "building", launchOn: null, monthlyCost: 0, accentColor: "#e31572" },
  );
  const set = <K extends keyof typeof v>(k: K, x: (typeof v)[K]) => setV((o) => ({ ...o, [k]: x }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {app ? (
          <Button size="icon" variant="ghost" className="size-7" aria-label={`Editar ${app.name}`}>
            <Pencil className="size-3.5" />
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="size-4" /> Aplicación
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{app ? "Editar aplicación" : "Nueva aplicación"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <F label="Nombre" htmlFor="app-name">
              <Input id="app-name" value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="Ej. OR-K CRM" />
            </F>
          </div>
          <F label="Estado" htmlFor="app-status">
            <select id="app-status" className={nativeSelectClass} value={v.status} onChange={(e) => set("status", e.target.value as AppStatus)}>
              {Object.entries(APP_STATUS_LABEL).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </F>
          <F label="Lanzamiento" htmlFor="app-launch">
            <Input id="app-launch" type="date" value={v.launchOn ?? ""} onChange={(e) => set("launchOn", e.target.value || null)} />
          </F>
          <F label="Costo mensual de operación" htmlFor="app-cost">
            <MoneyInput id="app-cost" value={v.monthlyCost} onChange={(n) => set("monthlyCost", n)} />
          </F>
          <F label="Color" htmlFor="app-color">
            <Input id="app-color" type="color" value={v.accentColor} onChange={(e) => set("accentColor", e.target.value)} className="h-9 p-1" />
          </F>
          <div className="sm:col-span-2">
            <F label="Descripción" htmlFor="app-desc">
              <Textarea id="app-desc" value={v.description} onChange={(e) => set("description", e.target.value)} className="min-h-14" />
            </F>
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            El costo de operación es lo que cuesta mantenerla al mes: hosting, APIs, tiendas de apps… Solo factura cuando está lanzada.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={pending || !v.name.trim()}
            onClick={() => run(() => saveAppAction(app?.id ?? null, v), "Aplicación guardada", () => setOpen(false))}
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------------------------------------- plan --- */

export function PlanDialog({ appId, plan }: { appId: string; plan?: AppPlan }) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useRun();
  const [v, setV] = useState<Omit<AppPlan, "id">>(plan ?? { appId, name: "", price: 0, billing: "monthly", active: true });
  const set = <K extends keyof typeof v>(k: K, x: (typeof v)[K]) => setV((o) => ({ ...o, [k]: x }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {plan ? (
          <Button size="icon" variant="ghost" className="size-7" aria-label={`Editar plan ${plan.name}`}>
            <Pencil className="size-3.5" />
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs">
            <Plus className="size-3.5" /> Plan
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{plan ? "Editar plan" : "Nuevo plan de suscripción"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <F label="Nombre del plan" htmlFor="plan-name">
              <Input id="plan-name" value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="Ej. Básico, Pro, Empresas" />
            </F>
          </div>
          <F label="Precio" htmlFor="plan-price">
            <MoneyInput id="plan-price" value={v.price} onChange={(n) => set("price", n)} />
          </F>
          <F label="Se cobra" htmlFor="plan-billing">
            <select id="plan-billing" className={nativeSelectClass} value={v.billing} onChange={(e) => set("billing", e.target.value as AppPlan["billing"])}>
              <option value="monthly">Cada mes</option>
              <option value="annual">Cada año</option>
            </select>
          </F>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={v.active} onChange={(e) => set("active", e.target.checked)} />
            Plan activo (cuenta en los ingresos)
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={pending || !v.name.trim()}
            onClick={() => run(() => saveAppPlanAction(plan?.id ?? null, v), "Plan guardado", () => setOpen(false))}
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------ delete --- */

export function DeleteAppItem({ kind, id, label }: { kind: "app" | "plan"; id: string; label: string }) {
  const { pending, run } = useRun();
  const [confirm, setConfirm] = useState(false);
  if (confirm)
    return (
      <span className="flex items-center gap-1 text-xs">
        <Button size="sm" variant="destructive" className="h-7 px-2 text-xs" disabled={pending} onClick={() => run(() => (kind === "app" ? deleteAppAction(id) : deleteAppPlanAction(id)), "Eliminado")}>
          Eliminar
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setConfirm(false)}>
          No
        </Button>
      </span>
    );
  return (
    <Button size="icon" variant="ghost" className="size-7" aria-label={`Eliminar ${label}`} onClick={() => setConfirm(true)}>
      <Trash2 className="size-3.5" />
    </Button>
  );
}

/* -------------------------------------------------------- subscribers --- */

/** Subscriber count of each plan for one month. */
export function SubscribersInput({ ym, planId, count, estimated }: { ym: string; planId: string; count: number; estimated: boolean }) {
  const { pending, run } = useRun();
  const [v, setV] = useState(String(count));
  const dirty = Number(v) !== count || estimated;
  return (
    <span className="flex items-center justify-end gap-1">
      <Input
        inputMode="numeric"
        aria-label="Suscriptores"
        className="h-7 w-20 text-right font-mono"
        value={v}
        onChange={(e) => setV(e.target.value.replace(/\D/g, ""))}
        onKeyDown={(e) => {
          if (e.key === "Enter" && dirty) run(() => saveAppSubscribersAction(ym, { [planId]: Number(v) || 0 }), "Suscriptores guardados");
        }}
      />
      <Button
        size="sm"
        variant={dirty ? "default" : "ghost"}
        className="h-7 px-2 text-xs"
        disabled={pending || !dirty}
        title={estimated ? "Confirma el número de este mes" : undefined}
        onClick={() => run(() => saveAppSubscribersAction(ym, { [planId]: Number(v) || 0 }), "Suscriptores guardados")}
      >
        {estimated && Number(v) === count ? "Confirmar" : "Guardar"}
      </Button>
    </span>
  );
}
