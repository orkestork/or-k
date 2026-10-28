"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Scale } from "lucide-react";
import { legalPayroll, type PayrollParams } from "@/lib/work/payroll";
import { savePayrollParamsAction } from "@/lib/work/actions";
import { Button } from "@/components/work/ui/button";
import { Input } from "@/components/work/ui/input";
import { Label } from "@/components/work/ui/label";
import { money } from "./labels";

/**
 * SMMLV and transport allowance come from the decree for the current year.
 * HR only overrides them by ticking "Usar otro valor".
 */
export function PayrollParamsForm({
  params,
  canEdit,
}: {
  params: PayrollParams & { source: string; outdated: boolean };
  canEdit: boolean;
}) {
  const legal = legalPayroll(params.year);
  const [p, setP] = useState<PayrollParams>({
    year: params.year,
    minimumWage: params.minimumWage,
    transportAllowance: params.transportAllowance,
    exempt: params.exempt,
    manual: !!params.manual,
  });
  const [pending, start] = useTransition();
  const dirty =
    p.exempt !== params.exempt ||
    !!p.manual !== !!params.manual ||
    (p.manual && (p.minimumWage !== params.minimumWage || p.transportAllowance !== params.transportAllowance));

  const toggleManual = (manual: boolean) =>
    setP(manual ? { ...p, manual } : { ...p, manual, minimumWage: legal.minimumWage, transportAllowance: legal.transportAllowance });

  return (
    <div className="grid gap-3 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1">
          <Label htmlFor="pp-smmlv">SMMLV {p.year}</Label>
          {p.manual ? (
            <Input id="pp-smmlv" type="number" value={p.minimumWage} onChange={(e) => setP({ ...p, minimumWage: Number(e.target.value) })} />
          ) : (
            <p id="pp-smmlv" className="font-mono text-base font-medium">{money(p.minimumWage)}</p>
          )}
        </div>
        <div className="grid gap-1">
          <Label htmlFor="pp-aux">Auxilio de transporte</Label>
          {p.manual ? (
            <Input id="pp-aux" type="number" value={p.transportAllowance} onChange={(e) => setP({ ...p, transportAllowance: Number(e.target.value) })} />
          ) : (
            <p id="pp-aux" className="font-mono text-base font-medium">{money(p.transportAllowance)}</p>
          )}
        </div>
      </div>

      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Scale className="mt-0.5 size-3.5 shrink-0" />
        {p.manual ? (
          <span>
            Valor manual. El legal es {money(legal.minimumWage)} + {money(legal.transportAllowance)} ({legal.source}).
          </span>
        ) : (
          <span>
            Tomado de la ley: {legal.source}.{" "}
            {legal.outdated ? <strong className="text-tone-warn">Aún no está cargado el decreto de {p.year}; se usa el último vigente.</strong> : null}
          </span>
        )}
      </p>

      {canEdit ? (
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={!!p.manual} onChange={(e) => toggleManual(e.target.checked)} />
          Usar otro valor (solo si cambia la ley y aún no está actualizado aquí)
        </label>
      ) : null}

      <label className="flex items-start gap-2 text-xs">
        <input type="checkbox" className="mt-0.5" checked={p.exempt} disabled={!canEdit} onChange={(e) => setP({ ...p, exempt: e.target.checked })} />
        OR-K está exonerada de salud (8.5%), SENA e ICBF para salarios menores a 10 SMMLV (art. 114-1 E.T.)
      </label>

      {canEdit ? (
        <Button
          size="sm"
          className="justify-self-end"
          disabled={!dirty || pending}
          onClick={() =>
            start(async () => {
              try {
                await savePayrollParamsAction(p);
                toast.success("Parámetros actualizados");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "No se pudo guardar");
              }
            })
          }
        >
          Guardar
        </Button>
      ) : null}
    </div>
  );
}
