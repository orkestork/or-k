import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";
import {
  getApps,
  getBudgets,
  getClients,
  getExpenses,
  getHrProfiles,
  getIncome,
  getMe,
  getPayrollParams,
  getProjects,
  getRecurringCosts,
  getRequests,
  getTimeEntries,
  getUsers,
} from "@/lib/work/data";
import { seesFinance } from "@/lib/work/people";
import { monthlyCost } from "@/lib/work/payroll";
import {
  APP_STATUS_LABEL,
  appsMonth,
  CATEGORY_LABEL,
  FIN_CATEGORIES,
  FREQ_LABEL,
  dueInMonth,
  lastMonths,
  monthLabel,
  monthlyEquivalent,
  upcomingPayments,
} from "@/lib/work/finance";
import { cn } from "@/lib/work/utils";
import { PageHeader, ClientMark } from "@/components/work/shared/page-header";
import { MetricCard } from "@/components/work/shared/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/work/ui/card";
import { Button } from "@/components/work/ui/button";
import { money } from "@/components/work/hr/labels";
import {
  BudgetEditor,
  DeleteButton,
  ExpenseDialog,
  IncomeDialog,
  MarkPaidButton,
  RecurringDialog,
} from "@/components/work/finance/forms";
import { AppDialog, DeleteAppItem, PlanDialog, SubscribersInput } from "@/components/work/finance/apps";

export const metadata: Metadata = { title: "Finanzas · OR-K WORK" };

const TABS = [
  { id: "summary", label: "Resumen" },
  { id: "expenses", label: "Gastos" },
  { id: "fixed", label: "Gastos fijos" },
  { id: "income", label: "Ingresos" },
  { id: "budget", label: "Presupuesto" },
  { id: "projects", label: "Rentabilidad" },
  { id: "apps", label: "Aplicaciones" },
] as const;

const short = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)} M` : n >= 1000 ? `$${Math.round(n / 1000)} mil` : money(n);
const day = (ymd: string) => new Date(`${ymd}T12:00:00`).toLocaleDateString("es", { day: "numeric", month: "short" });

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ tab?: string; month?: string }> }) {
  const sp = await searchParams;
  const me = await getMe();
  if (!seesFinance(me?.role)) redirect("/work/home");

  const today = new Date().toLocaleDateString("en-CA");
  const ym = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : today.slice(0, 7);
  const tab = TABS.some((t) => t.id === sp.tab) ? sp.tab! : "summary";
  const [year, month] = ym.split("-").map(Number);
  const months12 = lastMonths(ym, 12);
  const from12 = `${months12[0]}-01`;
  const monthEnd = new Date(year, month, 0).toLocaleDateString("en-CA");
  const prevYm = lastMonths(ym, 2)[0];
  const nextMonth = new Date(year, month, 1).toLocaleDateString("en-CA").slice(0, 7);
  // Income and expenses load 12 months ahead too, for the month-by-month balance.
  const horizonEnd = new Date(year + 1, month, 0).toLocaleDateString("en-CA");

  const [recurring, expenses, income, budgets, prevBudgets, nextBudgets, lastYearBudgets, files, params, users, clients, projects, requests, entries, appData] =
    await Promise.all([
      getRecurringCosts(),
      getExpenses(from12, horizonEnd),
      getIncome(from12, horizonEnd),
      getBudgets(year),
      getBudgets(Number(prevYm.slice(0, 4))),
      getBudgets(year + 1),
      getBudgets(year - 1),
      getHrProfiles(),
      getPayrollParams(),
      getUsers(),
      getClients(),
      getProjects(),
      getRequests(),
      getTimeEntries(),
      getApps(),
    ]);

  /* ----------------------------------------------------- payroll --- */
  const staff = users.filter((u) => u.active && u.role !== "client");
  const monthStart = `${ym}-01`;
  const people = staff
    .map((u) => {
      const f = files.find((x) => x.userId === u.id);
      const c = f ? monthlyCost(f, params) : null;
      return f && c ? { user: u, file: f, full: c.company } : null;
    })
    .filter(Boolean) as { user: (typeof users)[number]; file: (typeof files)[number]; full: number }[];
  /** Payroll of a month, prorated by the days each person is hired in it. */
  const payrollFor = (m: string) => {
    const [y, mo] = m.split("-").map(Number);
    const days = new Date(y, mo, 0).getDate();
    const first = `${m}-01`;
    const last = `${m}-${String(days).padStart(2, "0")}`;
    return people
      .map((x) => {
        const from = x.file.startDate && x.file.startDate > first ? x.file.startDate : first;
        const to = x.file.endDate && x.file.endDate < last ? x.file.endDate : last;
        if (from > to) return null;
        const worked = Number(to.slice(8)) - Number(from.slice(8)) + 1;
        return { ...x, days: worked, cost: Math.round((x.full * worked) / days), partial: worked < days };
      })
      .filter(Boolean) as ((typeof people)[number] & { days: number; cost: number; partial: boolean })[];
  };
  const payrollRows = payrollFor(ym);
  const payroll = payrollRows.reduce((a, r) => a + r.cost, 0);
  // Monthly run-rate: everyone hired (also those starting later), full month.
  const active = people.filter((x) => !x.file.endDate || x.file.endDate >= monthStart);
  const payrollRunRate = active.reduce((a, x) => a + x.full, 0);
  const upcomingHires = active.filter((x) => x.file.startDate && x.file.startDate > monthEnd);

  /* ---------------------------------------------- this month's costs --- */
  const inMonth = (d: string) => d.slice(0, 7) === ym;
  const monthExpenses = expenses.filter((e) => inMonth(e.spentOn));
  const dueThisMonth = recurring
    .map((r) => ({ r, due: dueInMonth(r, ym) }))
    .filter((x): x is { r: (typeof recurring)[number]; due: string } => !!x.due);
  const registeredRecurring = new Set(monthExpenses.map((e) => e.recurringId).filter(Boolean));
  const pendingRecurring = dueThisMonth.filter((x) => !registeredRecurring.has(x.r.id));

  const fixedMonthly = recurring.filter((r) => r.active && (!r.endOn || r.endOn >= monthStart)).reduce((a, r) => a + monthlyEquivalent(r), 0);
  const fixedByCategory = recurring
    .filter((r) => r.active)
    .reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.category]: (acc[r.category] ?? 0) + monthlyEquivalent(r) }), {});

  const spentByCategory: Record<string, number> = { payroll };
  for (const e of monthExpenses) spentByCategory[e.category] = (spentByCategory[e.category] ?? 0) + e.amount;
  for (const x of pendingRecurring) spentByCategory[x.r.category] = (spentByCategory[x.r.category] ?? 0) + x.r.amount;

  const totalCost = Object.values(spentByCategory).reduce((a, b) => a + b, 0);
  const monthIncome = income.filter((i) => inMonth(i.issuedOn) && (i.status === "invoiced" || i.status === "paid"));
  const scheduledMonth = income.filter((i) => inMonth(i.issuedOn) && i.status === "scheduled").reduce((a, i) => a + i.amount, 0);
  const incomeTotal = monthIncome.reduce((a, i) => a + i.amount, 0);
  const collected = income.filter((i) => i.status === "paid" && i.paidOn && inMonth(i.paidOn)).reduce((a, i) => a + i.amount, 0);
  const receivable = income.filter((i) => i.status === "invoiced").reduce((a, i) => a + i.amount, 0);
  const margin = incomeTotal - totalCost;

  const budgetFor = (y: number, m: number, list: typeof budgets) =>
    Object.fromEntries(list.filter((b) => b.month === m).map((b) => [b.category, b.amount])) as Record<string, number>;
  const budget = budgetFor(year, month, budgets);
  const prevBudget = budgetFor(Number(prevYm.slice(0, 4)), Number(prevYm.slice(5, 7)), prevBudgets);
  const budgetTotal = Object.values(budget).reduce((a, b) => a + b, 0);

  /* ----------------------------------------------------- 12-month --- */
  const trend = months12.map((m) => {
    const ex = expenses.filter((e) => e.spentOn.slice(0, 7) === m).reduce((a, e) => a + e.amount, 0);
    const pend = m === ym ? pendingRecurring.reduce((a, x) => a + x.r.amount, 0) : 0;
    const inc = income
      .filter((i) => i.issuedOn.slice(0, 7) === m && (i.status === "invoiced" || i.status === "paid"))
      .reduce((a, i) => a + i.amount, 0);
    return { m, cost: ex + pend + payrollFor(m).reduce((a, r) => a + r.cost, 0), income: inc };
  });
  const trendMax = Math.max(1, ...trend.flatMap((t) => [t.cost, t.income]));

  /* ---------------------------------------------- profitability --- */
  const hourlyCost = new Map(people.map((r) => [r.user.id, r.full / 160]));
  const projectOf = new Map(requests.map((r) => [r.id, r.projectId]));
  const billed = (i: (typeof income)[number]) => i.status === "invoiced" || i.status === "paid";
  const laborOf = (list: typeof entries) => list.reduce((a, e) => a + (e.minutes / 60) * (hourlyCost.get(e.userId) ?? 0), 0);
  const row = (inc: typeof income, ex: typeof expenses, work: typeof entries) => {
    const real = inc.filter(billed).reduce((a, i) => a + i.amount, 0);
    const scheduled = inc.filter((i) => i.status === "scheduled").reduce((a, i) => a + i.amount, 0);
    const direct = ex.reduce((a, e) => a + e.amount, 0);
    const labor = laborOf(work);
    const minutes = work.reduce((a, e) => a + e.minutes, 0);
    const cost = direct + labor;
    return { real, scheduled, direct, labor, minutes, cost, margin: real - cost, projected: real + scheduled - cost };
  };
  const clientOfProject = new Map(projects.map((p) => [p.id, p.clientId]));
  const profit = projects
    .map((p) => ({
      p,
      ...row(
        income.filter((i) => i.projectId === p.id),
        expenses.filter((e) => e.projectId === p.id),
        entries.filter((e) => projectOf.get(e.requestId) === p.id),
      ),
    }))
    .filter((x) => x.real || x.scheduled || x.cost)
    .sort((a, b) => b.real + b.scheduled - (a.real + a.scheduled));
  const profitByClient = clients
    .map((c) => ({
      c,
      ...row(
        income.filter((i) => i.clientId === c.id),
        expenses.filter((e) => e.clientId === c.id || (e.projectId && clientOfProject.get(e.projectId) === c.id)),
        entries.filter((e) => clientOfProject.get(projectOf.get(e.requestId) ?? "") === c.id),
      ),
    }))
    .filter((x) => x.real || x.scheduled || x.cost)
    .sort((a, b) => b.real + b.scheduled - (a.real + a.scheduled));

  /* ------------------------------------------- income vs general costs --- */
  // Every month that has income on record (plus the one on screen), so the
  // total lines up with the per-client tables below.
  const thisMonth = today.slice(0, 7);
  // Pending installments of an inactive client are no longer expected.
  const inactiveClients = new Set(clients.filter((c) => !c.active).map((c) => c.id));
  const counted = income.filter((i) => !(i.status === "scheduled" && i.clientId && inactiveClients.has(i.clientId)));
  const incomeMonths = counted.filter((i) => i.status !== "quoted").map((i) => i.issuedOn.slice(0, 7));
  const spanFrom = [ym, ...incomeMonths].sort()[0];
  const spanTo = [ym, ...incomeMonths].sort().at(-1)!;
  const spanLength =
    Number(spanTo.slice(0, 4)) * 12 + Number(spanTo.slice(5, 7)) - (Number(spanFrom.slice(0, 4)) * 12 + Number(spanFrom.slice(5, 7))) + 1;
  const balanceRows = lastMonths(spanTo, Math.min(spanLength, 24)).map((m) => {
    const ex = expenses.filter((e) => e.spentOn.slice(0, 7) === m);
    const paid = new Set(ex.map((e) => e.recurringId).filter(Boolean));
    // Fixed costs not registered yet still count from the current month on.
    const due = m >= thisMonth ? recurring.filter((r) => dueInMonth(r, m) && !paid.has(r.id)).reduce((a, r) => a + r.amount, 0) : 0;
    const inc = counted.filter((i) => i.issuedOn.slice(0, 7) === m);
    // Budget not spent yet counts as planned spend; payroll already comes from HR.
    const [by, bm] = m.split("-").map(Number);
    const plan = budgetFor(by, bm, by === year ? budgets : by === year + 1 ? nextBudgets : by === year - 1 ? lastYearBudgets : []);
    const spentIn = (cat: string) =>
      ex.filter((e) => e.category === cat).reduce((a, e) => a + e.amount, 0) +
      (m >= thisMonth ? recurring.filter((r) => r.category === cat && dueInMonth(r, m) && !paid.has(r.id)).reduce((a, r) => a + r.amount, 0) : 0);
    const budgeted = Object.entries(plan)
      .filter(([cat]) => cat !== "payroll")
      .reduce((a, [cat, amount]) => a + Math.max(0, amount - spentIn(cat)), 0);
    const apps = appsMonth(appData.apps, appData.plans, appData.subscribers, m);
    return {
      apps: apps.reduce((a, x) => a + x.mrr, 0),
      appsCost: apps.reduce((a, x) => a + x.cost, 0),
      budgeted,
      m,
      billed: inc.filter(billed).reduce((a, i) => a + i.amount, 0),
      scheduled: inc.filter((i) => i.status === "scheduled").reduce((a, i) => a + i.amount, 0),
      payroll: payrollFor(m).reduce((a, r) => a + r.cost, 0),
      fixed: ex.filter((e) => e.recurringId).reduce((a, e) => a + e.amount, 0) + due,
      other: ex.filter((e) => !e.recurringId).reduce((a, e) => a + e.amount, 0),
    };
  });

  /* ------------------------------------------------- subscription apps --- */
  const appsNow = appsMonth(appData.apps, appData.plans, appData.subscribers, ym);
  const appsMrr = appsNow.reduce((a, x) => a + x.mrr, 0);
  const appsCost = appsNow.reduce((a, x) => a + x.cost, 0);
  const appsSubs = appsNow.reduce((a, x) => a + x.subscribers, 0);
  const appsHistory = lastMonths(ym, 6).map((m) => ({
    m,
    byApp: new Map(appsMonth(appData.apps, appData.plans, appData.subscribers, m).map((x) => [x.app.id, x.mrr])),
  }));

  const href = (patch: { tab?: string; month?: string }) => {
    const q = new URLSearchParams({ tab, month: ym, ...patch });
    return `/work/finance?${q}`;
  };
  const projectLabel = (id: string | null) => {
    const p = projects.find((x) => x.id === id);
    return p ? `${clients.find((c) => c.id === p.clientId)?.name ?? ""} · ${p.name}` : "General";
  };
  const upcoming = upcomingPayments(recurring, today, 30);

  return (
    <div className="mx-auto max-w-[110rem]">
      <PageHeader title="Finanzas" description="Nómina, gastos fijos, gastos del mes, ingresos y presupuesto de OR-K.">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-md border border-border p-0.5 text-sm">
            {TABS.map((t) => (
              <Link
                key={t.id}
                href={href({ tab: t.id })}
                className={cn("rounded px-3 py-1", t.id === tab ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground")}
              >
                {t.label}
              </Link>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1 text-sm">
            <Button size="icon" variant="ghost" className="size-8" asChild>
              <Link href={href({ month: prevYm })} aria-label="Mes anterior">
                <ChevronLeft className="size-4" />
              </Link>
            </Button>
            <span className="min-w-36 text-center font-medium capitalize">{monthLabel(ym)}</span>
            <Button size="icon" variant="ghost" className="size-8" asChild>
              <Link href={href({ month: nextMonth })} aria-label="Mes siguiente">
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </PageHeader>

      {tab === "summary" ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard
              label="Costo fijo mensual (nómina + fijos)"
              value={short(payrollRunRate + fixedMonthly)}
              hint={`Nómina ${short(payrollRunRate)} · fijos ${short(fixedMonthly)}${
                upcomingHires.length ? ` · incluye a ${upcomingHires.map((x) => x.user.name.split(" ")[0]).join(", ")}, que ingresa después` : ""
              }`}
            />
            <MetricCard
              label="Costos del mes"
              value={short(totalCost)}
              hint={budgetTotal ? `${Math.round((totalCost / budgetTotal) * 100)}% del presupuesto (${short(budgetTotal)})` : "Sin presupuesto definido"}
              tone={budgetTotal && totalCost > budgetTotal ? "warn" : "default"}
            />
            <MetricCard
              label="Facturado en el mes"
              value={short(incomeTotal)}
              hint={`Cobrado ${short(collected)} · por cobrar ${short(receivable)}${scheduledMonth ? ` · cuotas programadas ${short(scheduledMonth)}` : ""}`}
              tone="positive"
            />
            <MetricCard
              label="Margen del mes"
              value={`${margin < 0 ? "−" : ""}${short(Math.abs(margin))}`}
              hint={incomeTotal ? `${Math.round((margin / incomeTotal) * 100)}% sobre lo facturado` : "Registra ingresos para ver el margen"}
              tone={margin < 0 ? "warn" : "positive"}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
            <Card className="gap-0 py-0">
              <CardHeader className="border-b border-border py-3">
                <CardTitle className="text-sm">En qué se va la plata · {monthLabel(ym, { month: "long" })}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2.5 p-4">
                {FIN_CATEGORIES.filter((c) => (spentByCategory[c.id] ?? 0) > 0 || (budget[c.id] ?? 0) > 0)
                  .sort((a, b) => (spentByCategory[b.id] ?? 0) - (spentByCategory[a.id] ?? 0))
                  .map((c) => {
                    const spent = spentByCategory[c.id] ?? 0;
                    const bud = budget[c.id] ?? 0;
                    const max = Math.max(spent, bud, 1);
                    const over = bud > 0 && spent > bud;
                    return (
                      <div key={c.id} className="grid grid-cols-[12rem_1fr_7rem] items-center gap-3 text-sm" title={`${c.label}: ${money(spent)}${bud ? ` de ${money(bud)} presupuestados` : ""}`}>
                        <span className="truncate text-muted-foreground">{c.label}</span>
                        <div className="relative h-2.5 rounded-full bg-muted">
                          <div className={cn("h-full rounded-full", over ? "bg-tone-warn" : "bg-primary/70")} style={{ width: `${(spent / max) * 100}%` }} />
                          {bud ? <span className="absolute -top-0.5 h-3.5 w-0.5 rounded bg-foreground/60" style={{ left: `${(bud / max) * 100}%` }} /> : null}
                        </div>
                        <span className="text-right font-mono text-xs tabular-nums">
                          {short(spent)}
                          {bud ? <span className="text-muted-foreground"> / {short(bud)}</span> : null}
                        </span>
                      </div>
                    );
                  })}
                <p className="mt-1 text-xs text-muted-foreground">
                  Incluye gastos registrados, la nómina estimada de RR. HH. y los gastos fijos que vencen este mes aunque aún no se registren.
                  La rayita marca el presupuesto.
                </p>
              </CardContent>
            </Card>

            <Card className="gap-2 p-4 text-sm">
              <p className="font-medium">Próximos pagos (30 días)</p>
              {upcoming.length ? (
                <ul className="flex flex-col gap-2">
                  {upcoming.map(({ r, due }) => {
                    const done = expenses.some((e) => e.recurringId === r.id && e.spentOn.slice(0, 7) === due.slice(0, 7));
                    return (
                      <li key={`${r.id}-${due}`} className="flex items-center gap-2">
                        <span className="w-12 shrink-0 text-xs text-muted-foreground">{day(due)}</span>
                        <span className={cn("min-w-0 flex-1 truncate", done && "text-muted-foreground line-through")}>{r.name}</span>
                        <span className="font-mono text-xs">{short(r.amount)}</span>
                        {done ? null : (
                          <ExpenseDialog
                            clients={clients}
                            projects={projects}
                            preset={{ category: r.category, vendor: r.vendor, description: r.name, amount: r.amount, spentOn: due, recurringId: r.id }}
                            trigger={
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs">
                                Pagar
                              </Button>
                            }
                          />
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">Agrega tus gastos fijos para ver aquí lo que viene.</p>
              )}
            </Card>
          </div>

          <Card className="gap-0 py-0">
            <CardHeader className="border-b border-border py-3">
              <CardTitle className="flex items-center justify-between text-sm">
                Últimos 12 meses
                <span className="flex items-center gap-3 text-xs font-normal text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-primary/70" /> Costos</span>
                  <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-tone-info" /> Ingresos</span>
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex h-44 items-end gap-2">
                {trend.map((t) => (
                  <Link key={t.m} href={href({ month: t.m })} className="group flex flex-1 flex-col items-center gap-1" title={`${monthLabel(t.m)} · costos ${money(t.cost)} · ingresos ${money(t.income)}`}>
                    <div className="flex h-36 w-full items-end justify-center gap-0.5">
                      <div className="w-1/2 max-w-4 rounded-t bg-primary/70 group-hover:bg-primary" style={{ height: `${(t.cost / trendMax) * 100}%` }} />
                      <div className="w-1/2 max-w-4 rounded-t bg-tone-info group-hover:opacity-80" style={{ height: `${(t.income / trendMax) * 100}%` }} />
                    </div>
                    <span className={cn("text-[11px] capitalize", t.m === ym ? "font-semibold text-foreground" : "text-muted-foreground")}>
                      {monthLabel(t.m, { month: "short" })}
                    </span>
                  </Link>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">La nómina de meses anteriores se estima con las fichas actuales de RR. HH.</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "expenses" ? (
        <Card className="gap-0 py-0">
          <CardHeader className="border-b border-border py-3">
            <CardTitle className="flex items-center justify-between text-sm">
              Gastos de {monthLabel(ym, { month: "long" })} · {short(monthExpenses.reduce((a, e) => a + e.amount, 0))}
              <ExpenseDialog clients={clients} projects={projects} />
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            {monthExpenses.length ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Fecha</th>
                    <th className="px-3 py-2 font-medium">Categoría</th>
                    <th className="px-3 py-2 font-medium">Detalle</th>
                    <th className="px-3 py-2 font-medium">Proyecto</th>
                    <th className="px-3 py-2 text-right font-medium">Valor</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {monthExpenses.map((e) => (
                    <tr key={e.id} className="hover:bg-muted/40">
                      <td className="px-4 py-2.5 whitespace-nowrap">{day(e.spentOn)}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{CATEGORY_LABEL[e.category] ?? e.category}</td>
                      <td className="px-3 py-2.5">
                        {e.description || e.vendor}
                        {e.vendor && e.description ? <span className="text-muted-foreground"> · {e.vendor}</span> : null}
                        {!e.paid ? <span className="ml-2 rounded bg-tone-warn/15 px-1.5 py-0.5 text-xs text-tone-warn">Por pagar</span> : null}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{projectLabel(e.projectId)}</td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums">{money(e.amount)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end gap-1">
                          {e.receiptUrl ? (
                            <Button size="icon" variant="ghost" className="size-7" asChild>
                              <a href={e.receiptUrl} target="_blank" rel="noreferrer" aria-label="Ver comprobante">
                                <FileText className="size-3.5" />
                              </a>
                            </Button>
                          ) : null}
                          <DeleteButton kind="expense" id={e.id} label={e.description || "gasto"} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="p-4 text-sm text-muted-foreground">Sin gastos registrados en este mes.</p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "fixed" ? (
        <div className="flex flex-col gap-4">
          <Card className="gap-0 py-0">
            <CardHeader className="border-b border-border py-3">
              <CardTitle className="flex items-center justify-between text-sm">
                Gastos fijos · {short(fixedMonthly)} al mes
                <RecurringDialog />
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              {recurring.length ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="px-4 py-2 font-medium">Gasto</th>
                      <th className="px-3 py-2 font-medium">Categoría</th>
                      <th className="px-3 py-2 font-medium">Frecuencia</th>
                      <th className="px-3 py-2 font-medium">Día</th>
                      <th className="px-3 py-2 text-right font-medium">Valor</th>
                      <th className="px-3 py-2 text-right font-medium">Equivale al mes</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recurring.map((r) => (
                      <tr key={r.id} className={cn("hover:bg-muted/40", !r.active && "text-muted-foreground")}>
                        <td className="px-4 py-2.5">
                          {r.name}
                          {r.vendor ? <span className="text-muted-foreground"> · {r.vendor}</span> : null}
                          {!r.active ? <span className="ml-2 text-xs">(inactivo)</span> : null}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">{CATEGORY_LABEL[r.category] ?? r.category}</td>
                        <td className="px-3 py-2.5">{FREQ_LABEL[r.frequency]}</td>
                        <td className="px-3 py-2.5">{r.dueDay}</td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums">{money(r.amount)}</td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums">{money(Math.round(monthlyEquivalent(r)))}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex justify-end gap-1">
                            <RecurringDialog cost={r} />
                            <DeleteButton kind="recurring" id={r.id} label={r.name} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="p-4 text-sm text-muted-foreground">
                  Agrega arriendo, servicios, internet, software, contador, seguros… todo lo que se paga cada mes, trimestre o año.
                </p>
              )}
            </CardContent>
          </Card>
          <Card className="gap-2 p-4 text-sm">
            <p className="font-medium">
              Nómina (desde Recursos humanos) · {short(payrollRunRate)} al mes
              <span className="font-normal text-muted-foreground"> · en {monthLabel(ym, { month: "long" })}: {short(payroll)}</span>
            </p>
            {active.length ? (
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {active.map((x) => {
                  const r = payrollRows.find((y) => y.user.id === x.user.id);
                  return (
                    <li key={x.user.id} className="flex justify-between gap-2">
                      <Link href={`/work/hr/${x.user.id}`} className="truncate hover:text-primary">
                        {x.user.name}
                      </Link>
                      <span className="text-right font-mono text-xs">
                        {money(x.full)}
                        {!r ? (
                          <span className="block font-sans text-muted-foreground">ingresa {day(x.file.startDate!)}</span>
                        ) : r.partial ? (
                          <span className="block font-sans text-muted-foreground">
                            este mes {money(r.cost)} ({r.days} días)
                          </span>
                        ) : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">Completa salario y contrato en las fichas de Recursos humanos para incluir la nómina.</p>
            )}
          </Card>
        </div>
      ) : null}

      {tab === "income" ? (
        <Card className="gap-0 py-0">
          <CardHeader className="border-b border-border py-3">
            <CardTitle className="flex items-center justify-between text-sm">
              Ingresos · facturado {short(incomeTotal)} en {monthLabel(ym, { month: "long" })} · por cobrar {short(receivable)}
              <IncomeDialog clients={clients} projects={projects} />
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            {income.length ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Fecha</th>
                    <th className="px-3 py-2 font-medium">Cliente / proyecto</th>
                    <th className="px-3 py-2 font-medium">Concepto</th>
                    <th className="px-3 py-2 font-medium">Estado</th>
                    <th className="px-3 py-2 text-right font-medium">Valor</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {income.map((i) => {
                    const c = clients.find((x) => x.id === i.clientId);
                    return (
                      <tr key={i.id} className="hover:bg-muted/40">
                        <td className="px-4 py-2.5 whitespace-nowrap">{day(i.issuedOn)}</td>
                        <td className="px-3 py-2.5">
                          <span className="flex items-center gap-2">
                            {c ? <ClientMark name={c.name} logoText={c.logoText} color={c.accentColor} size={18} /> : null}
                            {c?.name ?? "—"}
                            {i.projectId ? <span className="text-muted-foreground">· {projects.find((p) => p.id === i.projectId)?.name}</span> : null}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          {i.description}
                          {i.invoiceNumber ? <span className="text-muted-foreground"> · {i.invoiceNumber}</span> : null}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs",
                              i.status === "paid" && "bg-tone-positive/15 text-tone-positive",
                              i.status === "invoiced" && "bg-tone-warn/15 text-tone-warn",
                              (i.status === "quoted" || i.status === "scheduled") && "bg-muted text-muted-foreground",
                            )}
                          >
                            {i.status === "paid"
                              ? `Pagado ${i.paidOn ? day(i.paidOn) : ""}`
                              : i.status === "invoiced"
                                ? "Por cobrar"
                                : i.status === "scheduled"
                                  ? "Programado"
                                  : "Cotizado"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums">{money(i.amount)}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex justify-end gap-1">
                            <MarkPaidButton income={i} />
                            <IncomeDialog clients={clients} projects={projects} income={i} />
                            <DeleteButton kind="income" id={i.id} label={i.description || "ingreso"} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p className="p-4 text-sm text-muted-foreground">Registra cotizaciones, facturas y pagos de tus clientes para ver el margen.</p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "budget" ? (
        <Card className="gap-0 py-0">
          <CardHeader className="border-b border-border py-3">
            <CardTitle className="text-sm capitalize">Presupuesto de {monthLabel(ym)}</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <BudgetEditor
              key={ym}
              year={year}
              month={month}
              current={budget}
              previous={prevBudget}
              payroll={payroll}
              fixedByCategory={fixedByCategory}
            />
          </CardContent>
        </Card>
      ) : null}

      {tab === "apps" ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard label={`Ingreso mensual (MRR) · ${monthLabel(ym, { month: "long" })}`} value={money(Math.round(appsMrr))} tone="positive" hint="Suscripciones de las apps lanzadas" />
            <MetricCard label="Ingreso anual (ARR)" value={short(appsMrr * 12)} hint="MRR × 12" />
            <MetricCard label="Suscriptores" value={appsSubs.toLocaleString("es-CO")} hint={`${appData.apps.filter((a) => a.status === "live").length} app(s) lanzada(s)`} />
            <MetricCard
              label="Ganancia de las apps"
              value={`${appsMrr - appsCost < 0 ? "−" : ""}${money(Math.round(Math.abs(appsMrr - appsCost)))}`}
              hint={`Costo de operación ${money(Math.round(appsCost))} al mes`}
              tone={appsMrr - appsCost < 0 ? "warn" : "positive"}
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Registra cada mes cuántos suscriptores tiene cada plan. Si un mes no tiene dato se usa el último registrado (marcado como estimado).
            </p>
            <AppDialog />
          </div>

          {appsNow.length ? (
            appsNow.map((x) => (
              <Card key={x.app.id} className="gap-0 py-0">
                <CardHeader className="border-b border-border py-3">
                  <CardTitle className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: x.app.accentColor }} />
                      <span className="truncate">{x.app.name}</span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-normal",
                          x.app.status === "live" ? "bg-tone-positive/15 text-tone-positive" : "bg-muted text-muted-foreground",
                        )}
                      >
                        {APP_STATUS_LABEL[x.app.status]}
                        {x.app.launchOn ? ` · ${x.app.status === "live" ? "desde" : "lanza"} ${day(x.app.launchOn)}` : ""}
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      <PlanDialog appId={x.app.id} />
                      <AppDialog app={x.app} />
                      <DeleteAppItem kind="app" id={x.app.id} label={x.app.name} />
                    </span>
                  </CardTitle>
                  {x.app.description ? <p className="text-xs text-muted-foreground">{x.app.description}</p> : null}
                </CardHeader>
                <CardContent className="overflow-x-auto p-0">
                  {x.rows.length ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-muted-foreground">
                          <th className="px-4 py-2 font-medium">Plan</th>
                          <th className="px-3 py-2 text-right font-medium">Precio</th>
                          <th className="px-3 py-2 text-right font-medium">Suscriptores en {monthLabel(ym, { month: "long" })}</th>
                          <th className="px-3 py-2 text-right font-medium">Ingreso mensual</th>
                          <th className="px-4 py-2" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {x.rows.map((r) => (
                          <tr key={r.plan.id} className={cn("hover:bg-muted/40", !r.plan.active && "text-muted-foreground")}>
                            <td className="px-4 py-2">
                              {r.plan.name}
                              {!r.plan.active ? <span className="ml-2 text-xs">(inactivo)</span> : null}
                            </td>
                            <td className="px-3 py-2 text-right font-mono tabular-nums">
                              {money(r.plan.price)} <span className="text-xs text-muted-foreground">/{r.plan.billing === "annual" ? "año" : "mes"}</span>
                            </td>
                            <td className="px-3 py-2">
                              <SubscribersInput key={`${r.plan.id}-${ym}-${r.count}`} ym={ym} planId={r.plan.id} count={r.count} estimated={r.estimated} />
                              {r.estimated ? <span className="block text-right text-xs text-muted-foreground">estimado del último mes</span> : null}
                            </td>
                            <td className="px-3 py-2 text-right font-mono tabular-nums">{money(Math.round(r.mrr))}</td>
                            <td className="px-4 py-2">
                              <div className="flex justify-end gap-1">
                                <PlanDialog appId={x.app.id} plan={r.plan} />
                                <DeleteAppItem kind="plan" id={r.plan.id} label={r.plan.name} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="p-4 text-sm text-muted-foreground">Agrega los planes de suscripción de esta app (por ejemplo Básico y Pro) con su precio.</p>
                  )}
                  <div className="flex flex-wrap items-end justify-between gap-4 border-t border-border px-4 py-3 text-sm">
                    <div className="flex gap-6">
                      <span>
                        <span className="block text-xs text-muted-foreground">Ingreso mensual</span>
                        <span className="font-mono">{money(Math.round(x.mrr))}</span>
                      </span>
                      <span>
                        <span className="block text-xs text-muted-foreground">Costo de operación</span>
                        <span className="font-mono">{money(Math.round(x.cost))}</span>
                      </span>
                      <span>
                        <span className="block text-xs text-muted-foreground">Ganancia</span>
                        <span className={cn("font-mono", x.net < 0 ? "text-tone-warn" : "text-tone-positive")}>
                          {x.net < 0 ? "−" : ""}
                          {money(Math.round(Math.abs(x.net)))}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-end gap-1.5" title="Ingreso mensual de los últimos 6 meses">
                      {appsHistory.map((h) => {
                        const v = h.byApp.get(x.app.id) ?? 0;
                        const max = Math.max(1, ...appsHistory.map((y) => y.byApp.get(x.app.id) ?? 0));
                        return (
                          <span key={h.m} className="flex flex-col items-center gap-1" title={`${monthLabel(h.m)} · ${money(Math.round(v))}`}>
                            <span className="flex h-10 w-4 items-end rounded-sm bg-muted">
                              <span className="w-full rounded-sm bg-tone-positive/60" style={{ height: `${(v / max) * 100}%` }} />
                            </span>
                            <span className={cn("text-[10px] capitalize", h.m === ym ? "text-foreground" : "text-muted-foreground")}>
                              {monthLabel(h.m, { month: "short" })}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="p-6 text-sm text-muted-foreground">
              Aún no hay aplicaciones. Crea la primera con su costo de operación y luego agrega sus planes de suscripción.
            </Card>
          )}
          <p className="text-xs text-muted-foreground">
            Los planes anuales se reparten en 12 meses. Las apps solo facturan cuando están lanzadas y desde su fecha de lanzamiento; su costo
            de operación cuenta salvo que estén pausadas. Este ingreso también se suma en Rentabilidad → ¿Cuánto gano?
          </p>
        </div>
      ) : null}

      {tab === "projects" ? (
        <div className="flex flex-col gap-4">
          <CashBalance
            rows={balanceRows}
            ym={ym}
            monthHref={(m) => href({ month: m })}
            breakEven={payrollRunRate + fixedMonthly}
            inactiveFixed={recurring.filter((r) => !r.active).length}
            fixedHref={href({ tab: "fixed" })}
          />
          <ProfitTable
            title="Rentabilidad por cliente"
            rows={profitByClient.map((x) => ({
              id: x.c.id,
              href: `/work/clients/${x.c.id}`,
              label: x.c.active ? x.c.name : `${x.c.name} (inactivo)`,
              mark: x.c,
              ...x,
            }))}
          />
          <ProfitTable
            title="Rentabilidad por proyecto"
            rows={profit.map((x) => ({ id: x.p.id, href: `/work/projects/${x.p.id}`, label: projectLabel(x.p.id), ...x }))}
            empty="Asocia ingresos o gastos a un proyecto (o registra horas en sus tareas) para verlo aquí."
          />
          <p className="text-xs text-muted-foreground">
            Real = facturado o cobrado − (gastos directos + costo de horas). Proyectado suma además las cuotas programadas. Costo de
            horas = horas registradas × (costo mensual de la persona en RR. HH. ÷ 160 h). Últimos 12 meses y cuotas de los próximos 12.
          </p>
        </div>
      ) : null}
    </div>
  );
}

type BalanceRow = {
  m: string;
  billed: number;
  scheduled: number;
  /** Subscription revenue of OR-K's own apps. */
  apps: number;
  payroll: number;
  /** Fixed costs plus what the apps cost to run. */
  fixed: number;
  appsCost: number;
  other: number;
  budgeted: number;
};

/** Company-wide: of what comes in, how much goes to general costs and how much is left. */
function CashBalance({
  rows,
  ym,
  monthHref,
  breakEven,
  inactiveFixed,
  fixedHref,
}: {
  rows: BalanceRow[];
  ym: string;
  monthHref: (m: string) => string;
  breakEven: number;
  inactiveFixed: number;
  fixedHref: string;
}) {
  const signed = (n: number) => `${n < 0 ? "−" : ""}${money(Math.round(Math.abs(n)))}`;
  const costOf = (r: BalanceRow) => r.payroll + r.fixed + r.appsCost + r.other + r.budgeted;
  const incomeOf = (r: BalanceRow) => r.billed + r.scheduled + r.apps;
  const sum = (f: (r: BalanceRow) => number) => rows.reduce((a, r) => a + f(r), 0);
  const total = {
    billed: sum((r) => r.billed),
    scheduled: sum((r) => r.scheduled),
    payroll: sum((r) => r.payroll),
    fixed: sum((r) => r.fixed),
    other: sum((r) => r.other),
    budgeted: sum((r) => r.budgeted),
    apps: sum((r) => r.apps),
    appsCost: sum((r) => r.appsCost),
  };
  const income = total.billed + total.scheduled + total.apps;
  const cost = total.payroll + total.fixed + total.appsCost + total.other + total.budgeted;
  const profit = income - cost;
  const span = rows.length > 1 ? `${monthLabel(rows[0].m)} – ${monthLabel(rows.at(-1)!.m)}` : monthLabel(ym);

  const month = rows.find((r) => r.m === ym) ?? { m: ym, billed: 0, scheduled: 0, apps: 0, payroll: 0, fixed: 0, appsCost: 0, other: 0, budgeted: 0 };
  const mIncome = incomeOf(month);
  const mCost = costOf(month);
  const mProfit = mIncome - mCost;
  const scale = Math.max(1, mIncome, mCost);
  const pct = (n: number) => `${(n / scale) * 100}%`;
  const ofIncome = (n: number) => (mIncome ? `${Math.round((n / mIncome) * 100)}%` : "—");
  const parts = [
    { label: "Nómina", value: month.payroll, className: "bg-primary/80" },
    { label: "Gastos fijos", value: month.fixed + month.appsCost, className: "bg-primary/50" },
    { label: "Otros gastos", value: month.other, className: "bg-primary/25" },
    { label: "Presupuestado", value: month.budgeted, className: "bg-primary/10" },
    { label: mProfit < 0 ? "Pérdida" : "Ganancia", value: Math.abs(mProfit), className: mProfit < 0 ? "bg-tone-warn" : "bg-tone-positive" },
  ];

  let running = 0;
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b border-border py-3">
        <CardTitle className="text-sm">
          ¿Cuánto gano? <span className="font-normal capitalize text-muted-foreground">· {span}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 p-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard label="Entra en el período" value={money(income)} hint={`Facturado ${money(total.billed)} · programado ${money(total.scheduled)}${total.apps ? ` · aplicaciones ${money(Math.round(total.apps))}` : ""}`} />
          <MetricCard
            label="Gastos generales del período"
            value={money(cost)}
            hint={`Nómina ${money(total.payroll)} · fijos ${money(total.fixed + total.appsCost)} · otros ${money(total.other)} · presupuestado ${money(total.budgeted)}`}
          />
          <MetricCard
            label="Ganancia del período"
            value={signed(profit)}
            hint={
              income
                ? profit < 0
                  ? `Los gastos superan lo que entra en ${money(Math.round(-profit))}`
                  : `Te quedan $${Math.round((profit / income) * 100)} de cada $100 que entran`
                : "Registra ingresos para ver la ganancia"
            }
            tone={profit < 0 ? "warn" : "positive"}
          />
          <MetricCard
            label="Punto de equilibrio"
            value={money(Math.round(breakEven))}
            hint="Lo que hay que facturar cada mes para cubrir nómina y gastos fijos activos"
          />
        </div>

        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">Mes</th>
                <th className="px-3 py-2 text-right font-medium">Clientes</th>
                <th className="px-3 py-2 text-right font-medium">Aplicaciones</th>
                <th className="px-3 py-2 text-right font-medium">Entra (total)</th>
                <th className="px-3 py-2 text-right font-medium">Nómina</th>
                <th className="px-3 py-2 text-right font-medium">Gastos fijos</th>
                <th className="px-3 py-2 text-right font-medium">Otros</th>
                <th className="px-3 py-2 text-right font-medium" title="Presupuesto que aún no se ha gastado en el mes (sin nómina)">Presupuestado</th>
                <th className="px-3 py-2 text-right font-medium">Gastos generales</th>
                <th className="px-3 py-2 text-right font-medium">Ganancia</th>
                <th className="px-3 py-2 text-right font-medium">Acumulado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => {
                const inc = incomeOf(r);
                const net = inc - costOf(r);
                running += net;
                return (
                  <tr key={r.m} className={cn("hover:bg-muted/40", r.m === ym && "bg-muted/60 font-medium")}>
                    <td className="px-3 py-2 capitalize">
                      <Link href={monthHref(r.m)} className="hover:text-primary">
                        {monthLabel(r.m, { month: "short", year: "numeric" })}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-muted-foreground">
                      {money(r.billed + r.scheduled)}
                      {r.scheduled && !r.billed ? <span className="ml-1 text-xs">prog.</span> : null}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-muted-foreground">{money(Math.round(r.apps))}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{money(Math.round(inc))}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-muted-foreground">{money(Math.round(r.payroll))}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-muted-foreground">{money(Math.round(r.fixed + r.appsCost))}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-muted-foreground">{money(Math.round(r.other))}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-muted-foreground">{money(Math.round(r.budgeted))}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{money(Math.round(costOf(r)))}</td>
                    <td className={cn("px-3 py-2 text-right font-mono tabular-nums", net < 0 ? "text-tone-warn" : "text-tone-positive")}>{signed(net)}</td>
                    <td className={cn("px-3 py-2 text-right font-mono tabular-nums", running < 0 ? "text-tone-warn" : "text-tone-positive")}>
                      {signed(running)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 text-sm">
          <p className="text-xs font-medium capitalize">{monthLabel(ym)} en detalle</p>
          <div className="grid grid-cols-[6rem_1fr_9rem] items-center gap-3">
            <span className="text-muted-foreground">Entra</span>
            <div className="flex h-3 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-tone-info" style={{ width: pct(month.billed) }} title={`Facturado ${money(month.billed)}`} />
              <div className="h-full bg-tone-info/40" style={{ width: pct(month.scheduled) }} title={`Programado ${money(month.scheduled)}`} />
              <div className="h-full bg-tone-positive/60" style={{ width: pct(month.apps) }} title={`Aplicaciones ${money(Math.round(month.apps))}`} />
            </div>
            <span className="text-right font-mono text-xs tabular-nums">{money(mIncome)}</span>
          </div>
          <div className="grid grid-cols-[6rem_1fr_9rem] items-center gap-3">
            <span className="text-muted-foreground">Se reparte en</span>
            <div className="flex h-3 overflow-hidden rounded-full bg-muted">
              {parts.map((p) => (
                <div key={p.label} className={cn("h-full", p.className)} style={{ width: pct(p.value) }} title={`${p.label} ${money(p.value)}`} />
              ))}
            </div>
            <span className="text-right font-mono text-xs tabular-nums">{money(Math.max(mIncome, mCost))}</span>
          </div>
          <ul className="grid gap-x-6 gap-y-1.5 pl-[6.75rem] text-xs sm:grid-cols-2 lg:grid-cols-4">
            {parts.map((p) => (
              <li key={p.label} className="flex items-center gap-2">
                <span className={cn("size-2 shrink-0 rounded-sm", p.className)} />
                <span className="text-muted-foreground">{p.label}</span>
                <span className="ml-auto font-mono tabular-nums">
                  {money(Math.round(p.value))} <span className="text-muted-foreground">· {ofIncome(p.value)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">
          El período va del primer al último mes con ingresos registrados (facturados o programados). Los gastos de meses futuros se
          estiman con la nómina de RR. HH. y los gastos fijos activos. &quot;Presupuestado&quot; es lo que pusiste en Presupuesto y aún no se ha
          gastado: al registrar el gasto real, este reemplaza al presupuesto.
          {inactiveFixed ? (
            <>
              {" "}
              Hay {inactiveFixed} gasto{inactiveFixed === 1 ? "" : "s"} fijo{inactiveFixed === 1 ? "" : "s"} marcado
              {inactiveFixed === 1 ? "" : "s"} como inactivo{inactiveFixed === 1 ? "" : "s"} que no cuenta{inactiveFixed === 1 ? "" : "n"}:{" "}
              <Link href={fixedHref} className="text-primary hover:underline">
                revisar gastos fijos
              </Link>
              .
            </>
          ) : null}
        </p>
      </CardContent>
    </Card>
  );
}

type ProfitRow = {
  id: string;
  href: string;
  label: string;
  mark?: { name: string; logoText: string; accentColor: string };
  real: number;
  scheduled: number;
  direct: number;
  labor: number;
  minutes: number;
  margin: number;
  projected: number;
};

function ProfitTable({ title, rows, empty }: { title: string; rows: ProfitRow[]; empty?: string }) {
  const pct = (m: number, base: number) => (base ? ` · ${Math.round((m / base) * 100)}%` : "");
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b border-border py-3">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        {rows.length ? (
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">{title.endsWith("cliente") ? "Cliente" : "Proyecto"}</th>
                <th className="px-3 py-2 text-right font-medium">Facturado</th>
                <th className="px-3 py-2 text-right font-medium">Programado</th>
                <th className="px-3 py-2 text-right font-medium">Gastos directos</th>
                <th className="px-3 py-2 text-right font-medium">Horas del equipo</th>
                <th className="px-3 py-2 text-right font-medium">Margen real</th>
                <th className="px-4 py-2 text-right font-medium">Margen proyectado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((x) => (
                <tr key={x.id} className="hover:bg-muted/40">
                  <td className="px-4 py-2.5">
                    <Link href={x.href} className="flex items-center gap-2 hover:text-primary">
                      {x.mark ? <ClientMark name={x.mark.name} logoText={x.mark.logoText} color={x.mark.accentColor} size={20} /> : null}
                      {x.label}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">{money(x.real)}</td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted-foreground">{money(x.scheduled)}</td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">{money(x.direct)}</td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                    {money(Math.round(x.labor))} <span className="text-xs text-muted-foreground">({Math.round(x.minutes / 6) / 10} h)</span>
                  </td>
                  <td className={cn("px-3 py-2.5 text-right font-mono tabular-nums", x.margin < 0 ? "text-tone-warn" : "text-tone-positive")}>
                    {money(Math.round(x.margin))}
                    <span className="text-xs">{pct(x.margin, x.real)}</span>
                  </td>
                  <td className={cn("px-4 py-2.5 text-right font-mono tabular-nums", x.projected < 0 ? "text-tone-warn" : "text-tone-positive")}>
                    {money(Math.round(x.projected))}
                    <span className="text-xs">{pct(x.projected, x.real + x.scheduled)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="p-4 text-sm text-muted-foreground">{empty ?? "Sin movimientos todavía."}</p>
        )}
      </CardContent>
    </Card>
  );
}
