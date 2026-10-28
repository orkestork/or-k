"use client";

import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { ARL_LABEL, monthlyCost, type PayrollParams } from "@/lib/work/payroll";
import type { HrProfile } from "@/types/work/domain";
import { Label } from "@/components/work/ui/label";
import { nativeSelectClass } from "@/components/work/forms/fields";
import { MoneyInput } from "@/components/work/finance/forms";
import { cn } from "@/lib/work/utils";
import { money } from "./labels";

type Kind = "employee" | "services" | "apprentice";

const profileFor = (kind: Kind, salary: number, risk: number, transport: boolean | null) =>
  ({
    contractType: kind === "employee" ? "indefinite" : kind === "services" ? "services" : "apprentice",
    salary,
    salaryPeriod: "monthly",
    arlRiskLevel: risk,
    transportAllowance: transport,
    paysOwnSocialSecurity: true,
  }) as Pick<HrProfile, "contractType" | "salary" | "salaryPeriod" | "arlRiskLevel" | "transportAllowance" | "paysOwnSocialSecurity">;

/** Highest salary whose total company cost fits in `budget`. */
function salaryForBudget(budget: number, kind: Kind, risk: number, transport: boolean | null, params: PayrollParams) {
  const cost = (s: number) => monthlyCost(profileFor(kind, s, risk, transport), params)?.company ?? 0;
  let lo = 0;
  let hi = budget;
  // Cost isn't monotonic at 2 SMMLV (the transport allowance stops), so
  // search below and above that line separately and keep the best.
  const search = (a: number, b: number) => {
    lo = a;
    hi = b;
    if (cost(lo) > budget) return 0;
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      if (cost(mid) <= budget) lo = mid;
      else hi = mid;
    }
    return lo;
  };
  const line = 2 * params.minimumWage;
  const best = Math.max(search(0, Math.min(budget, line)), budget > line ? search(line + 1, budget) : 0);
  return Math.floor(best / 1000) * 1000;
}

/** "If I offer X, what does it cost OR-K?" — and the reverse, from a budget. */
export function SalarySimulator({ params }: { params: PayrollParams }) {
  const [mode, setMode] = useState<"offer" | "budget">("offer");
  const [amount, setAmount] = useState(5_000_000);
  const [kind, setKind] = useState<Kind>("employee");
  const [risk, setRisk] = useState(1);
  const [transport, setTransport] = useState<"auto" | "no">("auto");
  const [open, setOpen] = useState(false);

  const t = transport === "auto" ? null : false;
  const salary = mode === "offer" ? amount : salaryForBudget(amount, kind, risk, t, params);
  const cost = useMemo(() => monthlyCost(profileFor(kind, salary, risk, t), params), [kind, salary, risk, t, params]);
  const asContractor = monthlyCost(profileFor("services", salary, risk, t), params);
  const smmlv = params.minimumWage;

  return (
    <div className="grid gap-3 text-sm">
      <p className="flex items-center gap-2 font-medium">
        <Calculator className="size-4" /> Simulador de salario
      </p>

      <div className="inline-flex rounded-md border border-border p-0.5 text-xs">
        {(
          [
            ["offer", "Si ofrezco…"],
            ["budget", "Tengo un presupuesto de…"],
          ] as const
        ).map(([m, l]) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn("flex-1 rounded px-2 py-1", mode === m ? "bg-muted font-medium" : "text-muted-foreground")}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="grid gap-1">
        <Label htmlFor="sim-amount">
          {mode === "offer" ? (kind === "services" ? "Honorarios mensuales" : "Salario mensual") : "Costo total mensual que puede asumir OR-K"}
        </Label>
        <MoneyInput id="sim-amount" value={amount} onChange={setAmount} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-1">
          <Label htmlFor="sim-kind">Contrato</Label>
          <select id="sim-kind" className={nativeSelectClass} value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
            <option value="employee">Laboral (indefinido, fijo u obra)</option>
            <option value="services">Prestación de servicios</option>
            <option value="apprentice">Aprendiz SENA</option>
          </select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="sim-risk">Riesgo ARL</Label>
          <select id="sim-risk" className={nativeSelectClass} value={risk} onChange={(e) => setRisk(Number(e.target.value))} disabled={kind === "services"}>
            {ARL_LABEL.map((l, i) => (
              <option key={l} value={i + 1}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>
      {kind === "employee" && salary <= 2 * smmlv ? (
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={transport === "no"} onChange={(e) => setTransport(e.target.checked ? "no" : "auto")} />
          Trabajo 100% remoto (sin auxilio de transporte)
        </label>
      ) : null}

      {cost ? (
        <div className="grid gap-2 rounded-md border border-border p-3">
          {mode === "budget" ? (
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground">Puedes ofrecer hasta</span>
              <span className="text-lg font-semibold tabular-nums">{money(salary)}</span>
            </div>
          ) : null}
          <div className="flex items-baseline justify-between">
            <span className="text-muted-foreground">Le cuesta a OR-K</span>
            <span className="text-xl font-semibold tabular-nums">{money(cost.company)}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>al mes · {salary ? `${(cost.company / salary).toFixed(2)}× el ${kind === "services" ? "honorario" : "salario"}` : ""}</span>
            <span className="font-mono">{money(cost.company * 12)} al año</span>
          </div>
          {cost.kind === "employee" ? (
            <div className="flex justify-between border-t border-border pt-2 text-xs">
              <span className="text-muted-foreground">Le llega a la persona (aprox., antes de retención)</span>
              <span className="font-mono">{money(cost.employeeNet)}</span>
            </div>
          ) : null}
          {kind === "employee" && asContractor ? (
            <p className="text-xs text-muted-foreground">
              Por prestación de servicios, el mismo valor cuesta {money(asContractor.company)} (la persona paga su seguridad social y no
              tiene prestaciones). Ojo: si cumple horario y recibe órdenes, la ley lo considera contrato laboral.
            </p>
          ) : null}

          <button type="button" className="justify-self-start text-xs text-primary hover:underline" onClick={() => setOpen((o) => !o)}>
            {open ? "Ocultar detalle" : "Ver de dónde sale"}
          </button>
          {open ? (
            <ul className="flex flex-col gap-1 border-t border-border pt-2 text-xs">
              {cost.lines.map((l) => (
                <li key={l.label} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">
                    {l.label}
                    {l.hint ? <span className="opacity-70"> · {l.hint}</span> : null}
                  </span>
                  <span className="font-mono tabular-nums">{money(l.amount)}</span>
                </li>
              ))}
              {cost.reference.map((r) => (
                <li key={r.label} className="flex justify-between gap-2 text-muted-foreground">
                  <span>{r.label}</span>
                  <span className="font-mono">{money(r.amount)}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Escribe un valor para simular.</p>
      )}

      {kind === "employee" && salary > 0 && salary < smmlv ? (
        <p className="text-xs text-tone-warn">Está por debajo del salario mínimo ({money(smmlv)}): no es legal para tiempo completo.</p>
      ) : null}
      {kind === "employee" && salary >= 13 * smmlv ? (
        <p className="text-xs text-muted-foreground">
          Desde 13 SMMLV se puede pactar salario integral (sin prima ni cesantías); este cálculo usa salario ordinario.
        </p>
      ) : null}
      <p className="text-[11px] text-muted-foreground">
        Base {params.year}: SMMLV {money(smmlv)} · auxilio {money(params.transportAllowance)}. Estimado; no reemplaza la liquidación de nómina.
      </p>
    </div>
  );
}
