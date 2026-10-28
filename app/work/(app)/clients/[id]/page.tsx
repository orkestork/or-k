import { Suspense } from "react";
import { BackLink } from "@/components/work/shell/nav-trail";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, Phone } from "lucide-react";
import {
  getClient,
  getProjectsByClient,
  getClientBilling,
  getClientDocs,
  getClientIncome,
  getMe,
  getRequestsByClient,
  getUsers,
  isAdmin,
} from "@/lib/work/data";
import { supabaseConfigured } from "@/lib/work/supabase/env";
import { adminConfigured } from "@/lib/work/supabase/admin";
import { PortalAccess } from "@/components/work/clients/portal-access";
import { ClientActiveToggle } from "@/components/work/clients/client-active-toggle";
import { seesAll } from "@/lib/work/people";
import { BILLING_MODEL, PAYMENT_METHOD, contractTotal, termsLabel } from "@/lib/work/billing";
import { money } from "@/components/work/hr/labels";
import { relativeTime, shortDate } from "@/lib/work/format";
import { PageHeader, ClientMark } from "@/components/work/shared/page-header";
import { PersonInline } from "@/components/work/shared/people";
import { RequestList } from "@/components/work/requests/request-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/work/ui/card";
import { Button } from "@/components/work/ui/button";
import { FileText, Pencil, Pin, Plus } from "lucide-react";

const ASSET_LABEL: Record<string, string> = {
  logos: "Logos",
  brandbook: "Brandbook",
  typography: "Tipografía",
  colors: "Color",
  photography: "Fotografía",
  product: "Producto",
  templates: "Plantillas",
  references: "Referencias",
  documents: "Documentos",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const c = await getClient(id);
  return { title: `${c?.name ?? "Cliente"} · OR-K WORK` };
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await getClient(id);
  if (!client) notFound();

  const [projects, requests, users, docs, me, billing, clientIncome] = await Promise.all([
    getProjectsByClient(id),
    getRequestsByClient(id),
    getUsers(),
    getClientDocs(id),
    getMe(),
    getClientBilling(id),
    getClientIncome(id),
  ]);
  const day = (s: string) => new Date(`${s}T12:00:00`).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
  const userById = (uid: string) => users.find((u) => u.id === uid);
  const team = client.teamIds.map(userById).filter(Boolean) as typeof users;

  return (
    <div className="mx-auto max-w-7xl">
      <Suspense fallback={null}>
        <BackLink fallbackHref={"/work/clients"} fallbackLabel={"Clientes"} />
      </Suspense>

      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <ClientMark
              name={client.name}
              logoText={client.logoText}
              color={client.accentColor}
              size={32}
            />
            {client.name}
            {!client.active ? <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">Inactivo</span> : null}
          </span>
        }
        description={`${client.industry} · cliente desde ${shortDate(client.since)}`}
        actions={
          seesAll(me?.role) ? <>
            <ClientActiveToggle id={client.id} name={client.name} active={client.active} />
            <Button size="sm" variant="outline" asChild>
              <Link href={`/work/clients/${client.id}/edit`}>
                <Pencil className="size-4" /> Editar
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={`/work/projects/new?client=${client.id}`}>
                <Plus className="size-4" /> Proyecto
              </Link>
            </Button>
          </> : null
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_19rem]">
        <div className="flex flex-col gap-4">
          <Card className="gap-0 py-0">
            <CardHeader className="border-b border-border py-3">
              <CardTitle className="text-sm">Proyectos · {projects.length}</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <ul className="flex flex-col">
                {projects.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/work/projects/${p.id}`}
                      className="flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-muted/40"
                    >
                      <span>{p.name}</span>
                      <span className="text-xs text-muted-foreground">
                        meta {shortDate(p.targetDate)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="gap-0 py-0">
            <CardHeader className="border-b border-border py-3">
              <CardTitle className="text-sm">
                Solicitudes · {requests.length}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <RequestList
                requests={requests.sort(
                  (a, b) => +new Date(a.deadline) - +new Date(b.deadline),
                )}
                clients={[client]}
                users={users}
                showClient={false}
              />
            </CardContent>
          </Card>

          <Card className="gap-0 py-0">
            <CardHeader className="border-b border-border py-3">
              <CardTitle className="flex items-center justify-between text-sm">
                Documentos · {docs.length}
                <Link
                  href={`/work/clients/${client.id}/docs/new`}
                  className="inline-flex items-center gap-1 text-xs font-normal text-primary hover:underline"
                >
                  <Plus className="size-3.5" /> Nuevo documento
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              {docs.length ? (
                <ul className="flex flex-col">
                  {docs.map((d) => (
                    <li key={d.id}>
                      <Link
                        href={`/work/clients/${client.id}/docs/${d.id}`}
                        className="flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted/40"
                      >
                        <FileText className="size-4 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate">{d.title}</span>
                        {d.pinned ? <Pin className="size-3.5 text-muted-foreground" /> : null}
                        {d.visibleToClient ? (
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">Cliente</span>
                        ) : null}
                        <span className="text-xs text-muted-foreground">{relativeTime(d.updatedAt)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="p-2 text-sm text-muted-foreground">
                  Brandbook, accesos, procesos, contactos clave… todo lo de la cuenta en un solo lugar.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="gap-0 py-0">
            <CardHeader className="border-b border-border py-3">
              <CardTitle className="flex items-center justify-between text-sm">
                Assets · {client.assets.length}
                <Link href={`/work/assets?client=${client.id}`} className="text-xs font-normal text-muted-foreground hover:text-foreground">
                  Gestionar
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {client.assets.length ? (
                <ul className="flex flex-col gap-1.5">
                  {client.assets.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                        {ASSET_LABEL[a.category]}
                      </span>
                      {a.url ? (
                        <a href={a.url} target="_blank" rel="noreferrer" className="truncate hover:text-primary">
                          {a.name}
                        </a>
                      ) : (
                        <span className="truncate">{a.name}</span>
                      )}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {relativeTime(a.addedAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sin assets cargados.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="flex flex-col gap-4">
          {billing ? (
            <Card className="gap-2 p-4 text-sm">
              <p className="text-muted-foreground">Facturación y pagos</p>
              <p className="font-medium">{BILLING_MODEL[billing.model]}</p>
              <p className="text-xs text-muted-foreground">
                {PAYMENT_METHOD[billing.paymentMethod]} · {termsLabel(billing.termsDays)} · IVA {billing.ivaRate}%
                {billing.withholding ? " · con retención" : ""}
              </p>
              {billing.contractValue ? (
                <p>
                  {billing.model === "retainer" ? (
                    <>
                      {money(billing.contractValue)} <span className="text-xs text-muted-foreground">al mes + IVA · {billing.installments} mes(es) · total {money(contractTotal(billing))}</span>
                    </>
                  ) : (
                    <>
                      {money(billing.contractValue)} <span className="text-xs text-muted-foreground">+ IVA · {billing.installmentSplit.length || billing.installments} cuota(s)</span>
                    </>
                  )}
                </p>
              ) : null}
              {clientIncome.length ? (
                <ul className="mt-1 flex flex-col gap-1.5 border-t border-border pt-2">
                  {clientIncome.map((i) => (
                    <li key={i.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="min-w-0 flex-1 truncate">{i.description}</span>
                      <span className="text-muted-foreground">{day(i.issuedOn)}</span>
                      <span className="font-mono">{money(i.amount)}</span>
                      <span
                        className={
                          i.status === "paid"
                            ? "rounded bg-tone-positive/15 px-1.5 text-tone-positive"
                            : i.status === "invoiced"
                              ? "rounded bg-tone-warn/15 px-1.5 text-tone-warn"
                              : "rounded bg-muted px-1.5 text-muted-foreground"
                        }
                      >
                        {i.status === "paid" ? "Pagada" : i.status === "invoiced" ? "Facturada" : i.status === "scheduled" ? "Programada" : "Cotizada"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {billing.notes ? <p className="text-xs text-muted-foreground">{billing.notes}</p> : null}
            </Card>
          ) : null}
          {supabaseConfigured ? (
            <Card className="gap-3 p-4">
              <p className="text-sm text-muted-foreground">Acceso al portal</p>
              <PortalAccess
                client={client}
                members={users.filter((u) => u.role === "client" && u.clientId === client.id)}
                canManage={isAdmin(me)}
                canCreate={adminConfigured}
              />
            </Card>
          ) : null}
          <Card className="gap-2 p-4 text-sm">
            <p className="text-muted-foreground">Empresa</p>
            {client.legal.legalName || client.legal.taxId ? (
              <>
                <p className="font-medium">{client.legal.legalName || client.name}</p>
                {client.legal.taxId ? <p>NIT {client.legal.taxId}</p> : null}
                {client.legal.taxRegime ? (
                  <p className="text-muted-foreground">{client.legal.taxRegime}</p>
                ) : null}
                {client.legal.address || client.legal.city ? (
                  <p className="text-muted-foreground">
                    {[client.legal.address, client.legal.city, client.legal.country].filter(Boolean).join(", ")}
                  </p>
                ) : null}
                {client.legal.billingEmail ? (
                  <a href={`mailto:${client.legal.billingEmail}`} className="text-muted-foreground hover:text-foreground">
                    Facturación: {client.legal.billingEmail}
                  </a>
                ) : null}
                {client.legal.website ? (
                  <a href={/^https?:\/\//.test(client.legal.website) ? client.legal.website : `https://${client.legal.website}`} target="_blank" rel="noreferrer" className="truncate text-muted-foreground hover:text-foreground">
                    {client.legal.website}
                  </a>
                ) : null}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Sin datos de empresa todavía.</p>
            )}
          </Card>

          <Card className="gap-2 p-4 text-sm">
            <p className="font-medium">{client.contact.name}</p>
            <p className="text-muted-foreground">{client.contact.role}</p>
            <a
              href={`mailto:${client.contact.email}`}
              className="mt-1 flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <Mail className="size-3.5" /> {client.contact.email}
            </a>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Phone className="size-3.5" /> {client.contact.phone}
            </span>
          </Card>

          <Card className="gap-3 p-4 text-sm">
            <p className="text-muted-foreground">Responsable de cuenta</p>
            {userById(client.accountManagerId) ? (
              <PersonInline
                person={userById(client.accountManagerId)!}
                size="xs"
              />
            ) : null}
            <p className="mt-2 text-muted-foreground">Equipo asignado</p>
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
