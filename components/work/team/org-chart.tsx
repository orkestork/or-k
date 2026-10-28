import Link from "next/link";
import type { WorkUserRecord } from "@/types/work/domain";
import { PersonAvatar } from "@/components/work/shared/people";
import { ROLE_LABEL } from "@/components/work/settings/roles";
import { AwayBadge } from "./away-badge";

/** Reporting tree. People without a manager (or whose manager left) are roots. */
export function OrgChart({ users }: { users: WorkUserRecord[] }) {
  const staff = users.filter((u) => u.active && u.role !== "client");
  const ids = new Set(staff.map((u) => u.id));
  const reportsOf = (id: string) =>
    staff.filter((u) => u.managerId === id).sort((a, b) => a.name.localeCompare(b.name));
  const roots = staff
    .filter((u) => !u.managerId || !ids.has(u.managerId))
    .sort((a, b) => reportsOf(b.id).length - reportsOf(a.id).length || a.name.localeCompare(b.name));

  const node = (u: WorkUserRecord, seen: Set<string>): React.ReactNode => {
    if (seen.has(u.id)) return null;
    const next = new Set(seen).add(u.id);
    const reports = reportsOf(u.id);
    return (
      <li key={u.id}>
        <Link
          href={`/work/team/${u.id}`}
          className={`flex w-48 flex-col items-center gap-1.5 rounded-lg border bg-card px-3 py-3 text-center shadow-sm transition-colors hover:border-primary/50 ${
            u.away ? "border-tone-warn/50 opacity-80" : "border-border"
          }`}
        >
          <PersonAvatar person={u} size="md" />
          <span className="text-sm font-medium leading-tight">{u.name}</span>
          <span className="text-xs leading-tight text-muted-foreground">{u.title || ROLE_LABEL[u.role]}</span>
          {u.away ? <AwayBadge person={u} users={users} compact /> : null}
          {u.away?.substituteId ? (
            <span className="text-[11px] text-muted-foreground">
              Reemplaza: {users.find((x) => x.id === u.away!.substituteId)?.name.split(" ")[0]}
            </span>
          ) : null}
          {reports.length ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
              {reports.length} a cargo
            </span>
          ) : null}
        </Link>
        {reports.length ? <ul>{reports.map((r) => node(r, next))}</ul> : null}
      </li>
    );
  };

  const unassigned = roots.filter((r) => !reportsOf(r.id).length);
  const heads = roots.filter((r) => reportsOf(r.id).length);

  return (
    <div className="flex flex-col gap-6">
      {heads.length ? (
        <div className="org-tree overflow-x-auto pb-4">
          <ul>{heads.map((h) => node(h, new Set()))}</ul>
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
          Todavía no hay jefes asignados. Abre la ficha de cada persona y elige su «Jefe directo» para armar el organigrama.
        </p>
      )}
      {unassigned.length ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Sin jefe directo asignado · {unassigned.length}
          </p>
          <div className="flex flex-wrap gap-2">
            {unassigned.map((u) => (
              <Link
                key={u.id}
                href={`/work/team/${u.id}`}
                className="flex items-center gap-2 rounded-full border border-border px-2 py-1 text-sm hover:border-primary/50"
              >
                <PersonAvatar person={u} size="xs" /> {u.name}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
