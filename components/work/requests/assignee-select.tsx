"use client";

import { useState, useTransition } from "react";
import { Check, Star, UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { WorkUserRecord } from "@/types/work/domain";
import { assignRequestAction } from "@/lib/work/actions";
import { cn } from "@/lib/work/utils";
import { Button } from "@/components/work/ui/button";
import { PersonAvatar } from "@/components/work/shared/people";
import { AwayBadge } from "@/components/work/team/away-badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/work/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/work/ui/command";

/**
 * Picks the people on a request. The first one is the lead (star); the rest
 * collaborate. Saves on close so several changes become one update.
 */
export function AssigneesPicker({
  requestId,
  peopleIds,
  users,
}: {
  requestId: string;
  peopleIds: string[];
  users: WorkUserRecord[];
}) {
  const staff = users.filter((u) => (u.active && u.role !== "client") || peopleIds.includes(u.id));
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(peopleIds);
  const [pending, start] = useTransition();
  const people = peopleIds.map((id) => users.find((u) => u.id === id)).filter(Boolean) as WorkUserRecord[];

  const toggle = (id: string) =>
    setDraft((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  const makeLead = (id: string) => setDraft((ids) => [id, ...ids.filter((x) => x !== id)]);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setDraft(peopleIds);
      return;
    }
    if (draft.join() === peopleIds.join()) return;
    start(async () => {
      try {
        await assignRequestAction(requestId, draft);
        toast.success(draft.length ? "Responsables actualizados" : "Sin responsables");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo asignar");
      }
    });
  };

  return (
    <div className="flex flex-col gap-1.5">
      {people.length ? (
        <ul className="flex flex-col gap-1.5">
          {people.map((u, i) => (
            <li key={u.id} className="flex items-center gap-2 text-sm">
              <PersonAvatar person={u} size="xs" />
              <span className="truncate">{u.name}</span>
              <AwayBadge person={u} users={users} compact />
              {i === 0 && people.length > 1 ? (
                <span className="ml-auto text-xs text-muted-foreground">Principal</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <span className="text-sm text-muted-foreground">Sin asignar</span>
      )}
      {people
        .filter((u) => u.away?.substituteId)
        .map((u) => {
          const sub = users.find((x) => x.id === u.away!.substituteId);
          return sub ? (
            <p key={u.id} className="text-xs text-muted-foreground">
              Mientras {u.name.split(" ")[0]} no está, lo cubre <span className="text-foreground">{sub.name}</span>.
            </p>
          ) : null;
        })}
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button size="sm" variant="ghost" className="h-7 self-start px-2 text-xs" disabled={pending}>
            <UserPlus className="size-3.5" /> {people.length ? "Cambiar responsables" : "Asignar"}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-0">
          <Command>
            <CommandInput placeholder="Buscar persona…" />
            <CommandList>
              <CommandEmpty>Sin resultados.</CommandEmpty>
              <CommandGroup>
                {staff.map((u) => {
                  const on = draft.includes(u.id);
                  const lead = draft[0] === u.id;
                  return (
                    <CommandItem key={u.id} value={`${u.name} ${u.title}`} onSelect={() => toggle(u.id)}>
                      <Check className={cn("size-4", on ? "opacity-100" : "opacity-0")} />
                      <PersonAvatar person={u} size="xs" />
                      <span className="truncate">{u.name}</span>
                      {u.away ? <span className="text-xs text-tone-warn">(off)</span> : null}
                      {on ? (
                        <button
                          type="button"
                          aria-label={lead ? "Responsable principal" : `Hacer principal a ${u.name}`}
                          title={lead ? "Responsable principal" : "Hacer principal"}
                          onClick={(e) => {
                            e.stopPropagation();
                            makeLead(u.id);
                          }}
                          className="ml-auto"
                        >
                          <Star className={cn("size-3.5", lead ? "fill-primary text-primary" : "text-muted-foreground")} />
                        </button>
                      ) : null}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
          <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
            ★ marca al responsable principal. Se guarda al cerrar.
          </p>
        </PopoverContent>
      </Popover>
    </div>
  );
}
