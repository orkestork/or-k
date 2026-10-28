"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Pin, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ClientDoc } from "@/types/work/domain";
import { deleteClientDocAction, saveClientDocAction } from "@/lib/work/actions";
import { cn } from "@/lib/work/utils";
import { Button } from "@/components/work/ui/button";
import { Input } from "@/components/work/ui/input";
import { Textarea } from "@/components/work/ui/textarea";
import { Markdown } from "./markdown";
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

const STARTER = `## Resumen
Qué es este documento y para qué sirve.

## Puntos clave
- Primer punto
- Segundo punto

## Pendientes
- [ ] Algo por hacer
`;

export function DocEditor({ clientId, doc }: { clientId: string; doc?: ClientDoc }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState(doc?.title ?? "");
  const [body, setBody] = useState(doc?.body ?? STARTER);
  const [pinned, setPinned] = useState(doc?.pinned ?? false);
  const [visibleToClient, setVisible] = useState(doc?.visibleToClient ?? false);
  const [mode, setMode] = useState<"write" | "preview">(doc ? "preview" : "write");
  const dirty =
    !doc || title !== doc.title || body !== doc.body || pinned !== doc.pinned || visibleToClient !== doc.visibleToClient;

  const save = () =>
    start(async () => {
      try {
        const id = await saveClientDocAction(doc?.id ?? null, { clientId, title, body, pinned, visibleToClient });
        toast.success("Documento guardado");
        if (!doc) router.replace(`/work/clients/${clientId}/docs/${id}`);
        else router.refresh();
        setMode("preview");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo guardar");
      }
    });

  return (
    <div className="flex flex-col gap-4">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título del documento (ej. Brandbook y accesos)"
        className="h-11 text-lg font-semibold"
      />
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md border border-border p-0.5">
          {(["write", "preview"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs",
                mode === m ? "bg-muted font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {m === "write" ? <Pencil className="size-3.5" /> : <Eye className="size-3.5" />}
              {m === "write" ? "Escribir" : "Vista previa"}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
          <Pin className="size-3.5" /> Fijar arriba
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={visibleToClient} onChange={(e) => setVisible(e.target.checked)} />
          Visible para el cliente
        </label>
        <div className="ml-auto flex gap-2">
          {doc ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="text-destructive" disabled={pending}>
                  <Trash2 className="size-4" /> Eliminar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar el documento?</AlertDialogTitle>
                  <AlertDialogDescription>“{doc.title}” se borrará de forma permanente.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => start(() => deleteClientDocAction(clientId, doc.id))}>
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
          <Button size="sm" disabled={pending || !dirty || !title.trim()} onClick={save}>
            {pending ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </div>
      {mode === "write" ? (
        <>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="min-h-[55vh] font-mono text-sm leading-relaxed"
            spellCheck
          />
          <p className="text-xs text-muted-foreground">
            Formato: <code>## Título</code> · <code>- lista</code> · <code>- [ ] pendiente</code> · <code>**negrita**</code> ·{" "}
            <code>[enlace](https://…)</code> · <code>&gt; nota</code>
          </p>
        </>
      ) : (
        <div className="min-h-[30vh] rounded-md border border-border p-5">
          {body.trim() ? <Markdown source={body} /> : <p className="text-sm text-muted-foreground">Documento vacío.</p>}
        </div>
      )}
    </div>
  );
}
