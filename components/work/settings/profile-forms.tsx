"use client";

import { useActionState, useEffect, useRef } from "react";
import type { WorkUserRecord } from "@/types/work/domain";
import { changePasswordAction, updateMyProfileAction, type FormState } from "@/lib/work/actions";
import { Button } from "@/components/work/ui/button";
import { Input } from "@/components/work/ui/input";
import { Label } from "@/components/work/ui/label";
import { FormMessage, TextInput } from "@/components/work/forms/fields";
import { ActionForm } from "@/components/work/forms/action-form";

export function ProfileForm({ me }: { me: WorkUserRecord }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateMyProfileAction, { error: null });
  return (
    <ActionForm action={action} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_5rem]">
        <TextInput name="name" label="Nombre" defaultValue={me.name} required />
        <TextInput name="title" label="Cargo" defaultValue={me.title} />
        <div className="grid gap-2">
          <Label htmlFor="color">Color</Label>
          <Input id="color" name="color" type="color" defaultValue={me.color} className="h-9 p-1" />
        </div>
      </div>
      <FormMessage error={state.error} ok={state.ok} okText="Perfil actualizado." />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          Guardar perfil
        </Button>
      </div>
    </ActionForm>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(changePasswordAction, { error: null });
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state]);
  return (
    <ActionForm ref={form} action={action} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput name="password" label="Nueva contraseña" type="password" required minLength={8} placeholder="Mínimo 8 caracteres" />
        <TextInput name="confirm" label="Confirmar contraseña" type="password" required minLength={8} />
      </div>
      <FormMessage error={state.error} ok={state.ok} okText="Contraseña actualizada." />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          Cambiar contraseña
        </Button>
      </div>
    </ActionForm>
  );
}
