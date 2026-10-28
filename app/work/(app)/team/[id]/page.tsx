import { Suspense } from "react";
import { BackLink } from "@/components/work/shell/nav-trail";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Mail } from "lucide-react";
import { getAbsences, getClients, getMe, getProjects, getRequests, getTimeEntries, getUser, getUsers, isAdmin } from "@/lib/work/data";
import { AbsenceManager } from "@/components/work/team/absence-manager";
import { AwayBadge } from "@/components/work/team/away-badge";
import { supabaseConfigured } from "@/lib/work/supabase/env";
import { involves, isHr } from "@/lib/work/people";
import { WORKFLOW_ORDER, WORKFLOW } from "@/lib/work/workflow";
import { fullDate } from "@/lib/work/format";
import { formatHours } from "@/lib/work/hours";
import { PageHeader, ClientMark } from "@/components/work/shared/page-header";
import { PersonAvatar, PersonInline } from "@/components/work/shared/people";
import { RequestList } from "@/components/work/requests/request-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/work/ui/card";
import { ROLE_DUTIES, ROLE_LABEL, roleArea } from "@/components/work/settings/roles";
import { MemberEditor } from "@/components/work/settings/member-editor";
import { AvatarUpload } from "@/components/work/settings/avatar-upload";
import { RemoveMemberButton } from "@/components/work/settings/team-admin";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const u = await getUser(id);
  return { title: `${u?.name ?? "Integrante"} · OR-K WORK` };
}

export default async function TeamMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [member, me, requests, clients, projects, users] = await Promise.all([
    getUser(id),
    getMe(),
    getRequests(),
    getClients(),
    getProjects(),
    getUsers(),
  ]);
  if (!member) notFound();
  const manager = member.managerId ? users.find((u) => u.id === member.managerId) : undefined;
  const absences = await getAbsences(member.id);
  const backup = member.backupId ? users.find((u) => u.id === member.backupId) : undefined;
  const covering = users.filter((u) => u.away?.substituteId === member.id);
  const reports = users.filter((u) => u.managerId === member.id && u.active);
  const entries = await getTimeEntries({ userId: member.id });
  const weekAgo = new Date(Date.now() - 6 * 86_400_000).toLocaleDateString("en-CA");
  const weekMinutes = entries.filter((e) => e.workedOn >= weekAgo).reduce((a, e) => a + e.minutes, 0);
  const totalMinutes = entries.reduce((a, e) => a + e.minutes, 0);

  const canManage = supabaseConfigured && isAdmin(me);
  const isSelf = me?.id === member.id;
  const stages = WORKFLOW_ORDER.filter((s) => WORKFLOW[s].owner === member.role);
  const open = requests.filter(
    (r) => involves(r, member.id) && !["completed", "archived"].includes(r.state),
  );
  const subtasks = requests
    .filter((r) => !["completed", "archived"].includes(r.state))
    .flatMap((r) =>
      (r.subtasks ?? [])
        .filter((st) => !st.done && st.assigneeId === member.id)
        .map((st) => ({ ...st, requestId: r.id, requestTitle: r.title })),
    )
    .sort((x, y) => (x.dueOn ?? "9999").localeCompare(y.dueOn ?? "9999"));
  const theirClients = clients.filter(
    (c) => c.accountManagerId === member.id || c.teamIds.includes(member.id),
  );
  const theirProjects = projects.filter((p) => p.leadId === member.id || p.teamIds.includes(member.id));

  return (
    <div className="mx-auto max-w-6xl">
      <Suspense fallback={null}>
        <BackLink fallbackHref={"/work/team"} fallbackLabel={"Equipo"} />
      </Suspense>

      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <PersonAvatar person={member} size="md" />
            {member.name}
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{member.title || ROLE_LABEL[member.role]}</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              {ROLE_LABEL[member.role]}
            </span>
            <AwayBadge person={member} users={users} />
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{roleArea(member.role)}</span>
            {!member.active ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">Inactivo</span>
            ) : null}
            <a href={`mailto:${member.email}`} className="inline-flex items-center gap-1 hover:text-foreground">
              <Mail className="size-3.5" /> {member.email}
            </a>
          </span>
        }
        actions={canManage && !isSelf ? <RemoveMemberButton id={member.id} name={member.name} redirectTo="/work/team" /> : null}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-4">
          <Card className="gap-0 py-0">
            <CardHeader className="border-b border-border py-3">
              <CardTitle className="text-sm">Funciones</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 p-4 text-sm">
              <ul className="flex flex-col gap-2">
                {ROLE_DUTIES[member.role].map((d) => (
                  <li key={d} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    {d}
                  </li>
                ))}
              </ul>
              {stages.length ? (
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                    Etapas del flujo a su cargo
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {stages.map((s) => (
                      <Link
                        key={s}
                        href={`/work/requests?state=${s}`}
                        className="rounded-full border border-border px-2.5 py-1 text-xs hover:border-primary/40"
                      >
                        {WORKFLOW[s].label}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
              {canManage || isSelf ? (
                <div className="border-t border-border pt-4">
                  <AvatarUpload person={member} />
                </div>
              ) : null}
              {canManage ? (
                <div className="border-t border-border pt-4">
                  <MemberEditor member={member} isSelf={isSelf} users={users} />
                  {isSelf ? (
                    <p className="mt-2 text-xs text-muted-foreground">No puedes cambiar tu propio rol.</p>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="gap-0 py-0">
            <CardHeader className="border-b border-border py-3">
              <CardTitle className="text-sm">Ausencias y reemplazo</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <AbsenceManager
                person={member}
                absences={absences}
                users={users}
                canEdit={supabaseConfigured && (isSelf || isAdmin(me) || isHr(me?.role))}
                canDecide={!isSelf && (isHr(me?.role) || member.managerId === me?.id)}
                asRequest={isSelf && !isHr(me?.role)}
              />
            </CardContent>
          </Card>

          <Card className="gap-0 py-0">
            <CardHeader className="border-b border-border py-3">
              <CardTitle className="text-sm">Tareas abiertas · {open.length}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {open.length ? (
                <RequestList requests={open} clients={clients} users={[member]} />
              ) : (
                <p className="p-4 text-sm text-muted-foreground">Sin tareas asignadas en este momento.</p>
              )}
            </CardContent>
          </Card>
          <Card className="gap-0 py-0">
            <CardHeader className="border-b border-border py-3">
              <CardTitle className="text-sm">Subtareas pendientes · {subtasks.length}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {subtasks.length ? (
                <ul className="divide-y divide-border">
                  {subtasks.map((st) => (
                    <li key={st.id}>
                      <Link
                        href={`/work/requests/${st.requestId}`}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/40"
                      >
                        <span className="min-w-0 flex-1 truncate">{st.title}</span>
                        <span className="hidden truncate text-xs text-muted-foreground sm:block">
                          <span className="font-mono">{st.requestId}</span> · {st.requestTitle}
                        </span>
                        {st.dueOn ? (
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {fullDate(`${st.dueOn}T12:00:00`)}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="p-4 text-sm text-muted-foreground">Sin subtareas pendientes.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="flex flex-col gap-4">
          <Card className="gap-3 p-4 text-sm">
            <div>
              <p className="mb-1.5 text-muted-foreground">Área</p>
              <p>{roleArea(member.role)}</p>
            </div>
            <div>
              <p className="mb-1.5 text-muted-foreground">Reporta a</p>
              {manager ? (
                <Link href={`/work/team/${manager.id}`} className="hover:text-primary">
                  <PersonInline person={manager} size="xs" />
                </Link>
              ) : (
                <p className="text-xs text-muted-foreground">Nadie · cabeza del organigrama</p>
              )}
            </div>
            <div>
              <p className="mb-1.5 text-muted-foreground">Reemplazo por defecto</p>
              {backup ? (
                <Link href={`/work/team/${backup.id}`} className="hover:text-primary">
                  <PersonInline person={backup} size="xs" />
                </Link>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {manager ? `Su jefe directo (${manager.name.split(" ")[0]})` : "Sin definir"}
                </p>
              )}
            </div>
            <div>
              <p className="mb-1.5 text-muted-foreground">Su equipo · {reports.length}</p>
              {reports.length ? (
                <ul className="flex flex-col gap-1.5">
                  {reports.map((u) => (
                    <li key={u.id}>
                      <Link href={`/work/team/${u.id}`} className="hover:text-primary">
                        <PersonInline person={u} size="xs" muted />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">Nadie a cargo.</p>
              )}
            </div>
            {covering.length ? (
              <div>
                <p className="mb-1.5 text-muted-foreground">Está reemplazando a</p>
                <ul className="flex flex-col gap-1.5">
                  {covering.map((u) => (
                    <li key={u.id}>
                      <Link href={`/work/team/${u.id}`} className="hover:text-primary">
                        <PersonInline person={u} size="xs" muted />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <Link href="/work/team?view=org" className="text-xs text-primary hover:underline">
              Ver organigrama completo
            </Link>
          </Card>
          <Card className="gap-1 p-4 text-sm">
            <p className="text-muted-foreground">Horas de {member.name.split(" ")[0]}</p>
            <p className="font-mono text-lg">{formatHours(weekMinutes)}</p>
            <p className="text-xs text-muted-foreground">últimos 7 días · {formatHours(totalMinutes)} en total</p>
          </Card>
          <Card className="gap-2 p-4 text-sm">
            <p className="text-muted-foreground">Clientes · {theirClients.length}</p>
            {theirClients.length ? (
              <ul className="flex flex-col gap-2">
                {theirClients.map((c) => (
                  <li key={c.id}>
                    <Link href={`/work/clients/${c.id}`} className="flex items-center gap-2 hover:text-primary">
                      <ClientMark name={c.name} logoText={c.logoText} color={c.accentColor} size={20} />
                      <span className="truncate">{c.name}</span>
                      {c.accountManagerId === member.id ? (
                        <span className="ml-auto text-xs text-muted-foreground">Resp. de cuenta</span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">Sin clientes asignados.</p>
            )}
          </Card>
          <Card className="gap-2 p-4 text-sm">
            <p className="text-muted-foreground">Proyectos · {theirProjects.length}</p>
            {theirProjects.length ? (
              <ul className="flex flex-col gap-1.5">
                {theirProjects.map((p) => (
                  <li key={p.id}>
                    <Link href={`/work/projects/${p.id}`} className="block truncate hover:text-primary">
                      {p.name}
                      {p.leadId === member.id ? (
                        <span className="ml-1 text-xs text-muted-foreground">· líder</span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">Sin proyectos.</p>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
