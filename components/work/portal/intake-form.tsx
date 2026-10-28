"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { Project } from "@/types/work/domain";
import { clientCreateRequestAction, type FormState } from "@/lib/work/actions";
import { Button } from "@/components/work/ui/button";
import { FormMessage, SelectField, TextArea, TextInput } from "@/components/work/forms/fields";
import { ActionForm } from "@/components/work/forms/action-form";

export function IntakeForm({ projects }: { projects: Project[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(clientCreateRequestAction, { error: null });
  return (
    <ActionForm action={action} className="grid gap-4">
      <SelectField name="projectId" label="Proyecto" required defaultValue={projects.length === 1 ? projects[0].id : ""}>
        <option value="" disabled>
          Selecciona un proyecto
        </option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </SelectField>
      <TextInput name="title" label="¿Qué necesitas?" required placeholder="Ej. Post para el lanzamiento del producto X" />
      <TextArea name="description" label="Detalles" hint="objetivo, mensaje, formatos, referencias" />
      <TextInput name="wantedOn" label="¿Para cuándo lo necesitas?" type="date" />
      <FormMessage error={state.error} />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/work/portal">Cancelar</Link>
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Enviando…" : "Enviar solicitud"}
        </Button>
      </div>
    </ActionForm>
  );
}
