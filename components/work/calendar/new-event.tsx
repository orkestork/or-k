"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { Client } from "@/types/work/domain";
import { createEventAction, type FormState } from "@/lib/work/actions";
import { Button } from "@/components/work/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/work/ui/dialog";
import { FormMessage, SelectField, TextInput } from "@/components/work/forms/fields";
import { ActionForm } from "@/components/work/forms/action-form";

export function NewEventButton({ clients }: { clients: Client[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(createEventAction, { error: null });

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      toast.success("Evento creado");
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> Evento
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo evento</DialogTitle>
        </DialogHeader>
        <ActionForm action={action} className="grid gap-3">
          <TextInput name="title" label="Título" required />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput name="date" label="Fecha" type="date" required />
            <SelectField name="kind" label="Tipo" defaultValue="meeting">
              <option value="meeting">Reunión</option>
              <option value="delivery">Entrega</option>
              <option value="publish">Publicación</option>
              <option value="campaign">Campaña</option>
              <option value="deadline">Deadline</option>
            </SelectField>
          </div>
          <SelectField name="clientId" label="Cliente">
            <option value="">Interno OR-K</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectField>
          <FormMessage error={state.error} />
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={pending}>
              Crear evento
            </Button>
          </div>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
