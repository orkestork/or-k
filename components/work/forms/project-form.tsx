"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { Client, Project, WorkUserRecord } from "@/types/work/domain";
import { saveProjectAction, type FormState } from "@/lib/work/actions";
import { Button } from "@/components/work/ui/button";
import { Card, CardContent } from "@/components/work/ui/card";
import { FormMessage, MemberPicker, SelectField, TextArea, TextInput } from "./fields";
import { ActionForm } from "@/components/work/forms/action-form";

const day = (iso?: string) => (iso ? iso.slice(0, 10) : "");

export function ProjectForm({
  project,
  clients,
  users,
  defaultClientId,
}: {
  project?: Project;
  clients: Client[];
  users: WorkUserRecord[];
  defaultClientId?: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveProjectAction, { error: null });
  const staff = users.filter((u) => u.active && u.role !== "client");

  return (
    <Card>
      <CardContent className="p-5">
        <ActionForm action={action} className="grid gap-4">
          {project ? <input type="hidden" name="id" value={project.id} /> : null}
          <SelectField
            name="clientId"
            label="Cliente"
            required
            defaultValue={project?.clientId ?? defaultClientId}
          >
            <option value="" disabled>
              Selecciona un cliente
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectField>
          <TextInput name="name" label="Nombre del proyecto" defaultValue={project?.name} required />
          <TextArea name="brief" label="Brief" defaultValue={project?.brief} />
          <div className="grid gap-4 sm:grid-cols-3">
            <TextInput name="startDate" label="Inicio" type="date" defaultValue={day(project?.startDate)} />
            <TextInput name="targetDate" label="Meta" type="date" defaultValue={day(project?.targetDate)} />
            <SelectField name="status" label="Estado" defaultValue={project?.status ?? "active"}>
              <option value="active">Activo</option>
              <option value="on_hold">En pausa</option>
              <option value="closed">Cerrado</option>
            </SelectField>
          </div>
          <TextInput
            name="budgetHours"
            label="Presupuesto de horas (opcional)"
            type="number"
            defaultValue={project?.budgetHours ? String(project.budgetHours) : ""}
            placeholder="Ej. 120"
          />
          <SelectField name="leadId" label="Líder" defaultValue={project?.leadId}>
            <option value="">Sin asignar</option>
            {staff.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </SelectField>
          <MemberPicker name="teamIds" label="Equipo" users={users} selected={project?.teamIds ?? []} />

          <FormMessage error={state.error} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href={project ? `/work/projects/${project.id}` : "/work/projects"}>Cancelar</Link>
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {project ? "Guardar cambios" : "Crear proyecto"}
            </Button>
          </div>
        </ActionForm>
      </CardContent>
    </Card>
  );
}
