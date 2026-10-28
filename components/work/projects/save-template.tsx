"use client";

import { useState, useTransition } from "react";
import { LayoutTemplate } from "lucide-react";
import { toast } from "sonner";
import { saveTemplateAction } from "@/lib/work/actions";
import { Button } from "@/components/work/ui/button";
import { Input } from "@/components/work/ui/input";
import { Label } from "@/components/work/ui/label";
import { Textarea } from "@/components/work/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/work/ui/dialog";

export function SaveTemplateButton({ projectId, projectName, brief }: { projectId: string; projectName: string; brief: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(projectName);
  const [description, setDescription] = useState(brief);
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <LayoutTemplate className="size-4" /> Guardar como plantilla
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Guardar como plantilla</DialogTitle>
          <DialogDescription>
            Guarda las tareas, fechas relativas, responsables y subtareas para crear proyectos iguales con un clic.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="tpl-name">Nombre</Label>
            <Input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Web + e-commerce 8 semanas" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="tpl-desc">Descripción</Label>
            <Textarea id="tpl-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={pending || !name.trim()}
            onClick={() =>
              start(async () => {
                try {
                  await saveTemplateAction(projectId, name, description);
                  toast.success("Plantilla guardada", { description: "La encuentras en Trabajo → Plantillas." });
                  setOpen(false);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "No se pudo guardar");
                }
              })
            }
          >
            Guardar plantilla
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
