"use client";

import { Menu } from "lucide-react";
import type { WorkUser } from "@/lib/work/auth/session";
import type { Notification } from "@/types/work/domain";
import { signOut } from "@/lib/work/auth/actions";
import { Button } from "@/components/work/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/work/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/work/ui/dropdown-menu";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/work/ui/avatar";
import { ThemeToggle } from "@/components/work/theme/theme-toggle";
import { WorkSidebar } from "./work-sidebar";
import { seesAll, seesFinance } from "@/lib/work/people";
import { CommandPalette } from "./command-palette";
import { NotificationBell } from "./notification-bell";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function WorkTopbar({
  user,
  title,
  notifications,
}: {
  user: WorkUser | null;
  title: string;
  notifications: Notification[];
}) {
  return (
    <header className="flex h-14 items-center gap-3 border-b border-border px-4">
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Abrir navegación"
          >
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Navegación</SheetTitle>
          <WorkSidebar canSeeAll={seesAll(user?.role)} canSeeFinance={seesFinance(user?.role)} />
        </SheetContent>
      </Sheet>

      <h1 className="text-sm font-medium">{title}</h1>

      <div className="ml-auto flex items-center gap-2">
        <CommandPalette canSeeAll={seesAll(user?.role)} canSeeFinance={seesFinance(user?.role)} />
        <ThemeToggle />
        <NotificationBell notifications={notifications} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 gap-2 px-1.5"
              aria-label="Cuenta"
            >
              <Avatar className="size-6">
                {user?.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.name} className="object-cover" /> : null}
                <AvatarFallback className="text-[11px]">
                  {user ? initials(user.name) : "?"}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm sm:inline">
                {user?.name ?? "Invitado"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">{user?.name ?? "Invitado"}</p>
              <p className="text-xs text-muted-foreground">
                {user?.email ?? "sin sesión"}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <form action={signOut}>
              <DropdownMenuItem asChild>
                <button type="submit" className="w-full">
                  Cerrar sesión
                </button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
