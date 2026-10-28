"use client";

import { useTransition } from "react";
import { FileArchive, FileText, FileVideo, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { RequestFile, WorkUserRecord } from "@/types/work/domain";
import { addRequestFilesAction, deleteRequestFileAction } from "@/lib/work/actions";
import { formatBytes, uploadToWork } from "@/lib/work/upload";
import { relativeTime } from "@/lib/work/format";
import { Button } from "@/components/work/ui/button";
import { Dropzone } from "@/components/work/shared/dropzone";

const MAX_MB = 50;

export function RequestFiles({
  requestId,
  files,
  users,
  canEdit,
}: {
  requestId: string;
  files: RequestFile[];
  users: WorkUserRecord[];
  canEdit: boolean;
}) {
  const [pending, start] = useTransition();
  const userById = (id: string) => users.find((u) => u.id === id);

  const upload = (list: File[]) =>
    start(async () => {
      const tooBig = list.filter((f) => f.size > MAX_MB * 1024 * 1024);
      if (tooBig.length) toast.error(`Máximo ${MAX_MB} MB por archivo: ${tooBig.map((f) => f.name).join(", ")}`);
      const ok = list.filter((f) => f.size <= MAX_MB * 1024 * 1024);
      if (!ok.length) return;
      try {
        const uploaded = [];
        for (const file of ok) {
          uploaded.push({
            name: file.name,
            size: file.size,
            storagePath: await uploadToWork(`requests/${requestId}/files`, file),
          });
        }
        await addRequestFilesAction(requestId, uploaded);
        toast.success(uploaded.length === 1 ? "Archivo subido" : `${uploaded.length} archivos subidos`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo subir");
      }
    });

  const remove = (f: RequestFile) =>
    start(async () => {
      try {
        await deleteRequestFileAction(requestId, f.id);
        toast.success("Archivo eliminado");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo eliminar");
      }
    });

  return (
    <div className="flex flex-col gap-3">
      {files.length ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {files.map((f) => {
            const by = userById(f.uploadedById);
            return (
              <li key={f.id} className="flex items-center gap-3 rounded-md border border-border p-2">
                <a
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  className="grid size-12 shrink-0 place-items-center overflow-hidden rounded bg-muted text-muted-foreground"
                >
                  {f.kind === "image" && f.url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- signed Storage URL
                    <img src={f.url} alt="" className="size-full object-cover" />
                  ) : f.kind === "video" ? (
                    <FileVideo className="size-5" />
                  ) : f.kind === "zip" ? (
                    <FileArchive className="size-5" />
                  ) : (
                    <FileText className="size-5" />
                  )}
                </a>
                <div className="min-w-0 flex-1">
                  <a href={f.url} target="_blank" rel="noreferrer" className="block truncate text-sm hover:text-primary">
                    {f.name}
                  </a>
                  <p className="truncate text-xs text-muted-foreground">
                    {[formatBytes(f.size), by?.name.split(" ")[0], relativeTime(f.uploadedAt)].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {canEdit ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    disabled={pending}
                    aria-label={`Eliminar ${f.name}`}
                    onClick={() => remove(f)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      {canEdit ? (
        <Dropzone onFiles={upload} busy={pending} hint={`PDF, imágenes, Word, Excel, ZIP… hasta ${MAX_MB} MB`} />
      ) : files.length ? null : (
        <p className="text-sm text-muted-foreground">Sin archivos adjuntos.</p>
      )}
    </div>
  );
}
