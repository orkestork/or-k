import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock, Cake, PartyPopper, Plane, Users } from "lucide-react";
import { getAbsences, getHrProfiles, getMe, getPayrollParams, getPendingAbsences, getUsers } from "@/lib/work/data";
import { PayrollParamsForm } from "@/components/work/hr/payroll-params";
import { SalarySimulator } from "@/components/work/hr/salary-simulator";
import { ABSENCE_LABEL, isHr, seesPay, vacationBalance } from "@/lib/work/people";
import { PageHeader } from "@/components/work/shared/page-header";
import { MetricCard } from "@/components/work/shared/metric-card";
import { PersonAvatar } from "@/components/work/shared/people";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/work/ui/card";
import { PendingRequests } from "@/components/work/hr/pending-requests";
import { CONTRACT_LABEL, money } from "@/components/work/hr/labels";
import { monthlyCost } from "@/lib/work/payroll";

export const metadata: Metadata = { title: "Recursos humanos · OR-K WORK" };

const ymd = (d: Date) => d.toLocaleDateString("en-CA");
const day = (s: string) => new Date(`${s}T12:00:00`).toLocaleDateString("es", { day: "numeric", month: "short" });
const years = (from: string) => {
  const ms = Date.now() - Date.parse(`${from}T12:00:00`);
  if (ms < 0) return `Ingresa ${day(from)}`;
  const y = Math.floor(ms / (365.25 * 86_400_000));
  const m = Math.floor((ms % (365.25 * 86_400_000)) / (30.44 * 86_400_000));
  return y ? `${y} a ${m} m` : `${m} m`;
};

export default async function HrPage() {
  const me = await getMe();
  if (!me) redirect("/work/login");
  // Everyone else gets their own file; managers still decide on their team's requests from it.
  if (!isHr(me.role) && !seesPay(me.role)) redirect(`/work/hr/${me.id}`);

  const [users, files, pendingReqs, absences, payroll] = await Promise.all([
    getUsers(),
    getHrProfiles(),
    getPendingAbsences(),
    getAbsences(),
    getPayrollParams(),
  ]);
  const staff = users.filter((u) => u.active && u.role !== "client");
  const fileOf = (id: string) => files.find((f) => f.userId === id);
  const today = ymd(new Date());
  const in60 = ymd(new Date(Date.now() + 60 * 86_400_000));
  const month = new Date().getMonth();

  const offToday = staff.filter((u) => u.away);
  const offSoon = absences
    .filter((a) => a.status === "approved" && a.startOn > today && a.startOn <= ymd(new Date(Date.now() + 14 * 86_400_000)))
    .sort((a, b) => a.startOn.localeCompare(b.startOn));
  const expiring = files
    .filter((f) => f.endDate && f.endDate >= today && f.endDate <= in60)
    .sort((a, b) => a.endDate!.localeCompare(b.endDate!));
  const birthdays = files
    .filter((f) => f.birthDate && new Date(`${f.birthDate}T12:00:00`).getMonth() === month)
    .sort((a, b) => a.birthDate!.slice(5).localeCompare(b.birthDate!.slice(5)));
  const anniversaries = files
    .filter((f) => f.startDate && new Date(`${f.startDate}T12:00:00`).getMonth() === month && f.startDate.slice(0, 4) < today.slice(0, 4))
    .sort((a, b) => a.startDate!.slice(5).localeCompare(b.startDate!.slice(5)));
  const userById = (id: string) => users.find((u) => u.id === id);
  const costOf = (id: string) => {
    const f = fileOf(id);
    return f ? monthlyCost(f, payroll)?.company ?? 0 : 0;
  };
  const payrollTotal = staff.reduce((a, u) => a + costOf(u.id), 0);
  const missing = staff.filter((u) => !fileOf(u.id)?.startDate);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Recursos humanos" description="Fichas del equipo, contratos, vacaciones y permisos." />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Personas activas" value={staff.length} />
        <MetricCard label="Fuera hoy" value={offToday.length} tone={offToday.length ? "warn" : "default"} />
        <MetricCard label="Solicitudes por aprobar" value={pendingReqs.length} tone={pendingReqs.length ? "warn" : "positive"} />
        <MetricCard label="Contratos que vencen (60 días)" value={expiring.length} tone={expiring.length ? "warn" : "positive"} />
      </div>
      {payrollTotal ? (
        <p className="-mt-2 mb-4 text-sm text-muted-foreground">
          Nómina mensual estimada (empleados + contratistas): <span className="font-medium text-foreground">{money(payrollTotal)}</span>
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="flex flex-col gap-4">
          <Card className="gap-0 py-0">
            <CardHeader className="border-b border-border py-3">
              <CardTitle className="text-sm">Solicitudes de vacaciones y permisos · {pendingReqs.length}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-1">
              <PendingRequests requests={pendingReqs} users={users} />
            </CardContent>
          </Card>

          <Card className="gap-0 py-0">
            <CardHeader className="border-b border-border py-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="size-4 text-muted-foreground" /> Equipo
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Persona</th>
                    <th className="px-3 py-2 font-medium">Contrato</th>
                    <th className="px-3 py-2 font-medium">Ingreso</th>
                    <th className="px-3 py-2 font-medium">Antigüedad</th>
                    <th className="px-3 py-2 text-right font-medium">Vacaciones disp.</th>
                    <th className="px-3 py-2 text-right font-medium">Costo mensual</th>
                    <th className="px-4 py-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {staff.map((u) => {
                    const f = fileOf(u.id);
                    const bal = vacationBalance(f?.startDate ?? null, absences.filter((a) => a.userId === u.id));
                    return (
                      <tr key={u.id} className="hover:bg-muted/40">
                        <td className="px-4 py-2.5">
                          <Link href={`/work/hr/${u.id}`} className="flex items-center gap-2 hover:text-primary">
                            <PersonAvatar person={u} size="sm" />
                            <span>
                              <span className="block">{u.name}</span>
                              <span className="block text-xs text-muted-foreground">{u.title}</span>
                            </span>
                          </Link>
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">{f ? CONTRACT_LABEL[f.contractType] : "—"}</td>
                        <td className="px-3 py-2.5">{f?.startDate ? day(f.startDate) + " " + f.startDate.slice(0, 4) : "—"}</td>
                        <td className="px-3 py-2.5">{f?.startDate ? years(f.startDate) : "—"}</td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums">{f?.startDate ? `${bal.available} d` : "—"}</td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums">{costOf(u.id) ? money(costOf(u.id)) : "—"}</td>
                        <td className="px-4 py-2.5">
                          {u.away ? (
                            <span className="rounded-full bg-tone-warn/15 px-2 py-0.5 text-xs text-tone-warn">
                              {ABSENCE_LABEL[u.away.kind]}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Activo</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {missing.length ? (
                <p className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
                  {missing.length} persona(s) sin fecha de ingreso: completa su ficha para calcular vacaciones y antigüedad.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <aside className="flex flex-col gap-4">
          <Card className="gap-2 p-4">
            <p className="text-sm font-medium">Parámetros de nómina {payroll.year}</p>
            <PayrollParamsForm params={payroll} canEdit={isHr(me.role)} />
          </Card>
          {seesPay(me.role) ? (
            <Card className="p-4">
              <SalarySimulator params={payroll} />
            </Card>
          ) : null}
          <SideList icon={Plane} title="Fuera hoy y próximos 14 días" empty="Todo el equipo disponible.">
            {offToday.map((u) => (
              <Row key={u.id} who={u} text={`${ABSENCE_LABEL[u.away!.kind]} hasta ${day(u.away!.until)}`} />
            ))}
            {offSoon.map((a) => {
              const u = userById(a.userId);
              return u ? <Row key={a.id} who={u} text={`${ABSENCE_LABEL[a.kind]} desde ${day(a.startOn)}`} /> : null;
            })}
          </SideList>
          <SideList icon={CalendarClock} title="Contratos por vencer" empty="Ninguno en los próximos 60 días.">
            {expiring.map((f) => {
              const u = userById(f.userId);
              return u ? <Row key={f.userId} who={u} text={`${CONTRACT_LABEL[f.contractType]} · vence ${day(f.endDate!)}`} /> : null;
            })}
          </SideList>
          <SideList icon={Cake} title="Cumpleaños del mes" empty="Ninguno este mes.">
            {birthdays.map((f) => {
              const u = userById(f.userId);
              return u ? <Row key={f.userId} who={u} text={day(f.birthDate!)} /> : null;
            })}
          </SideList>
          <SideList icon={PartyPopper} title="Aniversarios del mes" empty="Ninguno este mes.">
            {anniversaries.map((f) => {
              const u = userById(f.userId);
              return u ? (
                <Row key={f.userId} who={u} text={`${Number(today.slice(0, 4)) - Number(f.startDate!.slice(0, 4))} año(s) · ${day(f.startDate!)}`} />
              ) : null;
            })}
          </SideList>
        </aside>
      </div>
    </div>
  );
}

function SideList({ icon: Icon, title, empty, children }: { icon: typeof Users; title: string; empty: string; children: React.ReactNode }) {
  const items = (Array.isArray(children) ? children.flat() : [children]).filter(Boolean);
  return (
    <Card className="gap-2 p-4 text-sm">
      <p className="flex items-center gap-1.5 font-medium">
        <Icon className="size-4 text-muted-foreground" /> {title}
      </p>
      {items.length ? <ul className="flex flex-col gap-2">{items}</ul> : <p className="text-xs text-muted-foreground">{empty}</p>}
    </Card>
  );
}

function Row({ who, text }: { who: { id: string; name: string; color: string; avatarUrl?: string | null }; text: string }) {
  return (
    <li>
      <Link href={`/work/hr/${who.id}`} className="flex items-center gap-2 hover:text-primary">
        <PersonAvatar person={who} size="xs" />
        <span className="min-w-0 flex-1 truncate">{who.name}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{text}</span>
      </Link>
    </li>
  );
}
