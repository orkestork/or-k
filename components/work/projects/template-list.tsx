"use client";

import { useActionState, useState, useTransition } from "react";
import { CalendarRange, LayoutTemplate, ListChecks, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Client, ProjectTemplate, WorkUserRecord } from "@/types/work/domain";
import { applyTemplateAction, deleteTemplateAction, type FormState } from "@/lib/work/actions";
import { Button } from "@/components/work/ui/button";
import { Card } from "@/components/work/ui/card";
import { FormMessage, SelectField, TextInput } from "@/components/work/forms/fields";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { ActionForm } from "@/components/work/forms/action-form";

export function TemplateList({
  templates,
  clients,
  users,
}: {
  templates: ProjectTemplate[];
  clients: Client[];
  users: WorkUserRecord[];
}) {
  const [pending, start] = useTransition();
  if (!templates.length) {
    return (
      <Card className="items-center gap-2 p-10 text-center">
        <LayoutTemplate className="size-6 text-muted-foreground" />
        <p className="text-sm font-medium">Todavía no hay plantillas</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Abre un proyecto que quieras repetir (por ejemplo el de Marwa) y pulsa «Guardar como plantilla».
        </p>
      </Card>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {templates.map((t) => {
        const subtasks = t.tasks.reduce((a, x) => a + x.subtasks.length, 0);
        return (
          <Card key={t.id} className="gap-3 p-4">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{t.name}</p>
                {t.description ? <p className="line-clamp-2 text-sm text-muted-foreground">{t.description}</p> : null}
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="size-8" aria-label={`Eliminar ${t.name}`} disabled={pending}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar la plantilla?</AlertDialogTitle>
                    <AlertDialogDescription>
                      “{t.name}” se borrará. Los proyectos creados con ella no cambian.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() =>
                        start(async () => {
                          try {
                            await deleteTemplateAction(t.id);
                            toast.success("Plantilla eliminada");
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : "No se pudo eliminar");
                          }
                        })
                      }
                    >
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <LayoutTemplate className="size-3.5" /> {t.tasks.length} tareas
              </span>
              <span className="inline-flex items-center gap-1">
                <ListChecks className="size-3.5" /> {subtasks} subtareas
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarRange className="size-3.5" /> {Math.max(1, Math.round(t.durationDays / 7))} semanas
              </span>
            </div>
            <ul className="flex flex-col gap-0.5 text-xs text-muted-foreground">
              {t.tasks.slice(0, 5).map((x, i) => (
                <li key={i} className="truncate">
                  · {x.title}
                </li>
              ))}
              {t.tasks.length > 5 ? <li>· y {t.tasks.length - 5} más…</li> : null}
            </ul>
            <UseTemplateDialog template={t} clients={clients} users={users} />
          </Card>
        );
      })}
    </div>
  );
}

function UseTemplateDialog({
  template,
  clients,
  users,
}: {
  template: ProjectTemplate;
  clients: Client[];
  users: WorkUserRecord[];
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(applyTemplateAction, { error: null });
  const staff = users.filter((u) => u.active && u.role !== "client");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="self-start">
          Usar plantilla
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo proyecto desde «{template.name}»</DialogTitle>
          <DialogDescription>
            Se crean {template.tasks.length} tareas con sus subtareas, responsables y fechas a partir del inicio que elijas.
          </DialogDescription>
        </DialogHeader>
        <ActionForm action={action} className="grid gap-3">
          <input type="hidden" name="templateId" value={template.id} />
          <SelectField name="clientId" label="Cliente" required>
            <option value="" disabled>
              Selecciona un cliente
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectField>
          <TextInput name="name" label="Nombre del proyecto" defaultValue={template.name} required />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput
              name="startDate"
              label="Inicio"
              type="date"
              required
              defaultValue={new Date().toLocaleDateString("en-CA")}
            />
            <SelectField name="leadId" label="Líder">
              <option value="">Sin asignar</option>
              {staff.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </SelectField>
          </div>
          <FormMessage error={state.error} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Creando…" : "Crear proyecto"}
            </Button>
          </div>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
