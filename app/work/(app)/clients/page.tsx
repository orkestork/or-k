import type { Metadata } from "next";
import Link from "next/link";
import {
  getClients,
  getProjects,
  getRequests,
  getUsers,
  getMe,
} from "@/lib/work/data";
import { seesAll } from "@/lib/work/people";
import { shortDate } from "@/lib/work/format";
import { PageHeader, ClientMark } from "@/components/work/shared/page-header";
import { PersonInline } from "@/components/work/shared/people";
import { Card } from "@/components/work/ui/card";
import { Button } from "@/components/work/ui/button";
import { EmptyState } from "@/components/work/shared/empty-state";
import { ClientActiveToggle } from "@/components/work/clients/client-active-toggle";
import { cn } from "@/lib/work/utils";
import { Plus, Users } from "lucide-react";

export const metadata: Metadata = { title: "Clients · OR-K WORK" };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const showInactive = (await searchParams).show === "inactive";
  const [all, projects, requests, users, me] = await Promise.all([
    getClients(),
    getProjects(),
    getRequests(),
    getUsers(),
    getMe(),
  ]);
  const canManage = seesAll(me?.role);
  const inactiveCount = all.filter((c) => !c.active).length;
  const clients = all.filter((c) => c.active !== showInactive);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Clientes"
        description={showInactive ? "Clientes inactivos: conservan su historial, pero no aparecen al crear proyectos o solicitudes." : "Cuentas activas de OR-K."}
        actions={
          canManage ? <Button size="sm" asChild>
            <Link href="/work/clients/new">
              <Plus className="size-4" /> Nuevo cliente
            </Link>
          </Button> : null
        }
      />
      {inactiveCount || showInactive ? (
        <div className="mb-4 inline-flex rounded-md border border-border p-0.5 text-sm">
          {[
            { href: "/work/clients", label: `Activos (${all.length - inactiveCount})`, on: !showInactive },
            { href: "/work/clients?show=inactive", label: `Inactivos (${inactiveCount})`, on: showInactive },
          ].map((t) => (
            <Link key={t.href} href={t.href} className={cn("rounded px-3 py-1", t.on ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground")}>
              {t.label}
            </Link>
          ))}
        </div>
      ) : null}
      {clients.length === 0 ? (
        showInactive ? (
          <EmptyState icon={Users} title="Sin clientes inactivos" description="Los clientes que desactives aparecerán aquí." />
        ) : (
          <EmptyState icon={Users} title="Sin clientes todavía" description="Crea el primer cliente para empezar a abrir proyectos y solicitudes." />
        )
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {clients.map((c) => {
          const am = users.find((u) => u.id === c.accountManagerId);
          const projCount = projects.filter((p) => p.clientId === c.id).length;
          const openReqs = requests.filter(
            (r) =>
              r.clientId === c.id &&
              !["completed", "archived"].includes(r.state),
          ).length;
          return (
            <Card key={c.id} className={cn("h-full gap-3 p-4 transition-colors hover:border-primary/40", !c.active && "opacity-70")}>
              <div className="flex items-start justify-between gap-3">
                <Link href={`/work/clients/${c.id}`} className="flex min-w-0 items-center gap-3 hover:text-primary">
                  <ClientMark
                    name={c.name}
                    logoText={c.logoText}
                    color={c.accentColor}
                    size={36}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{c.industry}</p>
                  </div>
                </Link>
                {canManage ? <ClientActiveToggle id={c.id} name={c.name} active={c.active} compact /> : null}
              </div>
              <Link href={`/work/clients/${c.id}`} className="flex flex-col gap-3">
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>{projCount} proyectos</span>
                  <span>{openReqs} solicitudes abiertas</span>
                  <span>desde {shortDate(c.since)}</span>
                </div>
                {am ? <PersonInline person={am} size="xs" muted /> : null}
              </Link>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
