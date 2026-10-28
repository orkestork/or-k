import { Suspense } from "react";
import { BackLink } from "@/components/work/shell/nav-trail";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FileText,
  History,
  CheckCircle2,
  Layers,
  RotateCcw,
  Lock,
  ListChecks,
  MessageSquare,
  NotebookPen,
  Paperclip,
  Pencil,
  PenLine,
} from "lucide-react";
import {
  getClient,
  getProject,
  getRequest,
  getMe,
  getTimeEntries,
  getUsers,
  isAdmin,
} from "@/lib/work/data";
import { TimeTracker } from "@/components/work/requests/time-tracker";
import { WORKFLOW } from "@/lib/work/workflow";
import { fullDate, relativeTime } from "@/lib/work/format";
import { PageHeader, ClientMark } from "@/components/work/shared/page-header";
import {
  StatusBadge,
  PriorityBadge,
  DeadlinePill,
} from "@/components/work/shared/badges";
import { PersonAvatar, PersonInline } from "@/components/work/shared/people";
import { WorkflowStrip } from "@/components/work/requests/workflow-strip";
import { RequestActions } from "@/components/work/requests/request-actions";
import { CommentThread } from "@/components/work/requests/comment-thread";
import { CopyEditor } from "@/components/work/requests/copy-editor";
import { VersionViewer } from "@/components/work/requests/version-viewer";
import { VersionUpload } from "@/components/work/requests/version-upload";
import { RequestFiles } from "@/components/work/requests/request-files";
import { RequestMinutes } from "@/components/work/requests/request-minutes";
import { AssigneesPicker } from "@/components/work/requests/assignee-select";
import { Subtasks } from "@/components/work/requests/subtasks";
import { canApprove, peopleOn, seesAll } from "@/lib/work/people";
import { cleanNote, clientDecisions, verdictByVersion } from "@/lib/work/approvals";
import { ApproverSelect } from "@/components/work/requests/approver-select";
import { supabaseConfigured } from "@/lib/work/supabase/env";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/work/ui/card";
import { Progress } from "@/components/work/ui/progress";
import { Separator } from "@/components/work/ui/separator";
import { Button } from "@/components/work/ui/button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `${id} · OR-K WORK` };
}

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const request = await getRequest(id);
  if (!request) notFound();

  const [client, project, users, me] = await Promise.all([
    getClient(request.clientId),
    getProject(request.projectId),
    getUsers(),
    getMe(),
  ]);
  const canAdmin = supabaseConfigured && isAdmin(me);
  const lastClientDecision = clientDecisions(request)[0];
  const [timeEntries, dependencies] = await Promise.all([
    getTimeEntries({ requestIds: [request.id] }),
    Promise.all((request.dependsOn ?? []).map((id) => getRequest(id))),
  ]);
  const blockers = dependencies.filter(
    (d): d is NonNullable<typeof d> => !!d && !["approved", "scheduled", "published", "completed"].includes(d.state),
  );
  const userById = (uid: string | null) =>
    uid ? users.find((u) => u.id === uid) : undefined;
  const approver = request.approverId ? userById(request.approverId) : undefined;

  const assignee = userById(request.assigneeId);
  const creator = userById(request.createdById);
  const roundsPct = Math.min(
    100,
    (request.roundsUsed / Math.max(1, request.roundsIncluded)) * 100,
  );

  return (
    <div className="mx-auto max-w-7xl">
      <Suspense fallback={null}>
        <BackLink fallbackHref={"/work/requests"} fallbackLabel={"Solicitudes"} />
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
            {request.title}
          </span>
        }
        description={
          <span className="font-mono">{request.id}</span>
        }
        actions={
          <>
            <RequestActions
              request={request}
              approval={{
                allowed: canApprove(request, me, approver?.away?.substituteId),
                approverName: approver
                  ? approver.away?.substituteId
                    ? `${approver.name} (o ${userById(approver.away.substituteId)?.name ?? "su reemplazo"})`
                    : approver.name
                  : null,
              }}
              canSendToClient={seesAll(me?.role)}
            />
            {canAdmin ? (
              <Button size="sm" variant="outline" asChild>
                <Link href={`/work/requests/${request.id}/edit`}>
                  <Pencil className="size-4" /> Editar
                </Link>
              </Button>
            ) : null}
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge state={request.state} />
          <PriorityBadge priority={request.priority} />
          <DeadlinePill iso={request.deadline} />
          <span className="text-xs text-muted-foreground">
            {client?.name} · {project?.name} · {request.campaign}
          </span>
        </div>
      </PageHeader>

      {lastClientDecision ? (
        <div
          className={`mb-4 flex flex-wrap items-center gap-2 rounded-md border px-4 py-2.5 text-sm ${
            lastClientDecision.decision === "approved"
              ? "border-tone-positive/40 bg-tone-positive/10"
              : "border-tone-warn/40 bg-tone-warn/10"
          }`}
        >
          {lastClientDecision.decision === "approved" ? (
            <CheckCircle2 className="size-4 text-tone-positive" />
          ) : (
            <RotateCcw className="size-4 text-tone-warn" />
          )}
          <span>
            <span className="font-medium">{userById(lastClientDecision.byId)?.name ?? "El cliente"}</span> (cliente){" "}
            {lastClientDecision.decision === "approved" ? "aprobó" : "pidió ajustes en"}{" "}
            {lastClientDecision.versionLabel ? `la ${lastClientDecision.versionLabel}` : "la pieza"} ·{" "}
            {relativeTime(lastClientDecision.at)}
          </span>
          {lastClientDecision.note ? <span className="text-muted-foreground">— “{lastClientDecision.note}”</span> : null}
        </div>
      ) : null}

      {blockers.length ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-tone-warn/40 bg-tone-warn/10 px-4 py-2.5 text-sm">
          <Lock className="size-4 text-tone-warn" />
          <span>Esta tarea depende de:</span>
          {blockers.map((b) => (
            <Link key={b.id} href={`/work/requests/${b.id}`} className="font-medium hover:underline">
              {b.id} · {b.title} <span className="font-normal text-muted-foreground">({WORKFLOW[b.state].label})</span>
            </Link>
          ))}
        </div>
      ) : null}

      <Card className="mb-4 py-3">
        <CardContent className="px-4">
          <WorkflowStrip state={request.state} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-4">
          {/* Brief */}
          <Section icon={FileText} title="Brief">
            <Field label="Objetivo">{request.objective}</Field>
            <Field label="Público objetivo">{request.audience}</Field>
            <Field label="Mensaje principal">{request.mainMessage}</Field>
            <Field label="Llamado a la acción">{request.cta}</Field>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <MetaList label="Entregables" items={request.deliverables} />
              <MetaList label="Formatos" items={request.formats} />
              <MetaList label="Canales" items={request.channels} />
            </div>
            {request.observations ? (
              <Field label="Observaciones">{request.observations}</Field>
            ) : null}
          </Section>

          {/* Subtasks */}
          {supabaseConfigured ? (
            <Section
              icon={ListChecks}
              title={`Subtareas · ${(request.subtasks ?? []).filter((s) => s.done).length}/${request.subtasks?.length ?? 0}`}
            >
              <Subtasks requestId={request.id} subtasks={request.subtasks ?? []} users={users} />
            </Section>
          ) : null}

          {/* Copy workspace */}
          <Section icon={PenLine} title="Copy workspace">
            {request.copy.concept ? (
              <>
                <Field label="Concepto creativo">{request.copy.concept}</Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Headline">{request.copy.headline}</Field>
                  <Field label="CTA">{request.copy.cta}</Field>
                </div>
                <Field label="Subheadline">{request.copy.subheadline}</Field>
                <Field label="Caption">{request.copy.caption}</Field>
                <Field label="Ideas visuales">{request.copy.visualIdeas}</Field>
                {request.copy.drafts.length ? (
                  <p className="text-xs text-muted-foreground">
                    {request.copy.drafts.map((d) => d.label).join(" · ")} guardados
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                El copy todavía no ha empezado para esta solicitud.
              </p>
            )}
            {supabaseConfigured ? <CopyEditor requestId={request.id} copy={request.copy} /> : null}
          </Section>

          {/* Versions */}
          <Section icon={Layers} title={`Diseño · ${request.versions.length} versiones`}>
            {request.versions.length && !request.versions.some((v) => v.fileUrl) ? (
              <ul className="flex flex-col gap-2">
                {[...request.versions].reverse().map((v) => {
                  const by = userById(v.uploadedById);
                  return (
                    <li
                      key={v.id}
                      className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded bg-muted font-mono text-xs font-semibold">
                        {v.label}
                      </span>
                      <div className="min-w-0 flex-1">
                        {v.fileUrl ? (
                          <a
                            href={v.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="block truncate text-sm text-primary hover:underline"
                          >
                            {v.fileName}
                          </a>
                        ) : (
                          <p className="truncate text-sm">{v.fileName}</p>
                        )}
                        <p className="truncate text-xs text-muted-foreground">
                          {v.note}
                        </p>
                      </div>
                      <div className="hidden shrink-0 items-center gap-2 text-xs text-muted-foreground sm:flex">
                        {by ? <PersonAvatar person={by} size="xs" /> : null}
                        {relativeTime(v.uploadedAt)}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : !request.versions.length ? (
              <p className="text-sm text-muted-foreground">
                Sin propuestas visuales subidas.
              </p>
            ) : null}
            {request.versions.some((v) => v.fileUrl) ? (
              <VersionViewer
                requestId={request.id}
                versions={request.versions}
                markers={request.markers}
                users={users}
                canResolve
                canShare={supabaseConfigured && seesAll(me?.role)}
                clientVerdicts={verdictByVersion(request)}
                collapsible
              />
            ) : request.markers.length ? (
              <div className="mt-2 rounded-md border border-border p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Comentarios sobre la pieza
                </p>
                <ul className="flex flex-col gap-1.5">
                  {request.markers.map((m) => (
                    <li key={m.id} className="flex items-start gap-2 text-sm">
                      <span
                        className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-xs font-bold ${
                          m.resolved
                            ? "bg-muted text-muted-foreground line-through"
                            : "bg-primary text-primary-foreground"
                        }`}
                      >
                        {m.index}
                      </span>
                      <span className={m.resolved ? "text-muted-foreground line-through" : ""}>
                        {m.body}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {supabaseConfigured ? (
              <VersionUpload requestId={request.id} nextLabel={`V${request.versions.length + 1}`} />
            ) : null}
          </Section>

          {/* Attachments */}
          <Section icon={Paperclip} title={`Archivos · ${request.files?.length ?? 0}`}>
            <RequestFiles
              requestId={request.id}
              files={request.files ?? []}
              users={users}
              canEdit={supabaseConfigured}
            />
          </Section>

          {/* Meeting minutes */}
          <Section icon={NotebookPen} title={`Actas · ${request.minutes?.length ?? 0}`}>
            <RequestMinutes
              requestId={request.id}
              minutes={request.minutes ?? []}
              users={users}
              canEdit={supabaseConfigured}
            />
          </Section>

          {/* Comments */}
          <Section icon={MessageSquare} title={`Comentarios · ${request.comments.length}`}>
            <CommentThread
              requestId={request.id}
              comments={request.comments}
              users={users}
              allowExternal={supabaseConfigured}
            />
          </Section>

          {/* Activity */}
          <Section icon={History} title="Actividad">
            <ol className="flex flex-col gap-2.5">
              {request.activity.map((a) => {
                const actor = userById(a.actorId);
                return (
                  <li key={a.id} className="flex items-start gap-2.5 text-sm">
                    {actor ? <PersonAvatar person={actor} size="xs" /> : null}
                    <span className="text-muted-foreground">
                      <span className="text-foreground">{actor?.name.split(" ")[0]}</span>{" "}
                      {a.verb} <span className="text-foreground">{a.detail}</span> ·{" "}
                      {relativeTime(a.at)}
                    </span>
                  </li>
                );
              })}
            </ol>
          </Section>
        </div>

        {/* Sidebar */}
        <aside className="flex flex-col gap-4">
          <Card className="gap-3 p-4 text-sm">
            <div className="flex flex-col gap-1.5">
              <span className="text-muted-foreground">Responsables</span>
              {supabaseConfigured ? (
                <AssigneesPicker requestId={request.id} peopleIds={peopleOn(request)} users={users} />
              ) : assignee ? (
                <PersonInline person={assignee} size="xs" />
              ) : (
                <span className="text-muted-foreground">Sin asignar</span>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-muted-foreground">Aprueba</span>
              {supabaseConfigured ? (
                <ApproverSelect requestId={request.id} approverId={request.approverId ?? null} users={users} />
              ) : approver ? (
                <PersonInline person={approver} size="xs" />
              ) : (
                <span className="text-muted-foreground">Por rol</span>
              )}
              {approver?.away ? (
                <p className="text-xs text-tone-warn">
                  {approver.name.split(" ")[0]} está off
                  {approver.away.substituteId ? `: aprueba ${userById(approver.away.substituteId)?.name ?? "su reemplazo"}` : ""}
                </p>
              ) : null}
            </div>
            <SideRow label="Creada por">
              {creator ? <PersonInline person={creator} size="xs" /> : "—"}
            </SideRow>
            <SideRow label="Deadline">{fullDate(request.deadline)}</SideRow>
            <SideRow label="Estado">{WORKFLOW[request.state].label}</SideRow>
          </Card>

          <Card className="gap-2 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Rondas de ajustes</span>
              <span className="font-mono">
                {request.roundsUsed}/{request.roundsIncluded}
              </span>
            </div>
            <Progress value={roundsPct} />
            {request.roundsUsed >= request.roundsIncluded && request.roundsIncluded > 0 ? (
              <p className="text-xs text-tone-warn">
                Se alcanzó el límite de rondas incluidas. El responsable de cuenta puede
                autorizar una ronda adicional como costo extra.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {request.roundsIncluded - request.roundsUsed} ronda(s) disponibles.
              </p>
            )}
          </Card>

          {request.approvals.length ? (
            <Card className="gap-2 p-4">
              <p className="text-sm text-muted-foreground">Aprobaciones</p>
              <Separator />
              <ul className="flex flex-col gap-2 text-sm">
                {request.approvals.map((ap) => {
                  const by = userById(ap.byId);
                  return (
                    <li key={ap.id} className="flex items-start gap-2">
                      <span
                        className={`mt-1 size-1.5 shrink-0 rounded-full ${
                          ap.decision === "approved"
                            ? "bg-tone-positive"
                            : "bg-tone-warn"
                        }`}
                      />
                      <span className="text-muted-foreground">
                        <span className="text-foreground">
                          {WORKFLOW[ap.stage].label}
                        </span>
                        {" — "}
                        {ap.decision === "approved" ? "aprobado" : "cambios"} por{" "}
                        {by?.name.split(" ")[0]}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ) : null}

          {request.adjustments.length ? (
            <Card className="gap-2 p-4">
              <p className="text-sm text-muted-foreground">Ajustes del cliente</p>
              <Separator />
              <ul className="flex flex-col gap-2 text-sm">
                {request.adjustments.map((adj) => (
                  <li key={adj.id}>
                    <span className="font-mono text-xs text-muted-foreground">
                      Ronda {adj.round}
                      {adj.billable ? " · costo adicional" : ""}
                    </span>
                    <p>{cleanNote(adj.comment)}</p>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
          {supabaseConfigured && me ? (
            <Card className="p-4">
              <TimeTracker
                requestId={request.id}
                entries={timeEntries}
                users={users}
                meId={me.id}
                isAdmin={canAdmin}
              />
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof FileText;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="flex flex-row items-center gap-2 border-b border-border py-3">
        <Icon className="size-4 text-muted-foreground" />
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 p-4 text-sm">
        {children}
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 whitespace-pre-wrap">{children}</p>
    </div>
  );
}

function MetaList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <ul className="mt-1 flex flex-col gap-0.5">
        {items.map((it) => (
          <li key={it} className="text-xs">
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SideRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}
