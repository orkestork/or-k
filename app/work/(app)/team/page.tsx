import type { Metadata } from "next";
import Link from "next/link";
import { getClients, getMe, getUsers, getWorkload, isAdmin } from "@/lib/work/data";
import { OrgChart } from "@/components/work/team/org-chart";
import { AwayBadge } from "@/components/work/team/away-badge";
import { supabaseConfigured } from "@/lib/work/supabase/env";
import { PageHeader } from "@/components/work/shared/page-header";
import { PersonAvatar } from "@/components/work/shared/people";
import { Card } from "@/components/work/ui/card";
import { Button } from "@/components/work/ui/button";
import { UserPlus } from "lucide-react";
import { isHr } from "@/lib/work/people";
import { RemoveMemberButton } from "@/components/work/settings/team-admin";

export const metadata: Metadata = { title: "Team · OR-K WORK" };

const LOAD: Record<string, { label: string; className: string }> = {
  low: { label: "Ligera", className: "bg-tone-positive/10 text-tone-positive" },
  medium: { label: "Media", className: "bg-tone-warn/10 text-tone-warn" },
  high: { label: "Alta", className: "bg-primary/10 text-primary" },
};

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  const [workload, me, users] = await Promise.all([getWorkload(), getMe(), getUsers()]);
  const canManage = supabaseConfigured && isAdmin(me);
  const canCreatePeople = supabaseConfigured && (isAdmin(me) || isHr(me?.role));
  const clients = canManage ? await getClients() : [];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Equipo"
        description="Integrantes de OR-K y su carga de trabajo actual."
        actions={
          canCreatePeople ? (
            <Button size="sm" asChild>
              <Link href="/work/team/new">
                <UserPlus className="size-4" /> Nueva persona
              </Link>
            </Button>
          ) : null
        }
      >
        <div className="inline-flex rounded-md border border-border p-0.5 text-sm">
          {[
            { id: "list", label: "Lista y carga" },
            { id: "org", label: "Organigrama" },
          ].map((t) => (
            <Link
              key={t.id}
              href={t.id === "list" ? "/work/team" : "/work/team?view=org"}
              className={`rounded px-3 py-1 ${
                (view === "org") === (t.id === "org") ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </PageHeader>
      {view === "org" ? (
        <OrgChart users={users} />
      ) : (
      <Card className="gap-0 py-0">
        <ul className="divide-y divide-border">
          {workload.map(({ user, count, urgent, load }) => (
            <li
              key={user.id}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
            >
              <Link href={`/work/team/${user.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <PersonAvatar person={user} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    <span className="truncate">{user.name}</span>
                    <AwayBadge person={user} users={users} />
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.title}
                  </p>
                </div>
              </Link>
              <div className="hidden text-right text-xs text-muted-foreground sm:block">
                {urgent} prioritarias
              </div>
              <span className="font-mono text-sm tabular-nums">
                {count} tareas
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${LOAD[load].className}`}
              >
                {LOAD[load].label}
              </span>
              {canManage && user.id !== me?.id ? (
                <RemoveMemberButton id={user.id} name={user.name} />
              ) : null}
            </li>
          ))}
        </ul>
      </Card>
      )}
    </div>
  );
}
