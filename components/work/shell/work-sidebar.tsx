"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WORK_NAV } from "@/lib/work/navigation";
import { cn } from "@/lib/work/utils";

export function WorkSidebar({
  className,
  canSeeAll = true,
  canSeeFinance = false,
}: {
  className?: string;
  canSeeAll?: boolean;
  canSeeFinance?: boolean;
}) {
  const pathname = usePathname();
  const nav = WORK_NAV.map((g) => ({
    ...g,
    items: g.items.filter((i) => (canSeeAll || !i.managersOnly) && (canSeeFinance || !i.financeOnly)),
  })).filter(
    (g) => g.items.length,
  );

  return (
    <div className={cn("flex h-full flex-col bg-sidebar", className)}>
      <div className="flex h-14 items-center gap-2.5 px-4">
        <span className="grid size-7 place-items-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
          O
        </span>
        <span className="text-sm font-semibold tracking-tight">OR-K WORK</span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        <nav className="flex flex-col gap-4">
          {nav.map((group) => (
            <div key={group.id} className="flex flex-col gap-0.5">
              {group.label ? (
                <p className="px-2 pb-1 pt-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
                  {group.label}
                </p>
              ) : null}
              {group.items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/80 transition-colors",
                      "hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      active &&
                        "bg-sidebar-accent font-medium text-sidebar-foreground",
                    )}
                  >
                    <item.icon className="size-4 shrink-0 opacity-80" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}
