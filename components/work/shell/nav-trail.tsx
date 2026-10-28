"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

const KEY = "orkwork-trail";
const MAX = 20;
// Forms are skipped so "back" never lands on a form you already submitted.
const isForm = (path: string) => /\/(edit|new)$/.test(path);

function read(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function write(trail: string[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(trail.slice(-MAX)));
  } catch {
    // Private mode / storage disabled: back links fall back to their default.
  }
}

/** Records the pages visited inside the workspace (mounted once in the shell). */
export function NavTrailRecorder() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  useEffect(() => {
    if (isForm(pathname)) return;
    const url = search ? `${pathname}?${search}` : pathname;
    const trail = read();
    if (trail[trail.length - 1] === url) return;
    // Arriving at the previous page counts as going back.
    if (trail[trail.length - 2] === url) trail.pop();
    else trail.push(url);
    write(trail);
  }, [pathname, search]);
  return null;
}

const LABELS: [RegExp, string][] = [
  [/^\/work\/home/, "Home"],
  [/^\/work\/inbox/, "Inbox"],
  [/^\/work\/approvals/, "Approvals"],
  [/^\/work\/workflow/, "Workflow"],
  [/^\/work\/calendar/, "Calendario"],
  [/^\/work\/insights/, "Insights"],
  [/^\/work\/assets/, "Assets"],
  [/^\/work\/settings/, "Settings"],
  [/^\/work\/requests\/[^/?]+/, "Solicitud"],
  [/^\/work\/requests/, "Solicitudes"],
  [/^\/work\/projects\/[^/?]+/, "Proyecto"],
  [/^\/work\/projects/, "Proyectos"],
  [/^\/work\/clients\/[^/?]+/, "Cliente"],
  [/^\/work\/clients/, "Clientes"],
  [/^\/work\/team\/[^/?]+/, "Integrante"],
  [/^\/work\/team/, "Equipo"],
  [/^\/work\/portal\/[^/?]+/, "Pieza"],
  [/^\/work\/portal/, "Tus piezas"],
];

const labelFor = (url: string) => LABELS.find(([re]) => re.test(url))?.[1] ?? "Volver";

/**
 * "← Back" that returns to the page you came from inside the workspace,
 * or to `fallbackHref` when the page was opened directly.
 */
export function BackLink({ fallbackHref, fallbackLabel }: { fallbackHref: string; fallbackLabel: string }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [target, setTarget] = useState({ href: fallbackHref, label: fallbackLabel });

  useEffect(() => {
    const here = search ? `${pathname}?${search}` : pathname;
    const trail = read();
    const at = trail.lastIndexOf(here);
    const prev = at > 0 ? trail[at - 1] : isForm(pathname) ? trail[trail.length - 1] : undefined;
    if (prev && prev !== here) setTarget({ href: prev, label: labelFor(prev) });
  }, [pathname, search]);

  return (
    <Link
      href={target.href}
      className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" /> {target.label}
    </Link>
  );
}
