"use client";

import { useState, useTransition } from "react";
import { FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { HrDocument } from "@/types/work/domain";
import { addHrDocumentAction, deleteHrDocumentAction } from "@/lib/work/actions";
import { formatBytes, uploadToWork } from "@/lib/work/upload";
import { relativeTime } from "@/lib/work/format";
import { Button } from "@/components/work/ui/button";
import { Dropzone } from "@/components/work/shared/dropzone";
import { nativeSelectClass } from "@/components/work/forms/fields";
import { DOC_LABEL } from "./labels";

export function HrDocuments({
  userId,
  documents,
  canUpload,
  canDelete,
}: {
  userId: string;
  documents: HrDocument[];
  canUpload: boolean;
  canDelete: boolean;
}) {
  const [pending, start] = useTransition();
  const [category, setCategory] = useState<HrDocument["category"]>("contract");

  const upload = (files: File[]) =>
    start(async () => {
      try {
        for (const f of files) {
          const storagePath = await uploadToWork(`hr/${userId}`, f);
          await addHrDocumentAction({ userId, category, name: f.name, size: f.size, storagePath });
        }
        toast.success(files.length === 1 ? "Documento subido" : `${files.length} documentos subidos`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo subir");
      }
    });

  return (
    <div className="flex flex-col gap-3 text-sm">
      {documents.length ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {documents.map((d) => (
            <li key={d.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <a href={d.url} target="_blank" rel="noreferrer" className="block truncate hover:text-primary">
                  {d.name}
                </a>
                <p className="text-xs text-muted-foreground">
                  {DOC_LABEL[d.category]} · {[formatBytes(d.size), relativeTime(d.uploadedAt)].filter(Boolean).join(" · ")}
                </p>
              </div>
              {canDelete ? (
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  disabled={pending}
                  aria-label={`Eliminar ${d.name}`}
                  onClick={() =>
                    start(async () => {
                      try {
                        await deleteHrDocumentAction(userId, d.id);
                        toast.success("Documento eliminado");
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
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">Sin documentos.</p>
      )}
      {canUpload ? (
        <div className="grid gap-2 sm:grid-cols-[14rem_1fr] sm:items-center">
          <select
            aria-label="Tipo de documento"
            className={nativeSelectClass}
            value={category}
            onChange={(e) => setCategory(e.target.value as HrDocument["category"])}
          >
            {Object.entries(DOC_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <Dropzone onFiles={upload} busy={pending} hint="Contrato, cédula, certificados… (privado)" />
        </div>
      ) : null}
    </div>
  );
}
