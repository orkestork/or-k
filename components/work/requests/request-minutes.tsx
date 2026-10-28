"use client";

import { useState, useTransition } from "react";
import { CalendarDays, Eye, FileText, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { MinuteAgreement, RequestMinute, WorkUserRecord } from "@/types/work/domain";
import { deleteMinuteAction, saveMinuteAction, toggleAgreementAction } from "@/lib/work/actions";
import { uploadToWork } from "@/lib/work/upload";
import { fullDate } from "@/lib/work/format";
import { cn } from "@/lib/work/utils";
import { Button } from "@/components/work/ui/button";
import { Input } from "@/components/work/ui/input";
import { Label } from "@/components/work/ui/label";
import { Textarea } from "@/components/work/ui/textarea";
import { PersonAvatar } from "@/components/work/shared/people";
import { Dropzone } from "@/components/work/shared/dropzone";
import { nativeSelectClass } from "@/components/work/forms/fields";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/work/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/work/ui/alert-dialog";

// Dates are calendar days; anchor at noon so no timezone shifts the day.
const day = (ymd: string) => fullDate(`${ymd}T12:00:00`);

export function RequestMinutes({
  requestId,
  minutes,
  users,
  canEdit,
}: {
  requestId: string;
  minutes: RequestMinute[];
  users: WorkUserRecord[];
  canEdit: boolean;
}) {
  const [pending, start] = useTransition();
  const userById = (id: string | null) => (id ? users.find((u) => u.id === id) : undefined);

  const toggle = (m: RequestMinute, i: number, done: boolean) =>
    start(async () => {
      try {
        await toggleAgreementAction(requestId, m.id, i, done);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo actualizar");
      }
    });

  const remove = (m: RequestMinute) =>
    start(async () => {
      try {
        await deleteMinuteAction(requestId, m.id);
        toast.success("Acta eliminada");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo eliminar");
      }
    });

  return (
    <div className="flex flex-col gap-3">
      {minutes.length === 0 && !canEdit ? (
        <p className="text-sm text-muted-foreground">Sin actas.</p>
      ) : null}
      {minutes.map((m) => {
        const attendees = m.attendeeIds.map((id) => userById(id)).filter(Boolean) as WorkUserRecord[];
        const done = m.agreements.filter((a) => a.done).length;
        return (
          <article key={m.id} className="rounded-md border border-border p-3">
            <header className="flex flex-wrap items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{m.title}</p>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarDays className="size-3.5" /> {day(m.heldOn)}
                  {m.visibleToClient && canEdit ? (
                    <span className="ml-1 inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-primary">
                      <Eye className="size-3" /> Visible al cliente
                    </span>
                  ) : null}
                </p>
              </div>
              {canEdit ? (
                <div className="flex items-center gap-1">
                  <MinuteDialog requestId={requestId} users={users} minute={m} />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="size-7" aria-label="Eliminar acta" disabled={pending}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar el acta?</AlertDialogTitle>
                        <AlertDialogDescription>“{m.title}” se borrará de forma permanente.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove(m)}>Eliminar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ) : null}
            </header>

            {attendees.length || m.externalAttendees ? (
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <span>Asistentes:</span>
                {attendees.map((u) => (
                  <span key={u.id} className="inline-flex items-center gap-1">
                    <PersonAvatar person={u} size="xs" /> {u.name.split(" ")[0]}
                  </span>
                ))}
                {m.externalAttendees ? <span>· {m.externalAttendees}</span> : null}
              </div>
            ) : null}

            {m.summary ? (
              <Block label="Temas tratados">
                <p className="whitespace-pre-wrap">{m.summary}</p>
              </Block>
            ) : null}

            {m.agreements.length ? (
              <Block label={`Compromisos · ${done}/${m.agreements.length}`}>
                <ul className="flex flex-col gap-1.5">
                  {m.agreements.map((a, i) => {
                    const owner = userById(a.ownerId);
                    return (
                      <li key={i} className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={a.done}
                          disabled={!canEdit || pending}
                          onChange={(e) => toggle(m, i, e.target.checked)}
                          aria-label={`Compromiso cumplido: ${a.text}`}
                        />
                        <span className={cn("flex-1", a.done && "text-muted-foreground line-through")}>{a.text}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {[owner?.name.split(" ")[0], a.due ? day(a.due) : null].filter(Boolean).join(" · ")}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </Block>
            ) : null}

            {m.nextSteps ? (
              <Block label="Próximos pasos">
                <p className="whitespace-pre-wrap">{m.nextSteps}</p>
              </Block>
            ) : null}

            {m.fileUrl ? (
              <a
                href={m.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <FileText className="size-4" /> {m.fileName ?? "Acta firmada"}
              </a>
            ) : null}
          </article>
        );
      })}
      {canEdit ? <MinuteDialog requestId={requestId} users={users} /> : null}
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-3 text-sm">
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

const today = () => new Date().toLocaleDateString("en-CA");
const emptyAgreement = (): MinuteAgreement => ({ text: "", ownerId: null, due: null, done: false });

function MinuteDialog({
  requestId,
  users,
  minute,
}: {
  requestId: string;
  users: WorkUserRecord[];
  minute?: RequestMinute;
}) {
  const staff = users.filter((u) => u.active && u.role !== "client");
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [title, setTitle] = useState(minute?.title ?? "");
  const [heldOn, setHeldOn] = useState(minute?.heldOn ?? today());
  const [attendeeIds, setAttendeeIds] = useState<string[]>(minute?.attendeeIds ?? []);
  const [externalAttendees, setExternal] = useState(minute?.externalAttendees ?? "");
  const [summary, setSummary] = useState(minute?.summary ?? "");
  const [agreements, setAgreements] = useState<MinuteAgreement[]>(
    minute?.agreements.length ? minute.agreements : [emptyAgreement()],
  );
  const [nextSteps, setNextSteps] = useState(minute?.nextSteps ?? "");
  const [visibleToClient, setVisible] = useState(minute?.visibleToClient ?? false);
  const [file, setFile] = useState<File | null>(null);
  const [removeFile, setRemoveFile] = useState(false);

  const patchAgreement = (i: number, patch: Partial<MinuteAgreement>) =>
    setAgreements((list) => list.map((a, j) => (j === i ? { ...a, ...patch } : a)));

  const save = () =>
    start(async () => {
      try {
        let fileInput: { path: string; name: string } | null | undefined;
        if (file) fileInput = { path: await uploadToWork(`minutes/${requestId}`, file), name: file.name };
        else if (removeFile) fileInput = null;
        await saveMinuteAction(requestId, minute?.id ?? null, {
          title,
          heldOn,
          attendeeIds,
          externalAttendees,
          summary,
          agreements,
          nextSteps,
          visibleToClient,
          file: fileInput,
        });
        toast.success(minute ? "Acta actualizada" : "Acta registrada");
        setOpen(false);
        if (!minute) {
          setTitle("");
          setSummary("");
          setAgreements([emptyAgreement()]);
          setNextSteps("");
          setAttendeeIds([]);
          setExternal("");
          setFile(null);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo guardar el acta");
      }
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {minute ? (
          <Button size="icon" variant="ghost" className="size-7" aria-label="Editar acta">
            <Pencil className="size-3.5" />
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="self-start">
            <Plus className="size-4" /> Nueva acta
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{minute ? "Editar acta" : "Nueva acta"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_11rem]">
            <div className="grid gap-1.5">
              <Label htmlFor="minute-title">Título</Label>
              <Input
                id="minute-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Kickoff con el cliente"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="minute-date">Fecha</Label>
              <Input id="minute-date" type="date" value={heldOn} onChange={(e) => setHeldOn(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Asistentes del equipo</Label>
            <div className="flex flex-wrap gap-1.5">
              {staff.map((u) => {
                const on = attendeeIds.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setAttendeeIds((ids) => (on ? ids.filter((x) => x !== u.id) : [...ids, u.id]))
                    }
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs",
                      on ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted-foreground",
                    )}
                  >
                    <PersonAvatar person={u} size="xs" /> {u.name.split(" ")[0]}
                  </button>
                );
              })}
            </div>
            <Input
              value={externalAttendees}
              onChange={(e) => setExternal(e.target.value)}
              placeholder="Asistentes externos (ej. Jaime — Marwa, Ana — proveedor)"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="minute-summary">Temas tratados</Label>
            <Textarea id="minute-summary" value={summary} onChange={(e) => setSummary(e.target.value)} className="min-h-24" />
          </div>

          <div className="grid gap-1.5">
            <Label>Compromisos</Label>
            {agreements.map((a, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_9rem_9rem_auto]">
                <Input
                  value={a.text}
                  onChange={(e) => patchAgreement(i, { text: e.target.value })}
                  placeholder="Qué se acordó"
                />
                <select
                  aria-label="Responsable del compromiso"
                  value={a.ownerId ?? ""}
                  onChange={(e) => patchAgreement(i, { ownerId: e.target.value || null })}
                  className={nativeSelectClass}
                >
                  <option value="">Responsable</option>
                  {staff.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                <Input
                  type="date"
                  aria-label="Fecha del compromiso"
                  value={a.due ?? ""}
                  onChange={(e) => patchAgreement(i, { due: e.target.value || null })}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Quitar compromiso"
                  onClick={() => setAgreements((list) => (list.length > 1 ? list.filter((_, j) => j !== i) : [emptyAgreement()]))}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="self-start"
              onClick={() => setAgreements((list) => [...list, emptyAgreement()])}
            >
              <Plus className="size-4" /> Agregar compromiso
            </Button>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="minute-next">Próximos pasos</Label>
            <Textarea id="minute-next" value={nextSteps} onChange={(e) => setNextSteps(e.target.value)} className="min-h-16" />
          </div>

          <div className="grid gap-1.5">
            <Label>Acta firmada (opcional)</Label>
            {file ? (
              <FileRow name={file.name} onClear={() => setFile(null)} />
            ) : minute?.fileName && !removeFile ? (
              <FileRow name={minute.fileName} href={minute.fileUrl} onClear={() => setRemoveFile(true)} />
            ) : (
              <Dropzone multiple={false} onFiles={(f) => setFile(f[0])} hint="PDF o imagen del acta firmada" />
            )}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={visibleToClient} onChange={(e) => setVisible(e.target.checked)} />
            Visible para el cliente en su portal
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button size="sm" disabled={pending || !title.trim()} onClick={save}>
            {pending ? "Guardando…" : minute ? "Guardar cambios" : "Registrar acta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FileRow({ name, href, onClear }: { name: string; href?: string; onClear: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="truncate text-primary hover:underline">
          {name}
        </a>
      ) : (
        <span className="truncate">{name}</span>
      )}
      <Button type="button" size="sm" variant="ghost" onClick={onClear}>
        Quitar
      </Button>
    </div>
  );
}
