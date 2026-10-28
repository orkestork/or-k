import type { Metadata } from "next";
import { getClients, getRequests, getUsers } from "@/lib/work/data";
import { PageHeader } from "@/components/work/shared/page-header";
import { involves } from "@/lib/work/people";
import { KanbanBoard } from "@/components/work/workflow/kanban-board";
import { SearchFilter } from "@/components/work/shared/search-filter";
import { clientOptions, peopleOptions } from "@/components/work/shared/filter-options";

export const metadata: Metadata = { title: "Workflow · OR-K WORK" };

export default async function WorkflowPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; assignee?: string }>;
}) {
  const sp = await searchParams;
  const [requests, clients, users] = await Promise.all([
    getRequests(),
    getClients(),
    getUsers(),
  ]);

  const board = requests.filter(
    (r) =>
      r.state !== "archived" &&
      (!sp.client || r.clientId === sp.client) &&
      (!sp.assignee || involves(r, sp.assignee)),
  );

  return (
    <div>
      <PageHeader
        title="Workflow"
        description="Arrastra una tarjeta a otra columna para cambiar su estado."
      >
        <div className="flex flex-wrap items-center gap-2">
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
          <span className="text-xs text-muted-foreground">
            {board.length} solicitud{board.length === 1 ? "" : "es"}
          </span>
        </div>
      </PageHeader>
      <KanbanBoard key={`${sp.client ?? ""}-${sp.assignee ?? ""}`} requests={board} clients={clients} users={users} />
    </div>
  );
}
