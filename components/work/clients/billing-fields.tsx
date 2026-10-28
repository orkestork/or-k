"use client";

import { useState } from "react";
import type { ClientBilling } from "@/types/work/domain";
import { Input } from "@/components/work/ui/input";
import { Label } from "@/components/work/ui/label";
import { Textarea } from "@/components/work/ui/textarea";
import { nativeSelectClass } from "@/components/work/forms/fields";
import { money } from "@/components/work/hr/labels";
import { BILLING_MODEL, PAYMENT_METHOD, TERMS, contractTotal, previewInstallments, termsLabel } from "@/lib/work/billing";

/** Billing section of the client form (fields are posted with the form). */
export function BillingFields({ initial, hasPlan }: { initial: ClientBilling; hasPlan: boolean }) {
  const [b, setB] = useState(initial);
  const [splitText, setSplitText] = useState(initial.installmentSplit.join(" / "));
  const set = <K extends keyof ClientBilling>(k: K, v: ClientBilling[K]) => setB((o) => ({ ...o, [k]: v }));
  const plan = previewInstallments(b);
  // Changing the schedule should rewrite the pending installments unless the
  // user opts out; otherwise Finance keeps the old dates and amounts.
  const planKey = (x: ClientBilling) => JSON.stringify(previewInstallments(x));
  const planChanged = planKey(b) !== planKey(initial);
  const [generate, setGenerate] = useState<boolean | null>(null);
  const total = contractTotal(b);
  const iva = Math.round((total * b.ivaRate) / 100);

  return (
    <div className="grid gap-4">
      <input type="hidden" name="billingEnabled" value="1" />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor="billingModel">Cómo trabajamos</Label>
          <select id="billingModel" name="billingModel" className={nativeSelectClass} value={b.model} onChange={(e) => set("model", e.target.value as ClientBilling["model"])}>
            {Object.entries(BILLING_MODEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="billingMethod">Cómo paga</Label>
          <select id="billingMethod" name="billingMethod" className={nativeSelectClass} value={b.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value as ClientBilling["paymentMethod"])}>
            {Object.entries(PAYMENT_METHOD).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="billingTerms">Plazo de pago</Label>
          <select id="billingTerms" name="billingTerms" className={nativeSelectClass} value={b.termsDays} onChange={(e) => set("termsDays", Number(e.target.value))}>
            {TERMS.map((d) => (
              <option key={d} value={d}>
                {termsLabel(d)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor="billingValue">{b.model === "retainer" ? "Fee mensual (antes de IVA)" : "Valor del contrato (antes de IVA)"}</Label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-muted-foreground">$</span>
            <Input
              id="billingValue"
              name="billingValue"
              inputMode="numeric"
              className="pl-6 font-mono"
              value={b.contractValue ? b.contractValue.toLocaleString("es-CO") : ""}
              onChange={(e) => set("contractValue", Number(e.target.value.replace(/\D/g, "")) || null)}
              placeholder="0"
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="billingIva">IVA %</Label>
          <Input id="billingIva" name="billingIva" type="number" min={0} max={19} value={b.ivaRate} onChange={(e) => set("ivaRate", Number(e.target.value))} />
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" name="billingWithholding" checked={b.withholding} onChange={(e) => set("withholding", e.target.checked)} />
          Nos aplican retención en la fuente
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="grid gap-1.5">
          <Label htmlFor="billingInstallments">{b.model === "retainer" ? "Meses" : "Número de cuotas"}</Label>
          <Input
            id="billingInstallments"
            name="billingInstallments"
            type="number"
            min={1}
            max={36}
            value={b.installments}
            onChange={(e) => {
              set("installments", Math.max(1, Number(e.target.value)));
              setSplitText("");
              set("installmentSplit", []);
            }}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="billingFrequency">Cada cuánto</Label>
          <select id="billingFrequency" name="billingFrequency" className={nativeSelectClass} value={b.installmentFrequency} onChange={(e) => set("installmentFrequency", e.target.value as ClientBilling["installmentFrequency"])}>
            <option value="monthly">Mensual</option>
            <option value="biweekly">Quincenal</option>
            <option value="milestones">Por hitos (fechas aproximadas)</option>
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="billingFirstDue">Primera cuota</Label>
          <Input id="billingFirstDue" name="billingFirstDue" type="date" value={b.firstDueOn ?? ""} onChange={(e) => set("firstDueOn", e.target.value || null)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="billingSplit">Porcentajes (opcional)</Label>
          <Input
            id="billingSplit"
            name="billingSplit"
            value={splitText}
            placeholder="50 / 50 · 40 / 30 / 30"
            onChange={(e) => {
              setSplitText(e.target.value);
              const parts = e.target.value.split(/[,/\s]+/).map(Number).filter((n) => n > 0);
              set("installmentSplit", parts);
              if (parts.length) set("installments", parts.length);
            }}
          />
        </div>
      </div>

      {plan.length ? (
        <div className="rounded-md border border-border">
          <p className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
            Plan de pagos · {money(total)} + IVA {money(iva)} = {money(total + iva)}
          </p>
          <ul className="divide-y divide-border text-sm">
            {plan.map((c) => (
              <li key={c.no} className="flex items-center justify-between gap-3 px-3 py-1.5">
                <span>
                  Cuota {c.no} de {c.of} <span className="text-xs text-muted-foreground">· {c.pct}%</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(`${c.due}T12:00:00`).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })}
                </span>
                <span className="font-mono tabular-nums">{money(c.amount)}</span>
              </li>
            ))}
          </ul>
          <label className="flex items-center gap-2 border-t border-border px-3 py-2 text-sm">
            <input
              type="checkbox"
              name="billingGenerate"
              checked={generate ?? (!hasPlan || planChanged)}
              onChange={(e) => setGenerate(e.target.checked)}
            />
            {hasPlan ? "Actualizar las cuotas programadas en Finanzas (las ya facturadas o pagadas no se tocan)" : "Crear estas cuotas en Finanzas → Ingresos"}
          </label>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Escribe el valor y la fecha de la primera cuota para ver el plan de pagos.</p>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor="billingNotes">Notas de facturación</Label>
        <Textarea
          id="billingNotes"
          name="billingNotes"
          value={b.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Ej. facturar a nombre de…, enviar factura a…, requiere orden de compra"
          className="min-h-14"
        />
      </div>
    </div>
  );
}
