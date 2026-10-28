import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Client, Request, WorkUserRecord } from "@/types/work/domain";
import { StatusBadge, PriorityBadge, DeadlinePill } from "@/components/work/shared/badges";
import { PersonAvatar, PersonStack } from "@/components/work/shared/people";
import { ClientMark } from "@/components/work/shared/page-header";
import { peopleOn } from "@/lib/work/people";

export function RequestList({
  requests,
  clients,
  users,
  showClient = true,
}: {
  requests: Request[];
  clients: Client[];
  users: WorkUserRecord[];
  showClient?: boolean;
}) {
  const clientById = (id: string) => clients.find((c) => c.id === id);
  const userById = (id: string | null) =>
    id ? users.find((u) => u.id === id) : undefined;

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {requests.map((r) => {
        const client = clientById(r.clientId);
        const people = peopleOn(r).map((id) => userById(id)).filter(Boolean) as WorkUserRecord[];
        return (
          <li key={r.id}>
            <Link
              href={`/work/requests/${r.id}`}
              className="group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40"
            >
              {showClient && client ? (
                <ClientMark
                  name={client.name}
                  logoText={client.logoText}
                  color={client.accentColor}
                  size={26}
                />
              ) : null}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{r.title}</span>
                  <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  <span className="font-mono">{r.id}</span> · {r.campaign}
                </p>
              </div>

              <div className="hidden shrink-0 items-center gap-2 sm:flex">
                <PriorityBadge priority={r.priority} />
                <StatusBadge state={r.state} />
              </div>

              <DeadlinePill iso={r.deadline} className="hidden shrink-0 md:inline-flex" />

              {people.length ? (
                <div className="shrink-0">
                  <PersonStack people={people} max={3} />
                </div>
              ) : (
                <span className="grid size-6 shrink-0 place-items-center rounded-full border border-dashed border-border text-xs text-muted-foreground">
                  ?
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
