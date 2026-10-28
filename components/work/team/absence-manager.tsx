"use client";

import { useState, useTransition } from "react";
import { CalendarOff, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Absence, WorkUserRecord } from "@/types/work/domain";
import { decideAbsenceAction, deleteAbsenceAction, saveAbsenceAction } from "@/lib/work/actions";
import { ABSENCE_LABEL } from "@/lib/work/people";
import { Button } from "@/components/work/ui/button";
import { Input } from "@/components/work/ui/input";
import { Label } from "@/components/work/ui/label";
import { nativeSelectClass } from "@/components/work/forms/fields";

const day = (ymd: string) => new Date(`${ymd}T12:00:00`).toLocaleDateString("es", { day: "numeric", month: "short" });
const today = () => new Date().toLocaleDateString("en-CA");

export function AbsenceManager({
  person,
  absences,
  users,
  canEdit,
  canDecide = false,
  asRequest = false,
}: {
  person: WorkUserRecord;
  absences: Absence[];
  users: WorkUserRecord[];
  canEdit: boolean;
  /** Manager / HR: approve or reject pending requests. */
  canDecide?: boolean;
  /** The person asks for their own time off (it starts pending). */
  asRequest?: boolean;
}) {
  const staff = users.filter((u) => u.id !== person.id && u.active && u.role !== "client");
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Absence["kind"]>("vacation");
  const [startOn, setStartOn] = useState(today());
  const [endOn, setEndOn] = useState(today());
  const defaultSub = person.backupId ?? person.managerId ?? "";
  const [substituteId, setSubstituteId] = useState(defaultSub);
  const [note, setNote] = useState("");
  const userById = (id: string | null) => (id ? users.find((u) => u.id === id) : undefined);

  const save = () =>
    start(async () => {
      try {
        await saveAbsenceAction({ userId: person.id, kind, startOn, endOn, substituteId: substituteId || null, note });
        toast.success(asRequest ? "Solicitud enviada" : "Ausencia registrada", {
          description: asRequest
            ? "Le avisamos a tu jefe directo y a Talento humano para que la aprueben."
            : substituteId
              ? "Le avisamos a quien la reemplaza."
              : undefined,
        });
        setOpen(false);
        setNote("");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo guardar");
      }
    });

  return (
    <div className="flex flex-col gap-3 text-sm">
      {absences.length ? (
        <ul className="flex flex-col gap-2">
          {absences.map((a) => {
            const sub = userById(a.substituteId);
            const now = a.startOn <= today();
            return (
              <li key={a.id} className="flex items-start gap-2 rounded-md border border-border px-3 py-2">
                <CalendarOff className={now ? "mt-0.5 size-4 text-tone-warn" : "mt-0.5 size-4 text-muted-foreground"} />
                <div className="min-w-0 flex-1">
                  <p>
                    <span className="font-medium">{ABSENCE_LABEL[a.kind]}</span> · {day(a.startOn)} → {day(a.endOn)}
                    {now && a.status === "approved" ? <span className="ml-1 text-xs text-tone-warn">(ahora)</span> : null}
                    <StatusChip status={a.status} />
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {sub ? `Lo reemplaza ${sub.name}` : "Sin reemplazo asignado"}
                    {a.note ? ` · ${a.note}` : ""}
                  </p>
                </div>
                {canDecide && a.status === "pending" ? (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      className="h-7 px-2 text-xs"
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          try {
                            await decideAbsenceAction(a.id, "approved");
                            toast.success("Solicitud aprobada");
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : "No se pudo aprobar");
                          }
                        })
                      }
                    >
                      Aprobar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          try {
                            await decideAbsenceAction(a.id, "rejected");
                            toast("Solicitud rechazada");
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : "No se pudo rechazar");
                          }
                        })
                      }
                    >
                      Rechazar
                    </Button>
                  </div>
                ) : null}
                {canEdit ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    disabled={pending}
                    aria-label="Eliminar ausencia"
                    onClick={() =>
                      start(async () => {
                        try {
                          await deleteAbsenceAction(a.id);
                          toast.success("Ausencia eliminada");
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "No se pudo eliminar");
                        }
                      })
                    }
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-muted-foreground">Sin ausencias programadas.</p>
      )}

      {canEdit ? (
        open ? (
          <div className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="abs-kind">Motivo</Label>
              <select id="abs-kind" className={nativeSelectClass} value={kind} onChange={(e) => setKind(e.target.value as Absence["kind"])}>
                {Object.entries(ABSENCE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {k === "other" ? "Otro" : v}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="abs-sub">
                Lo reemplaza{" "}
                {substituteId && substituteId === defaultSub ? (
                  <span className="font-normal text-muted-foreground">· por defecto</span>
                ) : null}
              </Label>
              <select id="abs-sub" className={nativeSelectClass} value={substituteId} onChange={(e) => setSubstituteId(e.target.value)}>
                <option value="">Nadie</option>
                {staff.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="abs-start">Desde</Label>
              <Input id="abs-start" type="date" value={startOn} onChange={(e) => setStartOn(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="abs-end">Hasta (último día fuera)</Label>
              <Input id="abs-end" type="date" value={endOn} min={startOn} onChange={(e) => setEndOn(e.target.value)} />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="abs-note">Nota (opcional)</Label>
              <Input id="abs-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej. viaje familiar · disponible por WhatsApp para urgencias" />
            </div>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button size="sm" disabled={pending} onClick={save}>
                {asRequest ? "Enviar solicitud" : "Guardar ausencia"}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="self-start"
            onClick={() => {
              setSubstituteId(defaultSub);
              setOpen(true);
            }}
          >
            <Plus className="size-4" /> {asRequest ? "Solicitar vacaciones o permiso" : "Marcar ausencia"}
          </Button>
        )
      ) : null}
    </div>
  );
}

function StatusChip({ status }: { status: Absence["status"] }) {
  if (status === "approved") return null;
  return (
    <span
      className={
        status === "pending"
          ? "ml-2 rounded-full bg-tone-info/15 px-2 py-0.5 text-xs text-tone-info"
          : "ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground line-through"
      }
    >
      {status === "pending" ? "Pendiente de aprobación" : "Rechazada"}
    </span>
  );
}
