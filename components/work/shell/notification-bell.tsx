"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import type { Notification } from "@/types/work/domain";
import { markAllReadAction } from "@/lib/work/actions";
import { relativeTime } from "@/lib/work/format";
import { cn } from "@/lib/work/utils";
import { NOTIFICATION_ICON } from "@/components/work/shared/notification-icons";
import { Button } from "@/components/work/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/work/ui/popover";

/** Topbar bell: unread count plus the latest notifications, linking to the Inbox. */
export function NotificationBell({ notifications }: { notifications: Notification[] }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const unread = notifications.filter((n) => !n.read).length;
  // Deadline alerts are live and can't be marked as read.
  const markable = notifications.some((n) => !n.read && n.kind !== "deadline");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-8" aria-label={`Notificaciones${unread ? ` · ${unread} sin leer` : ""}`}>
          <Bell className="size-4" />
          {unread ? (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 font-mono text-[10px] font-semibold text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-0 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-sm font-medium">Notificaciones</p>
          {markable ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => start(() => markAllReadAction())}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <CheckCheck className="size-3.5" /> Marcar leídas
            </button>
          ) : null}
        </div>
        {notifications.length ? (
          <ul className="max-h-96 divide-y divide-border overflow-y-auto">
            {notifications.slice(0, 8).map((n) => {
              const Icon = NOTIFICATION_ICON[n.kind];
              return (
                <li key={n.id}>
                  <Link
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-2.5 px-3 py-2.5 transition-colors hover:bg-muted/40"
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full",
                        n.read ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary",
                      )}
                    >
                      <Icon className="size-3" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={cn("line-clamp-2 text-xs", n.read && "text-muted-foreground")}>{n.body}</p>
                      <p className="text-[11px] text-muted-foreground">{relativeTime(n.at)}</p>
                    </div>
                    {!n.read ? <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" /> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">Bandeja al día.</p>
        )}
        <Link
          href="/work/inbox"
          onClick={() => setOpen(false)}
          className="block border-t border-border px-3 py-2 text-center text-xs text-muted-foreground hover:text-foreground"
        >
          Ver todo en Inbox
        </Link>
      </PopoverContent>
    </Popover>
  );
}
