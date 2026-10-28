import type { Metadata } from "next";
import Link from "next/link";
import {
  AtSign,
  Bell,
  CalendarClock,
  CheckCircle2,
  RotateCcw,
  UserPlus,
} from "lucide-react";
import { getNotifications } from "@/lib/work/data";
import { relativeTime } from "@/lib/work/format";
import { PageHeader } from "@/components/work/shared/page-header";
import { EmptyState } from "@/components/work/shared/empty-state";
import { MarkAllRead } from "@/components/work/shared/mark-read";

export const metadata: Metadata = { title: "Inbox · OR-K WORK" };

const ICON = {
  assignment: UserPlus,
  mention: AtSign,
  approval: CheckCircle2,
  adjustment: RotateCcw,
  deadline: CalendarClock,
  status: Bell,
} as const;

export default async function InboxPage() {
  const notifications = await getNotifications();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Inbox"
        description="Asignaciones, menciones, aprobaciones y alertas de fecha."
        actions={notifications.some((n) => !n.read && n.kind !== "deadline") ? <MarkAllRead /> : null}
      />
      {notifications.length === 0 ? (
        <EmptyState icon={Bell} title="Bandeja al día" />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {notifications.map((n) => {
            const Icon = ICON[n.kind];
            return (
              <li key={n.id}>
                <Link
                  href={n.href}
                  className="flex items-start gap-3 px-3 py-3 transition-colors hover:bg-muted/40"
                >
                  <span
                    className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full ${
                      n.read
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary/15 text-primary"
                    }`}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${n.read ? "text-muted-foreground" : ""}`}>
                      {n.body}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {relativeTime(n.at)}
                    </p>
                  </div>
                  {!n.read ? (
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
