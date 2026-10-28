"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { Absence, WorkUserRecord } from "@/types/work/domain";
import { decideAbsenceAction } from "@/lib/work/actions";
import { ABSENCE_LABEL } from "@/lib/work/people";
import { Button } from "@/components/work/ui/button";
import { PersonAvatar } from "@/components/work/shared/people";

const day = (ymd: string) => new Date(`${ymd}T12:00:00`).toLocaleDateString("es", { day: "numeric", month: "short" });

export function PendingRequests({ requests, users }: { requests: Absence[]; users: WorkUserRecord[] }) {
  const [pending, start] = useTransition();
  const userById = (id: string | null) => (id ? users.find((u) => u.id === id) : undefined);
  if (!requests.length) return <p className="text-sm text-muted-foreground">No hay solicitudes por aprobar.</p>;
  const decide = (id: string, d: "approved" | "rejected") =>
    start(async () => {
      try {
        await decideAbsenceAction(id, d);
        toast.success(d === "approved" ? "Solicitud aprobada" : "Solicitud rechazada");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo guardar");
      }
    });
  return (
    <ul className="flex flex-col divide-y divide-border">
      {requests.map((a) => {
        const who = userById(a.userId);
        const sub = userById(a.substituteId);
        return (
          <li key={a.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
            {who ? <PersonAvatar person={who} size="sm" /> : null}
            <div className="min-w-0 flex-1">
              <Link href={`/work/hr/${a.userId}`} className="font-medium hover:text-primary">
                {who?.name ?? "—"}
              </Link>
              <p className="text-xs text-muted-foreground">
                {ABSENCE_LABEL[a.kind]} · {day(a.startOn)} → {day(a.endOn)}
                {sub ? ` · lo cubre ${sub.name.split(" ")[0]}` : ""}
                {a.note ? ` · ${a.note}` : ""}
              </p>
            </div>
            <Button size="sm" disabled={pending} onClick={() => decide(a.id, "approved")}>
              Aprobar
            </Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => decide(a.id, "rejected")}>
              Rechazar
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
