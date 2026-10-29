import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, CheckCircle2, Inbox, ListTodo } from "lucide-react";
import { getCurrentUser } from "@/lib/work/auth/session";
import {
  getClients,
  getDashboard,
  getUsers,
} from "@/lib/work/data";
import { PageHeader } from "@/components/work/shared/page-header";
import { MetricCard } from "@/components/work/shared/metric-card";
import { RequestList } from "@/components/work/requests/request-list";
import { PersonAvatar } from "@/components/work/shared/people";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/work/ui/card";

export const metadata: Metadata = { title: "Home · OR-K WORK" };

export default async function HomePage() {
  const [user, dash, clients, users] = await Promise.all([
    getCurrentUser(),
    getDashboard(),
    getClients(),
    getUsers(),
  ]);

  const firstName = user?.name.split(" ")[0] ?? "";
  const me = users.find((u) => u.id === user?.id);
  const covering = users.filter((u) => u.away?.substituteId && u.away.substituteId === user?.id);
  const day = (ymd: string) => new Date(`${ymd}T12:00:00`).toLocaleDateString("es", { day: "numeric", month: "long" });

  const sections: {
    key: string;
    title: string;
    icon: typeof ListTodo;
    items: typeof dash.today;
    empty: string;
  }[] = [
    { key: "today", title: "Hoy", icon: ListTodo, items: dash.today, empty: "Nada asignado a ti hoy." },
    { key: "attention", title: "Requiere tu atención", icon: Inbox, items: dash.needsAttention, empty: "Nada esperando por ti." },
    { key: "approval", title: "Esperando aprobación", icon: CheckCircle2, items: dash.awaitingApproval, empty: "Sin piezas en revisión." },
    { key: "due", title: "Vencen pronto", icon: CalendarClock, items: dash.dueSoon, empty: "Sin deadlines en los próximos 3 días." },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={`Hola, ${firstName}`}
        description="Tu resumen de operación de hoy."
      />

      {me?.away ? (
        <div className="mb-4 rounded-md border border-tone-warn/40 bg-tone-warn/10 px-4 py-2.5 text-sm">
          Estás marcado como <span className="font-medium">off</span> hasta el {day(me.away.until)}
          {me.away.substituteId ? ` · te reemplaza ${users.find((u) => u.id === me.away!.substituteId)?.name ?? "alguien del equipo"}` : ""}.
        </div>
      ) : null}
      {covering.map((u) => (
        <div key={u.id} className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-primary/40 bg-primary/5 px-4 py-2.5 text-sm">
          <PersonAvatar person={u} size="xs" />
          <span>
            Estás reemplazando a <Link href={`/work/team/${u.id}`} className="font-medium hover:underline">{u.name}</Link> hasta el{" "}
            {day(u.away!.until)}: te llegan sus avisos y puedes aprobar por él/ella.
          </span>
          <Link href={`/work/requests?assignee=${u.id}&scope=open`} className="ml-auto text-primary hover:underline">
            Ver sus tareas
          </Link>
        </div>
      ))}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Proyectos activos" value={dash.counts.activeProjects} href="/work/projects" />
        <MetricCard label="Solicitudes activas" value={dash.counts.activeRequests} href="/work/requests?scope=open" />
        <MetricCard
          label="En aprobación"
          value={dash.counts.awaitingApproval}
          tone="warn"
          href="/work/requests?scope=review"
        />
        <MetricCard
          label="Atrasadas"
          value={dash.counts.overdue}
          tone={dash.counts.overdue > 0 ? "warn" : "positive"}
          href="/work/requests?scope=overdue"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {sections.map((s) => (
          <Card key={s.key} className="gap-0 overflow-hidden py-0">
            <CardHeader className="flex flex-row items-center gap-2 border-b border-border py-3">
              <s.icon className="size-4 text-muted-foreground" />
              <CardTitle className="text-sm">{s.title}</CardTitle>
              <span className="ml-auto font-mono text-xs text-muted-foreground">
                {s.items.length}
              </span>
            </CardHeader>
            <CardContent className="p-0">
              {s.items.length ? (
                <RequestList
                  requests={s.items.slice(0, 5)}
                  clients={clients}
                  users={users}
                />
              ) : (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  {s.empty}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {dash.completedThisWeek.length ? (
        <Card className="mt-4 gap-0 overflow-hidden py-0">
          <CardHeader className="flex flex-row items-center gap-2 border-b border-border py-3">
            <CheckCircle2 className="size-4 text-tone-positive" />
            <CardTitle className="text-sm">Completado esta semana</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <RequestList
              requests={dash.completedThisWeek}
              clients={clients}
              users={users}
            />
          </CardContent>
        </Card>
      ) : null}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Datos de demostración ·{" "}
        <Link href="/work/requests" className="underline hover:text-foreground">
          ver todas las solicitudes
        </Link>
      </p>
    </div>
  );
}
