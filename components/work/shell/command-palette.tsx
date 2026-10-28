"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FolderKanban, LayoutList, Plus, Search, User, Users } from "lucide-react";
import type { SearchHit } from "@/lib/work/data";
import { searchAction } from "@/lib/work/actions";
import { WORK_NAV } from "@/lib/work/navigation";
import { Button } from "@/components/work/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/work/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/work/ui/command";

const KIND = {
  request: { label: "Solicitudes", icon: LayoutList },
  client: { label: "Clientes", icon: Users },
  project: { label: "Proyectos", icon: FolderKanban },
  person: { label: "Equipo", icon: User },
} as const;

/** ⌘K / Ctrl+K: jump to any request, client, project, person or page. */
export function CommandPalette({ canSeeAll = true, canSeeFinance = false }: { canSeeAll?: boolean; canSeeFinance?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [pending, start] = useTransition();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (term.trim().length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(() => start(async () => setHits(await searchAction(term))), 180);
    return () => clearTimeout(t);
  }, [term]);

  const go = (href: string) => {
    setOpen(false);
    setTerm("");
    router.push(href);
  };

  const q = term.trim().toLowerCase();
  const pages = WORK_NAV.flatMap((g) => g.items).filter(
    (i) => (canSeeAll || !i.managersOnly) && (canSeeFinance || !i.financeOnly) && (!q || i.label.toLowerCase().includes(q)),
  );
  const grouped = (Object.keys(KIND) as (keyof typeof KIND)[])
    .map((k) => ({ kind: k, items: hits.filter((h) => h.kind === k) }))
    .filter((g) => g.items.length);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-2 px-2.5 text-muted-foreground"
        onClick={() => setOpen(true)}
        aria-label="Buscar"
      >
        <Search className="size-4" />
        <span className="hidden sm:inline">Buscar…</span>
        <kbd className="hidden rounded border border-border px-1 font-mono text-[11px] sm:inline">⌘K</kbd>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-xl" showCloseButton={false}>
          <DialogTitle className="sr-only">Buscar en OR-K WORK</DialogTitle>
          <DialogDescription className="sr-only">Solicitudes, clientes, proyectos, personas y páginas</DialogDescription>
          <Command shouldFilter={false}>
            <CommandInput
              value={term}
              onValueChange={setTerm}
              placeholder="Busca una solicitud (ORK-2026-0001), cliente, proyecto o persona…"
            />
            <CommandList className="max-h-[60vh]">
              <CommandEmpty>{pending ? "Buscando…" : "Sin resultados."}</CommandEmpty>
              {!q ? (
                <CommandGroup heading="Acciones">
                  <CommandItem onSelect={() => go("/work/requests/new")}>
                    <Plus className="size-4" /> Nueva solicitud
                  </CommandItem>
                  {canSeeAll ? (
                    <>
                      <CommandItem onSelect={() => go("/work/projects/new")}>
                        <Plus className="size-4" /> Nuevo proyecto
                      </CommandItem>
                      <CommandItem onSelect={() => go("/work/clients/new")}>
                        <Plus className="size-4" /> Nuevo cliente
                      </CommandItem>
                    </>
                  ) : null}
                </CommandGroup>
              ) : null}
              {grouped.map((g) => {
                const Icon = KIND[g.kind].icon;
                return (
                  <CommandGroup key={g.kind} heading={KIND[g.kind].label}>
                    {g.items.map((h) => (
                      <CommandItem key={`${h.kind}-${h.id}`} value={`${h.kind}-${h.id}`} onSelect={() => go(h.href)}>
                        <Icon className="size-4" />
                        <span className="min-w-0 flex-1 truncate">{h.title}</span>
                        <span className="shrink-0 truncate text-xs text-muted-foreground">{h.subtitle}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
              {pages.length ? (
                <CommandGroup heading="Ir a">
                  {pages.map((p) => (
                    <CommandItem key={p.href} value={`page-${p.href}`} onSelect={() => go(p.href)}>
                      <p.icon className="size-4" /> {p.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
