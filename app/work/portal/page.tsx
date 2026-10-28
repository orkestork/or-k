import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, FileText, Inbox, Mail, NotebookPen, Plus, Sparkles } from "lucide-react";
import type { Project, Request } from "@/types/work/domain";
import { getClient, getClientDocs, getMe, getProjects, getRequests, getUsers } from "@/lib/work/data";
import { relativeTime } from "@/lib/work/format";
import { cn } from "@/lib/work/utils";
import { Button } from "@/components/work/ui/button";
import { Card } from "@/components/work/ui/card";
import { Progress } from "@/components/work/ui/progress";
import { EmptyState } from "@/components/work/shared/empty-state";
import { PersonAvatar } from "@/components/work/shared/people";
import { clientActivity, clientProgress, clientStage, clientStatus } from "@/components/work/portal/client-status";

export const metadata: Metadata = { title: "Tu proyecto · OR-K" };

const day = (iso: string) => new Date(iso).toLocaleDateString("es", { day: "numeric", month: "short" });
const ymd = (iso: string) => new Date(iso).toLocaleDateString("en-CA");
const startOf = (r: Request) => r.startOn ?? ymd(r.createdAt);
const today = () => new Date().toLocaleDateString("en-CA");

export default async function PortalHome() {
  const [all, me, projects, users] = await Promise.all([getRequests(), getMe(), getProjects(), getUsers()]);
  const [client, docs] = me?.clientId
    ? await Promise.all([getClient(me.clientId), getClientDocs(me.clientId)])
    : [null, []];
  const requests = all
    .filter((r) => r.state !== "archived")
    .sort((a, b) => startOf(a).localeCompare(startOf(b)) || a.id.localeCompare(b.id));
  const userById = (id: string | null | undefined) => (id ? users.find((u) => u.id === id) : undefined);

  const waiting = requests.filter((r) => r.state === "client_review");
  const inProduction = requests.filter((r) => ["production", "adjustments"].includes(clientStage(r.state)));
  const approved = requests.filter((r) => ["approved", "delivered"].includes(clientStage(r.state)));
  const upcoming = requests
    .filter((r) => !["approved", "delivered"].includes(clientStage(r.state)) && ymd(r.deadline) >= today())
    .sort((a, b) => +new Date(a.deadline) - +new Date(b.deadline));
  const next = upcoming[0];

  const minutes = requests
    .flatMap((r) => (r.minutes ?? []).map((m) => ({ ...m, requestId: r.id, requestTitle: r.title })))
    .sort((a, b) => b.heldOn.localeCompare(a.heldOn));

  const feed = buildFeed(requests).slice(0, 8);
  const manager = userById(client?.accountManagerId);
  const activeProjects = projects.filter((p) => p.status !== "closed" && requests.some((r) => r.projectId === p.id));

  if (!requests.length) {
    return (
      <div className="flex flex-col gap-6">
        <Greeting name={me?.name ?? ""} clientName={client?.name ?? ""} />
        <EmptyState
          icon={Inbox}
          title="Todavía no hay trabajo en curso"
          description="Aquí verás el avance de tus proyectos en cuanto el equipo de OR-K los comparta contigo."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <Greeting name={me?.name ?? ""} clientName={client?.name ?? ""} />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={Sparkles} label="Esperan tu revisión" value={waiting.length} tone={waiting.length ? "primary" : "muted"} />
        <Kpi icon={Clock3} label="En producción" value={inProduction.length} tone="info" />
        <Kpi icon={CheckCircle2} label="Aprobadas" value={`${approved.length}/${requests.length}`} tone="positive" />
        <Kpi
          icon={CalendarDays}
          label="Próxima entrega"
          value={next ? day(next.deadline) : "—"}
          hint={next ? next.title : undefined}
          tone="muted"
        />
      </div>

      {/* Action needed */}
      {waiting.length ? (
        <section className="flex flex-col gap-3">
          <SectionTitle>Necesita tu respuesta</SectionTitle>
          <div className="grid gap-3 md:grid-cols-2">
            {waiting.map((r) => (
              <Link key={r.id} href={`/work/portal/${r.id}`}>
                <Card className="h-full gap-3 border-primary/40 bg-primary/5 p-4 transition-colors hover:border-primary">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{r.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.versions.length ? `Versión ${r.versions[r.versions.length - 1].label} lista` : "Lista para revisar"} ·
                        entrega {day(r.deadline)}
                      </p>
                    </div>
                    <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">Revisar</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm text-primary">
                    Aprobar o pedir ajustes <ArrowRight className="size-4" />
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Projects + phases */}
      {activeProjects.map((p) => (
        <ProjectBlock key={p.id} project={p} requests={requests.filter((r) => r.projectId === p.id)} lead={userById(p.leadId)} />
      ))}

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        {/* Feed */}
        <section className="flex flex-col gap-3">
          <SectionTitle>Lo último</SectionTitle>
          <Card className="gap-0 py-0">
            {feed.length ? (
              <ul className="divide-y divide-border">
                {feed.map((f) => (
                  <li key={f.id}>
                    <Link href={`/work/portal/${f.requestId}`} className="flex items-start gap-3 px-4 py-3 text-sm hover:bg-muted/40">
                      <span
                        className={cn(
                          "mt-1.5 size-2 shrink-0 rounded-full",
                          f.tone === "positive" && "bg-tone-positive",
                          f.tone === "warn" && "bg-tone-warn",
                          f.tone === "primary" && "bg-primary",
                          f.tone === "info" && "bg-tone-info",
                        )}
                      />
                      <span className="min-w-0 flex-1">{f.text}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(f.at)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-4 text-sm text-muted-foreground">Aquí verás versiones nuevas, aprobaciones y entregas.</p>
            )}
          </Card>
        </section>

        <aside className="flex flex-col gap-4">
          {/* Team */}
          <Card className="gap-3 p-4">
            <p className="text-sm font-medium">Tu equipo en OR-K</p>
            {manager ? <Contact person={manager} role="Responsable de cuenta" /> : null}
            {[...new Set(activeProjects.map((p) => p.leadId))]
              .filter((id) => id && id !== manager?.id)
              .map((id) => userById(id))
              .filter(Boolean)
              .map((u) => (
                <Contact key={u!.id} person={u!} role="Líder del proyecto" />
              ))}
            <Button size="sm" asChild className="mt-1">
              <Link href="/work/portal/new">
                <Plus className="size-4" /> Pedir algo nuevo
              </Link>
            </Button>
          </Card>

          {minutes.length ? (
            <Card className="gap-2 p-4">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <NotebookPen className="size-4 text-muted-foreground" /> Actas de reunión
              </p>
              <ul className="flex flex-col gap-1.5 text-sm">
                {minutes.slice(0, 5).map((m) => (
                  <li key={m.id}>
                    <Link href={`/work/portal/${m.requestId}`} className="flex justify-between gap-2 hover:text-primary">
                      <span className="truncate">{m.title}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{day(`${m.heldOn}T12:00:00`)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {docs.length ? (
            <Card className="gap-2 p-4">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <FileText className="size-4 text-muted-foreground" /> Documentos
              </p>
              <ul className="flex flex-col gap-1.5 text-sm">
                {docs.map((d) => (
                  <li key={d.id}>
                    <Link href={`/work/portal/docs/${d.id}`} className="block truncate hover:text-primary">
                      {d.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function Greeting({ name, clientName }: { name: string; clientName: string }) {
  const hour = Number(new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "America/Bogota" }));
  const hello = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-sm text-muted-foreground">{clientName}</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {hello}, {name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Así va tu trabajo con OR-K.</p>
      </div>
      <Button size="sm" asChild>
        <Link href="/work/portal/new">
          <Plus className="size-4" /> Pedir algo nuevo
        </Link>
      </Button>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Inbox;
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone: "primary" | "info" | "positive" | "muted";
}) {
  return (
    <Card className="gap-1 p-4">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon
          className={cn(
            "size-3.5",
            tone === "primary" && "text-primary",
            tone === "info" && "text-tone-info",
            tone === "positive" && "text-tone-positive",
          )}
        />
        {label}
      </p>
      <p className={cn("text-2xl font-semibold tabular-nums", tone === "primary" && "text-primary")}>{value}</p>
      {hint ? <p className="truncate text-xs text-muted-foreground">{hint}</p> : null}
    </Card>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{children}</h2>;
}

function Contact({ person, role }: { person: { name: string; color: string; avatarUrl?: string | null; email: string; title: string }; role: string }) {
  return (
    <div className="flex items-center gap-3">
      <PersonAvatar person={person} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{person.name}</p>
        <p className="truncate text-xs text-muted-foreground">{role}</p>
      </div>
      <a href={`mailto:${person.email}`} className="text-muted-foreground hover:text-primary" aria-label={`Escribir a ${person.name}`}>
        <Mail className="size-4" />
      </a>
    </div>
  );
}

function ProjectBlock({ project, requests, lead }: { project: Project; requests: Request[]; lead?: { name: string } }) {
  const progress = clientProgress(requests);
  const t = today();
  const open = (r: Request) => !["approved", "delivered"].includes(clientStage(r.state));
  const running = requests.find((r) => startOf(r) <= t && open(r));
  const current = running ?? requests.find(open);
  const currentLabel = running ? "En curso" : "Siguiente";
  const start = requests.map(startOf).sort()[0] ?? project.startDate;
  const end = requests.map((r) => ymd(r.deadline)).sort().at(-1) ?? project.targetDate;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <SectionTitle>{project.name}</SectionTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {day(`${start}T12:00:00`)} → {day(`${end}T12:00:00`)}
            {lead ? ` · lidera ${lead.name.split(" ")[0]}` : ""}
            {current ? (
              <>
                {" "}
                · {running ? "ahora" : "siguiente"}: <span className="font-medium text-foreground">{current.title}</span>
              </>
            ) : null}
          </p>
        </div>
        <div className="w-full max-w-xs">
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>Avance</span>
            <span className="font-mono">{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {requests.map((r) => {
          const stage = clientStage(r.state);
          const status = clientStatus(r.state);
          const done = stage === "approved" || stage === "delivered";
          const isCurrent = current?.id === r.id;
          return (
            <Link key={r.id} href={`/work/portal/${r.id}`}>
              <Card
                className={cn(
                  "h-full gap-3 p-4 transition-colors hover:border-primary/50",
                  isCurrent && "border-primary/60 ring-1 ring-primary/30",
                  done && "bg-muted/30",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {day(`${startOf(r)}T12:00:00`)} – {day(r.deadline)}
                  </span>
                  {isCurrent ? <span className="text-xs font-semibold text-primary">{currentLabel}</span> : null}
                </div>
                <p className="font-medium leading-snug">{r.title}</p>
                {r.deliverables.length ? (
                  <ul className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                    {r.deliverables.slice(0, 4).map((d) => (
                      <li key={d} className="flex items-start gap-1.5">
                        <span className={cn("mt-1.5 size-1 shrink-0 rounded-full", done ? "bg-tone-positive" : "bg-muted-foreground/60")} />
                        {d}
                      </li>
                    ))}
                    {r.deliverables.length > 4 ? <li>+{r.deliverables.length - 4} más</li> : null}
                  </ul>
                ) : r.objective ? (
                  <p className="line-clamp-3 text-xs text-muted-foreground">{r.objective}</p>
                ) : null}
                <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs", status.className)}>{status.label}</span>
                  {done ? <CheckCircle2 className="size-4 text-tone-positive" /> : null}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/** Client-safe milestones across requests, newest first, without repeats. */
function buildFeed(requests: Request[]) {
  const items: { id: string; at: string; requestId: string; text: string; tone: "info" | "positive" | "warn" | "primary" }[] = [];
  for (const r of requests) {
    let lastText = "";
    let seenProduction = false;
    for (const a of [...r.activity].sort((x, y) => +new Date(x.at) - +new Date(y.at))) {
      const view = clientActivity(a, r.title);
      if (!view || view.text === lastText) continue;
      // Internal hops (copy → design → reviews) all read "in production": say it once.
      if (view.text.endsWith("entró en producción")) {
        if (seenProduction) continue;
        seenProduction = true;
      }
      lastText = view.text;
      items.push({ id: a.id, at: a.at, requestId: r.id, ...view });
    }
  }
  return items.sort((a, b) => +new Date(b.at) - +new Date(a.at));
}
