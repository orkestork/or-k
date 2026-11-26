import type { HrProfile } from "@/types/work/domain";

export type PayrollParams = {
  year: number;
  minimumWage: number;
  transportAllowance: number;
  /** Company exempt from health 8.5%, SENA and ICBF for salaries < 10 SMMLV (art. 114-1 E.T.). */
  exempt: boolean;
  /** True when HR overrode the legal values for that year. */
  manual?: boolean;
};

/** SMMLV and transport allowance as decreed by the Government each year. */
export const LEGAL_PAYROLL: Record<number, { minimumWage: number; transportAllowance: number; source: string }> = {
  2024: { minimumWage: 1_300_000, transportAllowance: 162_000, source: "Decretos 2292 y 2293 de 2023" },
  2025: { minimumWage: 1_423_500, transportAllowance: 200_000, source: "Decretos 1572 y 1573 de 2024" },
  2026: {
    minimumWage: 1_750_905,
    transportAllowance: 249_095,
    source: "Decretos 1469 y 1470 de 2025, ratificado transitoriamente por el Decreto 0159 de 2026",
  },
};

/** Legal values for a year (the latest known one if that year isn't loaded yet). */
export function legalPayroll(year: number) {
  const known = Object.keys(LEGAL_PAYROLL).map(Number).sort((x, y) => x - y);
  const use = known.filter((y) => y <= year).at(-1) ?? known[0];
  return { year, ...LEGAL_PAYROLL[use], outdated: use !== year };
}

/**
 * Parameters in force for `year`: the legal values, unless HR set a manual
 * override for that same year. The exemption flag is the company's own.
 */
export function resolvePayroll(stored: Partial<PayrollParams> | null, year: number): PayrollParams & { source: string; outdated: boolean } {
  const legal = legalPayroll(year);
  const exempt = stored?.exempt ?? true;
  if (stored?.manual && stored.year === year && stored.minimumWage && stored.transportAllowance) {
    return { year, minimumWage: stored.minimumWage, transportAllowance: stored.transportAllowance, exempt, manual: true, source: "Valor manual de Talento humano", outdated: false };
  }
  return { year, minimumWage: legal.minimumWage, transportAllowance: legal.transportAllowance, exempt, manual: false, source: legal.source, outdated: legal.outdated };
}

export const DEFAULT_PAYROLL: PayrollParams = resolvePayroll(null, new Date().getFullYear());

/** ARL employer rate by risk class (Decreto 1772/1994). */
export const ARL_RATE = [0.00522, 0.01044, 0.02436, 0.0435, 0.0696] as const;
export const ARL_LABEL = ["I · Mínimo (oficina)", "II · Bajo", "III · Medio", "IV · Alto", "V · Máximo"];

export const isEmployment = (t: HrProfile["contractType"]) =>
  t === "indefinite" || t === "fixed" || t === "work" || t === "apprentice";

export type CostLine = { label: string; amount: number; hint?: string };

/**
 * Monthly cost of a person in Colombia (estimate).
 * Employment: salary + bonus + transport allowance + employer social security,
 * payroll taxes and benefits. Contractors: the fee, with the social security
 * they must pay themselves (40% IBC) shown for reference.
 */
export function monthlyCost(
  p: Pick<HrProfile, "contractType" | "salary" | "salaryPeriod" | "arlRiskLevel" | "transportAllowance" | "paysOwnSocialSecurity"> &
    Partial<Pick<HrProfile, "bonus">>,
  params: PayrollParams,
) {
  const base = p.salary ?? 0;
  if (!base) return null;
  const bonus = Math.max(0, p.bonus ?? 0);

  if (!isEmployment(p.contractType)) {
    const fee = base + bonus;
    const ibc = Math.max(params.minimumWage, fee * 0.4);
    const own = ibc * (0.125 + 0.16 + ARL_RATE[0]);
    return {
      kind: "contractor" as const,
      lines: [{ label: "Honorarios", amount: base }, ...(bonus ? [{ label: "Bono", amount: bonus }] : [])] as CostLine[],
      company: fee,
      employeeNet: fee,
      reference: p.paysOwnSocialSecurity
        ? [{ label: "Seguridad social que paga el contratista (≈40% IBC)", amount: Math.round(own) }]
        : [],
    };
  }

  if (p.contractType === "apprentice") {
    // SENA apprentice: support payment + health and ARL only.
    const health = base * 0.125;
    const arl = base * ARL_RATE[(p.arlRiskLevel ?? 1) - 1];
    return {
      kind: "apprentice" as const,
      lines: [
        { label: "Apoyo de sostenimiento", amount: base } as CostLine,
        { label: "Salud (12.5%)", amount: Math.round(health) },
        { label: "ARL", amount: Math.round(arl) },
      ],
      company: Math.round(base + health + arl),
      employeeNet: base,
      reference: [],
    };
  }

  const smmlv = params.minimumWage;
  // The bonus is paid apart from the salary (non-salary, art. 128 C.S.T.): no benefits, no payroll taxes.
  // Only the part above 40% of the total pay joins the social-security base (art. 30 Ley 1393/2010).
  const freeBonus = bonus;
  const salary = base;
  const excess = Math.max(0, freeBonus - 0.4 * (salary + freeBonus));
  const ibc = salary + excess;
  const transport = (p.transportAllowance ?? salary <= 2 * smmlv) ? params.transportAllowance : 0;
  const exempt = params.exempt && salary < 10 * smmlv;
  const risk = ARL_RATE[(p.arlRiskLevel ?? 1) - 1];
  const withTransport = salary + transport;

  const lines: CostLine[] = [
    { label: "Salario", amount: base },
    ...(freeBonus ? [{ label: "Bono extra", amount: freeBonus, hint: "aparte, sin prestaciones" }] : []),
    ...(transport ? [{ label: "Auxilio de transporte", amount: transport }] : []),
    ...(exempt ? [] : [{ label: "Salud empleador (8.5%)", amount: ibc * 0.085 }]),
    { label: "Pensión empleador (12%)", amount: ibc * 0.12 },
    { label: `ARL (${(risk * 100).toFixed(3)}%)`, amount: ibc * risk },
    { label: "Caja de compensación (4%)", amount: salary * 0.04 },
    ...(exempt ? [] : [{ label: "ICBF (3%) + SENA (2%)", amount: salary * 0.05 }]),
    { label: "Prima de servicios (8.33%)", amount: withTransport * 0.0833, hint: "provisión mensual" },
    { label: "Cesantías (8.33%)", amount: withTransport * 0.0833, hint: "provisión mensual" },
    { label: "Intereses a cesantías (1%)", amount: withTransport * 0.01, hint: "provisión mensual" },
    { label: "Vacaciones (4.17%)", amount: salary * 0.0417, hint: "provisión mensual" },
  ].map((l) => ({ ...l, amount: Math.round(l.amount) }));

  const solidarity = ibc >= 4 * smmlv ? 0.01 : 0;
  const deductions = ibc * (0.04 + 0.04 + solidarity);
  return {
    kind: "employee" as const,
    lines,
    company: lines.reduce((a, l) => a + l.amount, 0),
    employeeNet: Math.round(withTransport + freeBonus - deductions),
    reference: [
      { label: `Descuentos al empleado: salud 4% + pensión 4%${solidarity ? " + FSP 1%" : ""}`, amount: Math.round(deductions) },
      ...(excess
        ? [{ label: "El bono supera el 40% de lo que gana la persona; ese excedente cotiza salud y pensión (Ley 1393 de 2010), pero no prestaciones", amount: Math.round(excess) }]
        : []),
    ],
    exempt,
  };
}
