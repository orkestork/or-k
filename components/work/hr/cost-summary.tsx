import type { HrProfile } from "@/types/work/domain";
import { monthlyCost, type PayrollParams } from "@/lib/work/payroll";
import { money } from "./labels";

/** Estimated monthly cost breakdown for a person (Colombian payroll). */
export function CostSummary({ profile, params }: { profile: HrProfile; params: PayrollParams }) {
  const cost = monthlyCost(profile, params);
  if (!cost) {
    return <p className="text-xs text-muted-foreground">Escribe el salario u honorarios para ver el costo mensual.</p>;
  }
  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex items-baseline justify-between">
        <span className="text-muted-foreground">{cost.kind === "contractor" ? "Costo para OR-K" : "Costo total empresa"}</span>
        <span className="text-xl font-semibold tabular-nums">{money(cost.company)}</span>
      </div>
      <p className="text-xs text-muted-foreground">al mes · estimado</p>
      <ul className="mt-1 flex flex-col gap-1 border-t border-border pt-2 text-xs">
        {cost.lines.map((l) => (
          <li key={l.label} className="flex justify-between gap-2">
            <span className="text-muted-foreground">
              {l.label}
              {l.hint ? <span className="opacity-70"> · {l.hint}</span> : null}
            </span>
            <span className="font-mono tabular-nums">{money(l.amount)}</span>
          </li>
        ))}
      </ul>
      {cost.kind === "employee" ? (
        <div className="flex justify-between border-t border-border pt-2 text-xs">
          <span className="text-muted-foreground">Le llega al empleado (aprox.)</span>
          <span className="font-mono tabular-nums">{money(cost.employeeNet)}</span>
        </div>
      ) : null}
      {cost.reference.map((r) => (
        <p key={r.label} className="text-xs text-muted-foreground">
          {r.label}: {money(r.amount)}
        </p>
      ))}
      <p className="text-[11px] text-muted-foreground">
        Base {params.year}: SMMLV {money(params.minimumWage)} · auxilio {money(params.transportAllowance)}
        {cost.kind === "employee" && cost.exempt ? " · exonerada de salud, SENA e ICBF (< 10 SMMLV)" : ""}. Referencia, no reemplaza la
        liquidación de nómina.
      </p>
    </div>
  );
}
