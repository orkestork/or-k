"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Plus, X } from "lucide-react";
import { toast } from "sonner";
import type { Client, Project, WorkUserRecord } from "@/types/work/domain";
import { addRequestFilesAction, createRequestWithSubtasksAction } from "@/lib/work/actions";
import { formatBytes, uploadToWork } from "@/lib/work/upload";
import { Button } from "@/components/work/ui/button";
import { Input } from "@/components/work/ui/input";
import { Dropzone } from "@/components/work/shared/dropzone";
import { FormSection, RequestFields } from "./request-fields";
import { nativeSelectClass } from "./fields";

type DraftSubtask = { title: string; assigneeId: string; dueOn: string };
const emptySubtask = (): DraftSubtask => ({ title: "", assigneeId: "", dueOn: "" });
const MAX_MB = 50;

export function NewRequestForm({
  projects,
  clients,
  users,
  defaultProjectId,
}: {
  projects: Project[];
  clients: Client[];
  users: WorkUserRecord[];
  defaultProjectId?: string;
}) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [subtasks, setSubtasks] = useState<DraftSubtask[]>([emptySubtask()]);
  const [files, setFiles] = useState<File[]>([]);
  const staff = users.filter((u) => u.active && u.role !== "client");

  const patch = (i: number, p: Partial<DraftSubtask>) =>
    setSubtasks((list) => list.map((s, j) => (j === i ? { ...s, ...p } : s)));

  const addFiles = (list: File[]) => {
    const tooBig = list.filter((f) => f.size > MAX_MB * 1024 * 1024);
    if (tooBig.length) toast.error(`Máximo ${MAX_MB} MB por archivo: ${tooBig.map((f) => f.name).join(", ")}`);
    setFiles((prev) => [...prev, ...list.filter((f) => f.size <= MAX_MB * 1024 * 1024)]);
  };

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const data = new FormData(e.currentTarget);
    start(async () => {
      const res = await createRequestWithSubtasksAction(
        data,
        subtasks.map((s) => ({ title: s.title, assigneeId: s.assigneeId || null, dueOn: s.dueOn || null })),
      );
      if ("error" in res) {
        setError(res.error);
        return;
      }
      if (files.length) {
        try {
          const uploaded = [];
          for (const f of files) {
            uploaded.push({ name: f.name, size: f.size, storagePath: await uploadToWork(`requests/${res.id}/files`, f) });
          }
          await addRequestFilesAction(res.id, uploaded);
        } catch (err) {
          toast.error(
            `La solicitud ${res.id} se creó, pero un archivo no se pudo subir: ${err instanceof Error ? err.message : ""}`,
          );
        }
      }
      toast.success(`${res.id} creada`);
      router.push(`/work/requests/${res.id}`);
    });
  };

  return (
    <form ref={form} onSubmit={submit} className="grid gap-6">
      <RequestFields
        projects={projects}
        clients={clients}
        users={users}
        defaultProjectId={defaultProjectId}
        extra={
          <>
            <FormSection title="Subtareas">
              <div className="grid gap-2">
                {subtasks.map((s, i) => (
                  <div key={i} className="grid gap-2 sm:grid-cols-[1fr_11rem_10rem_auto]">
                    <Input
                      value={s.title}
                      onChange={(e) => patch(i, { title: e.target.value })}
                      placeholder="Ej. Sesión de fotos en estudio"
                      aria-label="Subtarea"
                    />
                    <select
                      aria-label="Responsable de la subtarea"
                      value={s.assigneeId}
                      onChange={(e) => patch(i, { assigneeId: e.target.value })}
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
                      aria-label="Fecha de la subtarea"
                      value={s.dueOn}
                      onChange={(e) => patch(i, { dueOn: e.target.value })}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label="Quitar subtarea"
                      onClick={() => setSubtasks((list) => (list.length > 1 ? list.filter((_, j) => j !== i) : [emptySubtask()]))}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="justify-self-start"
                  onClick={() => setSubtasks((list) => [...list, emptySubtask()])}
                >
                  <Plus className="size-4" /> Agregar subtarea
                </Button>
              </div>
            </FormSection>

            <FormSection title="Archivos">
              {files.length ? (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {files.map((f, i) => (
                    <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{f.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(f.size)}</span>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        aria-label={`Quitar ${f.name}`}
                        onClick={() => setFiles((list) => list.filter((_, j) => j !== i))}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <Dropzone onFiles={addFiles} hint={`Brief, referencias, documentos… hasta ${MAX_MB} MB c/u`} />
            </FormSection>
          </>
        }
      />

      {error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/work/requests">Cancelar</Link>
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Creando…" : "Crear solicitud"}
        </Button>
      </div>
    </form>
  );
}
