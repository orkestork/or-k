"use client";

import { useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import type { AssetItem, Client } from "@/types/work/domain";
import { addAssetAction } from "@/lib/work/actions";
import { createClient } from "@/lib/work/supabase/client";
import { Button } from "@/components/work/ui/button";
import { Input } from "@/components/work/ui/input";
import { Label } from "@/components/work/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/work/ui/dialog";
import { nativeSelectClass } from "@/components/work/forms/fields";

export const ASSET_LABEL: Record<AssetItem["category"], string> = {
  logos: "Logos",
  brandbook: "Brandbook",
  typography: "Tipografía",
  colors: "Color",
  photography: "Fotografía",
  product: "Producto",
  templates: "Plantillas",
  references: "Referencias",
  documents: "Documentos",
};

export function AssetUploader({ clients, clientId }: { clients: Client[]; clientId?: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [target, setTarget] = useState(clientId ?? clients[0]?.id ?? "");
  const [category, setCategory] = useState<AssetItem["category"]>("logos");
  const [files, setFiles] = useState<File[]>([]);
  const [link, setLink] = useState("");
  const [linkName, setLinkName] = useState("");

  const submit = () =>
    start(async () => {
      try {
        const supabase = createClient();
        for (const file of files) {
          const safe = file.name.normalize("NFD").replace(/[^\w.-]+/g, "_");
          const path = `clients/${target}/${Date.now()}-${safe}`;
          const { error } = await supabase.storage
            .from("work")
            .upload(path, file, { contentType: file.type || undefined });
          if (error) throw new Error(`${file.name}: ${error.message}`);
          await addAssetAction({ clientId: target, category, name: file.name, storagePath: path });
        }
        if (link.trim()) {
          await addAssetAction({
            clientId: target,
            category,
            name: linkName.trim() || link.trim(),
            url: link.trim(),
          });
        }
        toast.success("Assets guardados");
        setOpen(false);
        setFiles([]);
        setLink("");
        setLinkName("");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo subir");
      }
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={!clients.length}>
          <Upload className="size-4" /> Subir assets
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Subir assets</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          {!clientId ? (
            <div className="grid gap-1.5">
              <Label htmlFor="asset-client">Cliente</Label>
              <select
                id="asset-client"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className={nativeSelectClass}
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="grid gap-1.5">
            <Label htmlFor="asset-category">Categoría</Label>
            <select
              id="asset-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as AssetItem["category"])}
              className={nativeSelectClass}
            >
              {Object.entries(ASSET_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="asset-files">Archivos</Label>
            <Input
              id="asset-files"
              type="file"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="asset-link">o un enlace (Figma, Drive…)</Label>
            <Input id="asset-link" placeholder="https://" value={link} onChange={(e) => setLink(e.target.value)} />
            {link ? (
              <Input placeholder="Nombre del enlace" value={linkName} onChange={(e) => setLinkName(e.target.value)} />
            ) : null}
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" size="sm">
              Cancelar
            </Button>
          </DialogClose>
          <Button size="sm" disabled={pending || !target || (!files.length && !link.trim())} onClick={submit}>
            {pending ? "Subiendo…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
