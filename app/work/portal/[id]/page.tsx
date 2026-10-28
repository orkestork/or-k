import { Suspense } from "react";
import { Clock3 } from "lucide-react";
import { BackLink } from "@/components/work/shell/nav-trail";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMe, getRequest, getUsers } from "@/lib/work/data";
import { fullDate } from "@/lib/work/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/work/ui/card";
import { CommentThread } from "@/components/work/requests/comment-thread";
import { VersionViewer } from "@/components/work/requests/version-viewer";
import { PortalDecision } from "@/components/work/portal/portal-decision";
import { RequestFiles } from "@/components/work/requests/request-files";
import { RequestMinutes } from "@/components/work/requests/request-minutes";
import { clientStage, clientStatus, type ClientStage } from "@/components/work/portal/client-status";
import { ClientStepper } from "@/components/work/portal/client-stepper";
import { cleanNote } from "@/lib/work/approvals";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `${id} · OR-K` };
}

const STATUS_COPY: Record<ClientStage, string> = {
  received: "El equipo la está planeando.",
  production: "El equipo está trabajando en la pieza. Te avisaremos cuando esté lista para tu revisión.",
  adjustments: "Estamos aplicando los ajustes que pediste.",
  review: "Revísala y cuéntanos qué opinas.",
  approved: "El equipo prepara la entrega o publicación.",
  delivered: "¡Listo! Gracias por tu confianza.",
  archived: "Esta pieza ya no está activa.",
};

export default async function PortalRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [request, users, me] = await Promise.all([getRequest(id), getUsers(), getMe()]);
  if (!request) notFound();
  const status = clientStatus(request.state);
  const hasFiles = request.versions.some((v) => v.fileUrl);
  const latestShared = [...request.versions].reverse().find((v) => v.fileUrl);
  const stage = clientStage(request.state);

  return (
    <div className="flex flex-col gap-4">
      <Suspense fallback={null}>
        <BackLink fallbackHref={"/work/portal"} fallbackLabel={"Tus piezas"} />
      </Suspense>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{request.title}</h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono">{request.id}</span>
            {request.campaign && request.campaign !== request.title ? ` · ${request.campaign}` : ""} · entrega{" "}
            {fullDate(request.deadline)}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs ${status.className}`}>{status.label}</span>
      </div>

      <Card className="p-4">
        <ClientStepper state={request.state} />
        <div className="mt-4 grid gap-4 border-t border-border pt-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Inicio</p>
            <p>{fullDate(`${request.startOn ?? request.createdAt.slice(0, 10)}T12:00:00`)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Entrega</p>
            <p>{fullDate(request.deadline)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Rondas de ajustes</p>
            <p>
              {request.roundsUsed} de {request.roundsIncluded} usadas
            </p>
          </div>
        </div>
        {request.deliverables.length || request.objective ? (
          <div className="mt-4 border-t border-border pt-4 text-sm">
            <p className="mb-1.5 text-xs text-muted-foreground">Qué incluye</p>
            {request.deliverables.length ? (
              <ul className="grid gap-1 sm:grid-cols-2">
                {request.deliverables.map((d) => (
                  <li key={d} className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-primary" /> {d}
                  </li>
                ))}
              </ul>
            ) : (
              <p>{request.objective}</p>
            )}
          </div>
        ) : null}
      </Card>

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_20rem]">
        <Card className="gap-0 py-0">
          <CardHeader className="border-b border-border py-3">
            <CardTitle className="text-sm">{request.state === "client_review" ? "Para revisar" : "Versiones"}</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {hasFiles ? (
              <VersionViewer
                requestId={request.id}
                versions={request.versions}
                markers={request.markers}
                users={users}
                canResolve={false}
                collapsible
              />
            ) : (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Clock3 className="size-6 text-muted-foreground" />
                <p className="text-sm font-medium">Aún no hay una versión para ti</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  El equipo te compartirá la pieza aquí cuando esté lista para tu revisión. Te avisaremos.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-4">
          {request.state === "client_review" ? (
            <PortalDecision
              requestId={request.id}
              roundsLeft={Math.max(0, request.roundsIncluded - request.roundsUsed)}
              versionLabel={latestShared?.label}
              openMarkers={request.markers.filter((m) => !m.resolved && m.authorId === me?.id).length}
            />
          ) : (
            <Card className="gap-2 p-4 text-sm">
              <p className="font-medium">{status.label}</p>
              <p className="text-muted-foreground">{STATUS_COPY[stage]}</p>
              {hasFiles && ["received", "production", "adjustments"].includes(stage) ? (
                <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                  Te compartimos este avance para que lo veas. Podrás aprobarlo o pedir ajustes cuando el equipo te lo
                  envíe a revisión; te aparecerá aquí mismo.
                </p>
              ) : null}
            </Card>
          )}
          {request.approvals.filter((a) => a.stage === "client_review").length ? (
            <Card className="gap-2 p-4 text-sm">
              <p className="text-muted-foreground">Tus decisiones</p>
              <ul className="flex flex-col gap-1.5">
                {request.approvals
                  .filter((a) => a.stage === "client_review")
                  .map((a) => (
                    <li key={a.id} className="flex items-start gap-2">
                      <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${a.decision === "approved" ? "bg-tone-positive" : "bg-tone-warn"}`} />
                      <span>
                        {a.decision === "approved" ? "Aprobaste" : "Pediste ajustes"}
                        {cleanNote(a.note) ? <span className="text-muted-foreground"> · {cleanNote(a.note)}</span> : null}
                      </span>
                    </li>
                  ))}
              </ul>
            </Card>
          ) : null}
        </aside>
      </div>

      {request.copy.headline || request.copy.caption ? (
        <Card className="gap-0 py-0">
          <CardHeader className="border-b border-border py-3">
            <CardTitle className="text-sm">Textos</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 p-4 text-sm">
            {request.copy.headline ? <Field label="Headline">{request.copy.headline}</Field> : null}
            {request.copy.subheadline ? <Field label="Subheadline">{request.copy.subheadline}</Field> : null}
            {request.copy.caption ? <Field label="Caption">{request.copy.caption}</Field> : null}
            {request.copy.cta ? <Field label="CTA">{request.copy.cta}</Field> : null}
          </CardContent>
        </Card>
      ) : null}

      {request.files?.length ? (
        <Card className="gap-0 py-0">
          <CardHeader className="border-b border-border py-3">
            <CardTitle className="text-sm">Archivos · {request.files.length}</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <RequestFiles requestId={request.id} files={request.files} users={users} canEdit={false} />
          </CardContent>
        </Card>
      ) : null}

      {request.minutes?.length ? (
        <Card className="gap-0 py-0">
          <CardHeader className="border-b border-border py-3">
            <CardTitle className="text-sm">Actas · {request.minutes.length}</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <RequestMinutes requestId={request.id} minutes={request.minutes} users={users} canEdit={false} />
          </CardContent>
        </Card>
      ) : null}

      <Card className="gap-0 py-0">
        <CardHeader className="border-b border-border py-3">
          <CardTitle className="text-sm">Conversación</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <CommentThread requestId={request.id} comments={request.comments} users={users} />
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 whitespace-pre-wrap">{children}</p>
    </div>
  );
}
