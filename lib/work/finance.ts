/* Finance helpers shared by the dashboard and forms. */

export const FIN_CATEGORIES = [
  { id: "payroll", label: "Nómina", group: "Personas", auto: true },
  { id: "contractors", label: "Freelancers y proveedores externos", group: "Personas" },
  { id: "training", label: "Capacitación y bienestar", group: "Personas" },
  { id: "office", label: "Arriendo y sede", group: "Operación" },
  { id: "utilities", label: "Servicios públicos (energía, agua, gas)", group: "Operación" },
  { id: "internet", label: "Internet y telefonía", group: "Operación" },
  { id: "software", label: "Software y suscripciones", group: "Operación" },
  { id: "equipment", label: "Equipos y tecnología", group: "Operación" },
  { id: "supplies", label: "Papelería, aseo y cafetería", group: "Operación" },
  { id: "production", label: "Producción (locaciones, props, impresión)", group: "Proyectos" },
  { id: "media", label: "Pauta y medios", group: "Proyectos" },
  { id: "travel", label: "Transporte y viáticos", group: "Proyectos" },
  { id: "marketing", label: "Marketing propio de OR-K", group: "Comercial" },
  { id: "accounting", label: "Contabilidad, legal y asesorías", group: "Administración" },
  { id: "taxes", label: "Impuestos (ICA, renta, IVA, 4×1000)", group: "Administración" },
  { id: "banking", label: "Bancos y comisiones", group: "Administración" },
  { id: "insurance", label: "Seguros", group: "Administración" },
  { id: "other", label: "Otros", group: "Administración" },
] as const;

export type FinCategory = (typeof FIN_CATEGORIES)[number]["id"];
export const CATEGORY_LABEL = Object.fromEntries(FIN_CATEGORIES.map((c) => [c.id, c.label])) as Record<string, string>;

export const FREQ_MONTHS = { monthly: 1, quarterly: 3, semiannual: 6, annual: 12 } as const;
export type Frequency = keyof typeof FREQ_MONTHS;
export const FREQ_LABEL: Record<Frequency, string> = {
  monthly: "Mensual",
  quarterly: "Trimestral",
  semiannual: "Semestral",
  annual: "Anual",
};

export type Recurring = {
  id: string;
  name: string;
  category: string;
  vendor: string;
  amount: number;
  frequency: Frequency;
  dueDay: number;
  startOn: string;
  endOn: string | null;
  active: boolean;
  notes: string;
};

const monthIndex = (ymd: string) => Number(ymd.slice(0, 4)) * 12 + Number(ymd.slice(5, 7)) - 1;
export const monthKey = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}`;

/** What a recurring cost weighs per month (annual / 12, etc.). */
export const monthlyEquivalent = (r: Pick<Recurring, "amount" | "frequency">) => r.amount / FREQ_MONTHS[r.frequency];

/** Whether a recurring cost is billed in YYYY-MM, and on which day. */
export function dueInMonth(r: Recurring, ym: string): string | null {
  if (!r.active) return null;
  const m = monthIndex(`${ym}-01`);
  if (m < monthIndex(r.startOn)) return null;
  if (r.endOn && m > monthIndex(r.endOn)) return null;
  if ((m - monthIndex(r.startOn)) % FREQ_MONTHS[r.frequency] !== 0) return null;
  const [y, mo] = ym.split("-").map(Number);
  const last = new Date(y, mo, 0).getDate();
  return `${ym}-${String(Math.min(r.dueDay, last)).padStart(2, "0")}`;
}

/** Payments due between today and the next `days` days. */
export function upcomingPayments(recurring: Recurring[], today: string, days = 30) {
  const end = new Date(Date.parse(`${today}T12:00:00`) + days * 86_400_000).toLocaleDateString("en-CA");
  const months = [today.slice(0, 7), end.slice(0, 7)].filter((v, i, a) => a.indexOf(v) === i);
  return recurring
    .flatMap((r) => months.map((ym) => ({ r, due: dueInMonth(r, ym) })))
    .filter((x): x is { r: Recurring; due: string } => !!x.due && x.due >= today && x.due <= end)
    .sort((a, b) => a.due.localeCompare(b.due));
}

/** Last N months as YYYY-MM, oldest first, ending at `ym`. */
export function lastMonths(ym: string, n: number) {
  const base = monthIndex(`${ym}-01`);
  return Array.from({ length: n }, (_, i) => {
    const m = base - (n - 1 - i);
    return monthKey(Math.floor(m / 12), (m % 12) + 1);
  });
}

export const monthLabel = (ym: string, opts: Intl.DateTimeFormatOptions = { month: "long", year: "numeric" }) =>
  new Date(`${ym}-15T12:00:00`).toLocaleDateString("es", opts);

/* ---------------------------------------------------- subscription apps --- */

export type AppStatus = "building" | "live" | "paused";
export const APP_STATUS_LABEL: Record<AppStatus, string> = { building: "En desarrollo", live: "Lanzada", paused: "Pausada" };

export type FinApp = {
  id: string;
  name: string;
  description: string;
  status: AppStatus;
  launchOn: string | null;
  monthlyCost: number;
  accentColor: string;
};

export type AppPlan = { id: string; appId: string; name: string; price: number; billing: "monthly" | "annual"; active: boolean };
/** Subscribers of a plan in a month (YYYY-MM). */
export type AppSubscribers = { planId: string; month: string; subscribers: number };

/** A plan's subscribers in `ym`: the record for that month, else the latest one before it. */
export function subscribersIn(planId: string, subs: AppSubscribers[], ym: string) {
  const own = subs.filter((s) => s.planId === planId && s.month <= ym).sort((a, b) => b.month.localeCompare(a.month));
  return own.length ? { count: own[0].subscribers, estimated: own[0].month !== ym } : { count: 0, estimated: false };
}

/** Monthly recurring revenue of a plan (annual plans are spread over 12 months). */
export const planMrr = (p: AppPlan, count: number) => (count * p.price) / (p.billing === "annual" ? 12 : 1);

/** Revenue, subscribers and running cost of each app in `ym`. Paused or unlaunched apps bill nothing. */
export function appsMonth(apps: FinApp[], plans: AppPlan[], subs: AppSubscribers[], ym: string) {
  return apps.map((app) => {
    const running = app.status === "live" && (!app.launchOn || app.launchOn.slice(0, 7) <= ym);
    const rows = plans
      .filter((p) => p.appId === app.id)
      .map((plan) => {
        const s = subscribersIn(plan.id, subs, ym);
        return { plan, ...s, mrr: running && plan.active ? planMrr(plan, s.count) : 0 };
      });
    const mrr = rows.reduce((a, r) => a + r.mrr, 0);
    const cost = app.status === "paused" ? 0 : app.monthlyCost;
    return {
      app,
      running,
      rows,
      mrr,
      subscribers: running ? rows.filter((r) => r.plan.active).reduce((a, r) => a + r.count, 0) : 0,
      estimated: rows.some((r) => r.estimated),
      cost,
      net: mrr - cost,
    };
  });
}
