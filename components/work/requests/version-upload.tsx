"use client";

import { useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { addVersionAction } from "@/lib/work/actions";
import { uploadToWork } from "@/lib/work/upload";
import { Button } from "@/components/work/ui/button";
import { Textarea } from "@/components/work/ui/textarea";
import { Dropzone } from "@/components/work/shared/dropzone";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/work/ui/dialog";

/** Uploads a new design version (V1, V2…) with its file to Storage. */
export function VersionUpload({ requestId, nextLabel }: { requestId: string; nextLabel: string }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  const submit = () =>
    file &&
    start(async () => {
      try {
        const path = await uploadToWork(`requests/${requestId}`, file);
        await addVersionAction(requestId, file.name, note || "Nueva versión.", path);
        toast.success(`${nextLabel} subida`);
        setOpen(false);
        setFile(null);
        setNote("");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo subir la versión");
      }
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="self-start">
          <Upload className="size-4" /> Subir versión {nextLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva versión · {nextLabel}</DialogTitle>
        </DialogHeader>
        {file ? (
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
            <span className="truncate">{file.name}</span>
            <Button size="sm" variant="ghost" onClick={() => setFile(null)}>
              Cambiar
            </Button>
          </div>
        ) : (
          <Dropzone
            multiple={false}
            onFiles={(f) => setFile(f[0])}
            hint="Imagen para dejar marcas sobre la pieza, o PDF / video"
          />
        )}
        <Textarea placeholder="Nota de la versión" value={note} onChange={(e) => setNote(e.target.value)} />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" size="sm">
              Cancelar
            </Button>
          </DialogClose>
          <Button size="sm" disabled={pending || !file} onClick={submit}>
            {pending ? "Subiendo…" : "Subir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
