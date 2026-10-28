import { Suspense } from "react";
import { BackLink } from "@/components/work/shell/nav-trail";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getClient,
  getProject,
  getMe,
  getRecurrences,
  getRequestsByProject,
  getTimeEntries,
  getUsers,
} from "@/lib/work/data";
import { Timeline } from "@/components/work/projects/timeline";
import { seesAll } from "@/lib/work/people";
import { Recurrences } from "@/components/work/projects/recurrences";
import { SaveTemplateButton } from "@/components/work/projects/save-template";
import { Progress } from "@/components/work/ui/progress";
import { formatHours, toHours } from "@/lib/work/hours";
import { fullDate, relativeTime } from "@/lib/work/format";
import { PageHeader, ClientMark } from "@/components/work/shared/page-header";
import { PersonInline } from "@/components/work/shared/people";
import { RequestList } from "@/components/work/requests/request-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/work/ui/card";
import { Button } from "@/components/work/ui/button";
import { Pencil, Plus, Repeat } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const p = await getProject(id);
  return { title: `${p?.name ?? "Proyecto"} · OR-K WORK` };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const [client, requests, users, recurrences] = await Promise.all([
    getClient(project.clientId),
    getRequestsByProject(id),
    getUsers(),
    getRecurrences(id),
  ]);
  const entries = await getTimeEntries({ requestIds: requests.map((r) => r.id) });
  const canManage = seesAll((await getMe())?.role);
  const spent = entries.reduce((a, e) => a + e.minutes, 0);
  const hoursByPerson = Object.entries(
    entries.reduce<Record<string, number>>((acc, e) => ({ ...acc, [e.userId]: (acc[e.userId] ?? 0) + e.minutes }), {}),
  ).sort((a, b) => b[1] - a[1]);
  const userById = (uid: string) => users.find((u) => u.id === uid);
  const team = project.teamIds.map(userById).filter(Boolean) as typeof users;
  const clients = client ? [client] : [];

  const activity = requests
    .flatMap((r) =>
      r.activity.map((a) => ({ ...a, requestId: r.id, requestTitle: r.title })),
    )
    .sort((a, b) => +new Date(b.at) - +new Date(a.at))
    .slice(0, 12);

  return (
    <div className="mx-auto max-w-7xl">
      <Suspense fallback={null}>
        <BackLink fallbackHref={"/work/projects"} fallbackLabel={"Proyectos"} />
      </Suspense>

      <PageHeader
        title={
          <span className="flex items-center gap-2.5">
            {client ? (
              <ClientMark
                name={client.name}
                logoText={client.logoText}
                color={client.accentColor}
                size={26}
              />
            ) : null}
            {project.name}
          </span>
        }
        description={`${client?.name} · meta ${fullDate(project.targetDate)}`}
        actions={
          canManage ? <>
            <SaveTemplateButton projectId={project.id} projectName={project.name} brief={project.brief} />
            <Button size="sm" variant="outline" asChild>
              <Link href={`/work/projects/${project.id}/edit`}>
                <Pencil className="size-4" /> Editar
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={`/work/requests/new?project=${project.id}`}>
                <Plus className="size-4" /> Solicitud
              </Link>
            </Button>
          </> : null
        }
      />

      <Card className="mb-4 gap-0 overflow-hidden py-0">
        <CardHeader className="border-b border-border py-3">
          <CardTitle className="flex items-center justify-between text-sm">
            Línea de tiempo
            <span className="text-xs font-normal text-muted-foreground">
              {canManage ? "Arrastra una barra para moverla · estira sus bordes para cambiar inicio o entrega" : "Cronograma del proyecto"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Timeline
            requests={requests.filter((r) => r.state !== "archived")}
            users={users}
            projectStart={project.startDate}
            projectEnd={project.targetDate}
            editable={canManage}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_19rem]">
        <div className="flex flex-col gap-4">
          <Card className="p-4 text-sm">
            <p className="text-muted-foreground">{project.brief}</p>
          </Card>

          {canManage ? <Card className="gap-0 py-0">
            <CardHeader className="border-b border-border py-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Repeat className="size-4 text-muted-foreground" /> Tareas recurrentes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <Recurrences projectId={project.id} recurrences={recurrences} users={users} />
            </CardContent>
          </Card> : null}

          <Card className="gap-0 py-0">
            <CardHeader className="border-b border-border py-3">
              <CardTitle className="text-sm">
                Solicitudes · {requests.length}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {requests.length ? (
                <RequestList
                  requests={requests}
                  clients={clients}
                  users={users}
                  showClient={false}
                />
              ) : (
                <p className="p-4 text-sm text-muted-foreground">
                  Sin solicitudes.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="gap-0 py-0">
            <CardHeader className="border-b border-border py-3">
              <CardTitle className="text-sm">Actividad</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ol className="flex flex-col gap-2 text-sm">
                {activity.map((a) => (
                  <li key={a.id} className="text-muted-foreground">
                    <Link
                      href={`/work/requests/${a.requestId}`}
                      className="text-foreground hover:underline"
                    >
                      {userById(a.actorId)?.name.split(" ")[0]}
                    </Link>{" "}
                    {a.verb} {a.detail} · {relativeTime(a.at)}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        <aside className="flex flex-col gap-4">
          <Card className="gap-2 p-4 text-sm">
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground">Horas</span>
              <span className="font-mono">
                {toHours(spent)} h{project.budgetHours ? ` / ${project.budgetHours} h` : ""}
              </span>
            </div>
            {project.budgetHours ? (
              <>
                <Progress value={Math.min(100, (toHours(spent) / project.budgetHours) * 100)} />
                <p className={toHours(spent) > project.budgetHours ? "text-xs text-tone-warn" : "text-xs text-muted-foreground"}>
                  {toHours(spent) > project.budgetHours
                    ? `Presupuesto superado por ${Math.round((toHours(spent) - project.budgetHours) * 10) / 10} h`
                    : `Quedan ${Math.round((project.budgetHours - toHours(spent)) * 10) / 10} h del presupuesto`}
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Define un presupuesto de horas en Editar.</p>
            )}
            {hoursByPerson.length ? (
              <ul className="mt-1 flex flex-col gap-1.5">
                {hoursByPerson.map(([uid, min]) => {
                  const u = userById(uid);
                  return (
                    <li key={uid} className="flex items-center justify-between gap-2">
                      {u ? <PersonInline person={u} size="xs" muted /> : <span>—</span>}
                      <span className="font-mono text-xs">{formatHours(min)}</span>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </Card>
          <Card className="gap-3 p-4 text-sm">
            <p className="text-muted-foreground">Lead</p>
            {userById(project.leadId) ? (
              <PersonInline person={userById(project.leadId)!} size="xs" />
            ) : null}
            <p className="mt-2 text-muted-foreground">Equipo</p>
            <div className="flex flex-col gap-2">
              {team.map((u) => (
                <PersonInline key={u.id} person={u} size="xs" muted />
              ))}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
