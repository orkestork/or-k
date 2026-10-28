import type { Metadata } from "next";
import Link from "next/link";
import { LayoutList, Plus } from "lucide-react";
import {
  getClients,
  getRequests,
  getSessionUser,
  getUsers,
} from "@/lib/work/data";
import { WORKFLOW, WORKFLOW_ORDER } from "@/lib/work/workflow";
import { cn } from "@/lib/work/utils";
import { involves } from "@/lib/work/people";
import { SearchFilter } from "@/components/work/shared/search-filter";
import { clientOptions, peopleOptions } from "@/components/work/shared/filter-options";
import { PageHeader } from "@/components/work/shared/page-header";
import { EmptyState } from "@/components/work/shared/empty-state";
import { RequestList } from "@/components/work/requests/request-list";
import { Button } from "@/components/work/ui/button";

export const metadata: Metadata = { title: "Requests · OR-K WORK" };

type SP = { state?: string; client?: string; scope?: string; assignee?: string };

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const [requests, clients, users, me] = await Promise.all([
    getRequests(),
    getClients(),
    getUsers(),
    getSessionUser(),
  ]);

  let list = [...requests].sort(
    (a, b) => +new Date(a.deadline) - +new Date(b.deadline),
  );
  if (sp.scope === "mine") list = list.filter((r) => involves(r, me.id));
  if (sp.scope === "open")
    list = list.filter((r) => !["completed", "archived"].includes(r.state));
  if (sp.state) list = list.filter((r) => r.state === sp.state);
  if (sp.client) list = list.filter((r) => r.clientId === sp.client);
  if (sp.assignee) list = list.filter((r) => involves(r, sp.assignee));

  const qs = (patch: Partial<SP>) => {
    const next = { ...sp, ...patch };
    const entries = Object.entries(next).filter(([, v]) => v);
    return entries.length ? "?" + new URLSearchParams(entries as [string, string][]) : "";
  };

  const chip = (active: boolean) =>
    cn(
      "rounded-full border px-2.5 py-1 text-xs transition-colors",
      active
        ? "border-primary/40 bg-primary/10 text-primary"
        : "border-border text-muted-foreground hover:text-foreground",
    );

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Solicitudes"
        description="Todo el trabajo entrando a la agencia."
        actions={
          <Button size="sm" asChild>
            <Link href="/work/requests/new">
              <Plus className="size-4" /> Nueva solicitud
            </Link>
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <Link href={`/work/requests${qs({ scope: undefined })}`} className={chip(!sp.scope)}>
            Todas
          </Link>
          <Link href={`/work/requests${qs({ scope: "open" })}`} className={chip(sp.scope === "open")}>
            Abiertas
          </Link>
          <Link href={`/work/requests${qs({ scope: "mine" })}`} className={chip(sp.scope === "mine")}>
            Mías
          </Link>
          <span className="mx-1 h-4 w-px bg-border" />
          <SearchFilter
            param="client"
            label="Cliente"
            allLabel="Todos"
            placeholder="Buscar cliente…"
            options={clientOptions(clients)}
          />
          <SearchFilter
            param="assignee"
            label="Responsable"
            allLabel="Todos"
            placeholder="Buscar persona…"
            options={peopleOptions(users)}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {WORKFLOW_ORDER.filter((s) => s !== "archived").map((s) => (
            <Link
              key={s}
              href={`/work/requests${qs({ state: sp.state === s ? undefined : s })}`}
              className={chip(sp.state === s)}
            >
              {WORKFLOW[s].label}
            </Link>
          ))}
        </div>
      </PageHeader>

      {list.length ? (
        <>
          <p className="mb-2 text-xs text-muted-foreground">
            {list.length} solicitud{list.length === 1 ? "" : "es"}
          </p>
          <RequestList requests={list} clients={clients} users={users} />
        </>
      ) : (
        <EmptyState
          icon={LayoutList}
          title="Sin solicitudes con estos filtros"
          description="Ajusta los filtros o crea una nueva solicitud."
        />
      )}
    </div>
  );
}
