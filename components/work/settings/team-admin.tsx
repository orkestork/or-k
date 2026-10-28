"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { Client, RoleSlug, WorkUserRecord } from "@/types/work/domain";
import {
  createMemberAction,
  removeMemberAction,
  setAvatarAction,
  updateMemberAction,
  type FormState,
} from "@/lib/work/actions";
import { Button } from "@/components/work/ui/button";
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
import { PersonAvatar } from "@/components/work/shared/people";
import { FormMessage, SelectField, TextInput, nativeSelectClass } from "@/components/work/forms/fields";
import { Label } from "@/components/work/ui/label";
import { uploadAvatar } from "./avatar-upload";
import { RoleOptions } from "./role-options";
import { ActionForm } from "@/components/work/forms/action-form";

const smallSelect =
  "h-8 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50 dark:bg-input/30";

export function TeamAdmin({
  users,
  clients,
  meId,
}: {
  users: WorkUserRecord[];
  clients: Client[];
  meId: string;
}) {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<void>, ok: string) =>
    start(async () => {
      try {
        await fn();
        toast.success(ok);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo guardar");
      }
    });

  return (
    <ul className="divide-y divide-border">
      {users.map((u) => {
        const self = u.id === meId;
        return (
          <li key={u.id} className="flex flex-wrap items-center gap-3 py-3">
            <PersonAvatar person={u} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {u.name} {self ? <span className="text-xs text-muted-foreground">(tú)</span> : null}
              </p>
              <p className="truncate text-xs text-muted-foreground">{u.email}</p>
            </div>
            <select
              aria-label={`Rol de ${u.name}`}
              className={smallSelect}
              defaultValue={u.role}
              disabled={pending || self}
              onChange={(e) =>
                run(() => updateMemberAction(u.id, { role: e.target.value as RoleSlug }), "Rol actualizado")
              }
            >
              <RoleOptions />
            </select>
            {u.role === "client" ? (
              <select
                aria-label={`Cliente de ${u.name}`}
                className={smallSelect}
                defaultValue={u.clientId ?? ""}
                disabled={pending}
                onChange={(e) =>
                  run(() => updateMemberAction(u.id, { clientId: e.target.value || null }), "Cliente asignado")
                }
              >
                <option value="">Sin cliente</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            ) : null}
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                defaultChecked={u.active}
                disabled={pending || self}
                onChange={(e) =>
                  run(
                    () => updateMemberAction(u.id, { active: e.target.checked }),
                    e.target.checked ? "Acceso activado" : "Acceso desactivado",
                  )
                }
              />
              Activo
            </label>
            {!self ? <RemoveMemberButton id={u.id} name={u.name} /> : null}
          </li>
        );
      })}
    </ul>
  );
}

export function RemoveMemberButton({ id, name, redirectTo }: { id: string; name: string; redirectTo?: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="icon" variant="ghost" className="size-8" disabled={pending} aria-label={`Eliminar ${name}`}>
          <Trash2 className="size-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar a {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Pierde el acceso a OR-K WORK. Sus comentarios y actividad quedan sin autor.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              start(async () => {
                try {
                  await removeMemberAction(id);
                  toast.success(`${name} eliminado del equipo`);
                  if (redirectTo) router.push(redirectTo);
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
  );
}

export function NewMemberForm({
  clients,
  users = [],
  onDone,
}: {
  clients: Client[];
  users?: WorkUserRecord[];
  onDone?: () => void;
}) {
  const managers = users.filter((u) => u.active && u.role !== "client");
  const [state, action, pending] = useActionState<FormState, FormData>(createMemberAction, { error: null });
  const [role, setRole] = useState<RoleSlug>("designer");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);

  // Once the account exists, upload the chosen photo into its avatar folder.
  useEffect(() => {
    if (!state.ok || !state.id) return;
    const done = () => {
      toast.success("Integrante creado");
      setPhoto(null);
      setPreview(null);
      onDone?.();
    };
    if (!photo) {
      done();
      return;
    }
    setUploading(true);
    uploadAvatar(state.id, photo)
      .then((url) => setAvatarAction(state.id!, url))
      .then(done)
      .catch((e) => toast.error(`Integrante creado, pero la foto no se pudo subir: ${e instanceof Error ? e.message : ""}`))
      .finally(() => setUploading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per created member
  }, [state]);

  return (
    <ActionForm action={action} className="grid gap-4" key={state.id ?? "form"}>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => photoInput.current?.click()}
          className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full border border-dashed border-border bg-muted text-muted-foreground hover:border-primary/50"
          aria-label="Elegir foto"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- local preview
            <img src={preview} alt="" className="size-full object-cover" />
          ) : (
            <Camera className="size-5" />
          )}
        </button>
        <div className="text-sm">
          <p className="font-medium">Foto (opcional)</p>
          <p className="text-xs text-muted-foreground">También puede subirla la persona después, en Settings.</p>
        </div>
        <input
          ref={photoInput}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setPhoto(f);
            setPreview(f ? URL.createObjectURL(f) : null);
            e.target.value = "";
          }}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput name="name" label="Nombre" required />
        <TextInput name="email" label="Correo" type="email" required placeholder="nombre@or-k.co" />
        <TextInput name="title" label="Cargo" />
        <TextInput name="password" label="Contraseña temporal" type="password" required minLength={8} placeholder="Mínimo 8 caracteres" />
        <div className="grid gap-2">
          <Label htmlFor="new-role">Rol</Label>
          <select
            id="new-role"
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value as RoleSlug)}
            className={nativeSelectClass}
          >
            <RoleOptions />
          </select>
        </div>
        {role !== "client" ? (
          <SelectField name="managerId" label="Jefe directo">
            <option value="">Nadie (cabeza del organigrama)</option>
            {managers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
                {u.title ? ` — ${u.title}` : ""}
              </option>
            ))}
          </SelectField>
        ) : null}
        {role !== "client" ? (
          <SelectField name="backupId" label="Reemplazo por defecto (cuando falte)">
            <option value="">Su jefe directo</option>
            {managers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </SelectField>
        ) : null}
        {role === "client" ? (
          <SelectField name="clientId" label="Cliente al que pertenece" required>
            <option value="" disabled>
              Selecciona un cliente
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectField>
        ) : null}
      </div>
      <FormMessage error={state.error} />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending || uploading}>
          {pending ? "Creando…" : uploading ? "Subiendo foto…" : "Crear usuario"}
        </Button>
      </div>
    </ActionForm>
  );
}
