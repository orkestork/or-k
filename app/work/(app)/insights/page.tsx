import type { Metadata } from "next";
import Link from "next/link";
import { getClients, getRequests, getTimeEntries, getUsers, requireManager } from "@/lib/work/data";
import { formatHours, toHours } from "@/lib/work/hours";
import { HAPPY_PATH, WORKFLOW, isOverdue } from "@/lib/work/workflow";
import { stageDurations } from "@/lib/work/insights";
import { cn } from "@/lib/work/utils";
import { SearchFilter } from "@/components/work/shared/search-filter";
import { clientOptions } from "@/components/work/shared/filter-options";
import { PageHeader, ClientMark } from "@/components/work/shared/page-header";
import { MetricCard } from "@/components/work/shared/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/work/ui/card";
import type { Request } from "@/types/work/domain";

export const metadata: Metadata = { title: "Insights · OR-K WORK" };

const isActive = (r: Request) => !["completed", "archived"].includes(r.state);
const isDone = (r: Request) => ["completed", "published"].includes(r.state);
const avgRounds = (rs: Request[]) => {
  const withRounds = rs.filter((r) => r.roundsUsed > 0);
  return withRounds.reduce((a, r) => a + r.roundsUsed, 0) / Math.max(1, withRounds.length);
};

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { client: clientId } = await searchParams;
  await requireManager();
  const [all, clients, users, entries] = await Promise.all([getRequests(), getClients(), getUsers(), getTimeEntries()]);
  const selected = clients.find((c) => c.id === clientId);
  const requests = selected ? all.filter((r) => r.clientId === selected.id) : all;

  const active = requests.filter(isActive);
  const reqClient = new Map(all.map((r) => [r.id, r.clientId]));
  const scopedEntries = selected ? entries.filter((e) => reqClient.get(e.requestId) === selected.id) : entries;
  const hoursTotal = scopedEntries.reduce((a, e) => a + e.minutes, 0);
  const hoursByPerson = users
    .map((u) => ({ user: u, minutes: scopedEntries.filter((e) => e.userId === u.id).reduce((a, e) => a + e.minutes, 0) }))
    .filter((x) => x.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);
  const maxPerson = Math.max(1, ...hoursByPerson.map((x) => x.minutes));
  const rounds = avgRounds(requests);
  const overRounds = requests.filter((r) => r.roundsUsed > r.roundsIncluded).length;
  const overdue = requests.filter(isOverdue).length;
  const completed = requests.filter(isDone).length;

  const byStage = HAPPY_PATH.map((s) => ({
    state: s,
    label: WORKFLOW[s].label,
    count: requests.filter((r) => r.state === s).length,
  }));
  const maxStage = Math.max(1, ...byStage.map((b) => b.count));

  const durations = stageDurations(requests);
  const timing = HAPPY_PATH.filter((s) => durations.has(s)).map((s) => {
    const d = durations.get(s)!;
    return { state: s, label: WORKFLOW[s].label, days: d.days / d.stays, stays: d.stays };
  });
  const maxDays = Math.max(1, ...timing.map((t) => t.days));

  const perClient = clients
    .map((c) => {
      const rs = all.filter((r) => r.clientId === c.id);
      return {
        client: c,
        total: rs.length,
        active: rs.filter(isActive).length,
        overdue: rs.filter(isOverdue).length,
        waiting: rs.filter((r) => r.state === "client_review").length,
        done: rs.filter(isDone).length,
        rounds: avgRounds(rs),
        minutes: entries.filter((e) => reqClient.get(e.requestId) === c.id).reduce((a, e) => a + e.minutes, 0),
      };
    })
    .filter((row) => row.total > 0)
    .sort((a, b) => b.active - a.active);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Insights"
        description={selected ? `Métricas de operación de ${selected.name}.` : "Métricas de operación de todos los clientes."}
      >
        <SearchFilter
          param="client"
          label="Cliente"
          allLabel="Todos los clientes"
          placeholder="Buscar cliente…"
          options={clientOptions(clients)}
        />
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Solicitudes activas" value={active.length} />
        <MetricCard label="Completadas" value={completed} tone="positive" />
        <MetricCard label="Promedio de rondas" value={rounds.toFixed(1)} tone={rounds > 1.5 ? "warn" : "default"} />
        <MetricCard label="Atrasadas" value={overdue} tone={overdue ? "warn" : "positive"} />
      </div>

      {hoursByPerson.length ? (
        <Card className="mb-4 gap-0 py-0">
          <CardHeader className="border-b border-border py-3">
            <CardTitle className="flex items-center justify-between text-sm">
              Horas registradas por persona
              <span className="font-mono text-xs font-normal text-muted-foreground">{formatHours(hoursTotal)} en total</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 p-4">
            {hoursByPerson.map(({ user, minutes }) => (
              <div key={user.id} className="flex items-center gap-3 text-sm" title={`${user.name}: ${formatHours(minutes)}`}>
                <span className="w-44 shrink-0 truncate text-muted-foreground">{user.name}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary/70" style={{ width: `${(minutes / maxPerson) * 100}%` }} />
                </div>
                <span className="w-20 text-right font-mono text-xs tabular-nums">{formatHours(minutes)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {!selected && perClient.length ? (
        <Card className="mb-4 gap-0 py-0">
          <CardHeader className="border-b border-border py-3">
            <CardTitle className="text-sm">Por cliente</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Cliente</th>
                  <th className="px-3 py-2 text-right font-medium">Activas</th>
                  <th className="px-3 py-2 text-right font-medium">Atrasadas</th>
                  <th className="px-3 py-2 text-right font-medium">En revisión del cliente</th>
                  <th className="px-3 py-2 text-right font-medium">Completadas</th>
                  <th className="px-3 py-2 text-right font-medium">Rondas prom.</th>
                  <th className="px-4 py-2 text-right font-medium">Horas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {perClient.map((row) => (
                  <tr key={row.client.id} className="hover:bg-muted/40">
                    <td className="px-4 py-2.5">
                      <Link href={`/work/insights?client=${row.client.id}`} className="flex items-center gap-2 hover:text-primary">
                        <ClientMark name={row.client.name} logoText={row.client.logoText} color={row.client.accentColor} size={20} />
                        {row.client.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">{row.active}</td>
                    <td className={cn("px-3 py-2.5 text-right font-mono tabular-nums", row.overdue && "text-tone-warn")}>
                      {row.overdue}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">{row.waiting}</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">{row.done}</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">{row.rounds.toFixed(1)}</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">{toHours(row.minutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="gap-0 py-0">
          <CardHeader className="border-b border-border py-3">
            <CardTitle className="text-sm">Solicitudes por etapa</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 p-4">
            {byStage.map((b) => (
              <div
                key={b.state}
                className="group flex items-center gap-3 rounded text-sm hover:bg-muted/40"
                title={`${b.label}: ${b.count} solicitud(es)`}
              >
                <span className="w-32 shrink-0 text-muted-foreground group-hover:text-foreground">{b.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary/70" style={{ width: `${(b.count / maxStage) * 100}%` }} />
                </div>
                <span className="w-6 text-right font-mono text-xs tabular-nums">{b.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="gap-0 py-0">
          <CardHeader className="border-b border-border py-3">
            <CardTitle className="text-sm">Tiempo promedio por etapa (días)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 p-4">
            {timing.length ? (
              timing.map((t) => (
                <div
                  key={t.state}
                  className="group flex items-center gap-3 rounded text-sm hover:bg-muted/40"
                  title={`${t.label}: ${t.days.toFixed(1)} días en promedio (${t.stays} paso(s) por esta etapa)`}
                >
                  <span className="w-32 shrink-0 text-muted-foreground group-hover:text-foreground">{t.label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary/70" style={{ width: `${(t.days / maxDays) * 100}%` }} />
                  </div>
                  <span className="w-8 text-right font-mono text-xs tabular-nums">{t.days.toFixed(1)}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Aún no hay datos: se calcula cuando las solicitudes empiezan a avanzar de etapa.
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {overRounds} solicitud(es) superaron sus rondas incluidas.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
