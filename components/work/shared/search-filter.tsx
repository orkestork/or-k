"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/work/utils";
import { Button } from "@/components/work/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/work/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/work/ui/command";

export type FilterOption = {
  value: string;
  label: string;
  /** Small colored badge (client mark or avatar color). */
  color?: string;
  badge?: string;
  /** Photo shown instead of the badge (people). */
  image?: string | null;
};

// Shared across pages: picking a client in Workflow also filters Calendar, etc.
const memoryKey = (param: string) => `orkwork-filter:${param}`;

function remember(param: string, value: string | null) {
  try {
    if (value) localStorage.setItem(memoryKey(param), value);
    else localStorage.removeItem(memoryKey(param));
  } catch {
    // Storage disabled: the filter just isn't remembered.
  }
}

function recall(param: string) {
  try {
    return localStorage.getItem(memoryKey(param));
  } catch {
    return null;
  }
}

// Filters on the same page restore together in one navigation, so one
// doesn't overwrite the other's param.
const pending = new Map<string, string>();
let flush: ReturnType<typeof setTimeout> | null = null;

/**
 * Searchable single-select filter stored in a URL search param, so it scales
 * to many clients/people and the filtered view can be shared or bookmarked.
 * The last choice is remembered across pages, so moving around (to a request,
 * Calendar, the sidebar…) keeps the filter until it is cleared.
 */
export function SearchFilter({
  param,
  label,
  allLabel,
  options,
  placeholder = "Buscar…",
}: {
  param: string;
  label: string;
  allLabel: string;
  options: FilterOption[];
  placeholder?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const value = searchParams.get(param);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (value) return;
    const saved = recall(param);
    if (!saved || !options.some((o) => o.value === saved)) return;
    pending.set(param, saved);
    if (flush) clearTimeout(flush);
    flush = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      for (const [k, v] of pending) if (!params.has(k)) params.set(k, v);
      pending.clear();
      flush = null;
      router.replace(`${pathname}?${params}`);
    }, 0);
    // Only on arrival: later changes go through select().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const select = (next: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set(param, next);
    else params.delete(param);
    remember(param, next);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    setOpen(false);
  };

  return (
    <div className="flex items-center">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn("h-8 gap-1.5 font-normal", current && "rounded-r-none border-primary/40 text-primary")}
          >
            <span className="text-muted-foreground">{label}:</span>
            {current ? <Badge option={current} /> : null}
            <span className="max-w-40 truncate">{current?.label ?? allLabel}</span>
            <ChevronDown className="size-3.5 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-0">
          <Command>
            <CommandInput placeholder={placeholder} />
            <CommandList>
              <CommandEmpty>Sin resultados.</CommandEmpty>
              <CommandGroup>
                <CommandItem value={`__all ${allLabel}`} onSelect={() => select(null)}>
                  <Check className={cn("size-4", current ? "opacity-0" : "opacity-100")} />
                  {allLabel}
                </CommandItem>
                {options.map((o) => (
                  <CommandItem key={o.value} value={`${o.label} ${o.value}`} onSelect={() => select(o.value)}>
                    <Check className={cn("size-4", o.value === value ? "opacity-100" : "opacity-0")} />
                    <Badge option={o} />
                    <span className="truncate">{o.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {current ? (
        <Button
          variant="outline"
          size="icon"
          className="size-8 rounded-l-none border-l-0 border-primary/40 text-primary"
          aria-label={`Quitar filtro de ${label.toLowerCase()}`}
          onClick={() => select(null)}
        >
          <X className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}

function Badge({ option }: { option: FilterOption }) {
  if (option.image) {
    // eslint-disable-next-line @next/next/no-img-element -- tiny avatar, public URL
    return <img src={option.image} alt="" className="size-5 shrink-0 rounded-full object-cover" />;
  }
  if (!option.color) return null;
  return (
    <span
      className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded px-1 text-[10px] font-bold leading-none text-white"
      style={{ backgroundColor: option.color }}
    >
      {option.badge}
    </span>
  );
}
