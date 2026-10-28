"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { KeyRound, UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { Client, WorkUserRecord } from "@/types/work/domain";
import { createMemberAction, updateMemberAction, type FormState } from "@/lib/work/actions";
import { Button } from "@/components/work/ui/button";
import { PersonAvatar } from "@/components/work/shared/people";
import { ActionForm } from "@/components/work/forms/action-form";
import { FormMessage, TextInput } from "@/components/work/forms/fields";
import { RemoveMemberButton } from "@/components/work/settings/team-admin";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/work/ui/dialog";

/** Who at the client can sign in to the portal, and a way to invite more. */
export function PortalAccess({
  client,
  members,
  canManage,
  canCreate,
}: {
  client: Client;
  members: WorkUserRecord[];
  canManage: boolean;
  canCreate: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-3 text-sm">
      {members.length ? (
        <ul className="flex flex-col gap-2">
          {members.map((u) => (
            <li key={u.id} className="flex items-center gap-2">
              <PersonAvatar person={u} size="sm" />
              <div className="min-w-0 flex-1">
                <p className={u.active ? "truncate" : "truncate text-muted-foreground line-through"}>{u.name}</p>
                <p className="truncate text-xs text-muted-foreground">{u.email}</p>
              </div>
              {canManage ? (
                <>
                  <label className="flex items-center gap-1 text-xs text-muted-foreground" title="Puede entrar al portal">
                    <input
                      type="checkbox"
                      checked={u.active}
                      disabled={pending}
                      onChange={(e) =>
                        start(async () => {
                          try {
                            await updateMemberAction(u.id, { active: e.target.checked });
                            toast.success(e.target.checked ? "Acceso activado" : "Acceso pausado");
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "No se pudo guardar");
                          }
                        })
                      }
                    />
                    Activo
                  </label>
                  <RemoveMemberButton id={u.id} name={u.name} />
                </>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">
          Nadie de {client.name} tiene acceso todavía. Con acceso, el cliente revisa, aprueba y comenta sus piezas en su
          portal.
        </p>
      )}
      {canManage ? <GrantAccessDialog client={client} canCreate={canCreate} /> : null}
    </div>
  );
}

function GrantAccessDialog({ client, canCreate }: { client: Client; canCreate: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(createMemberAction, { error: null });

  useEffect(() => {
    if (state.ok) {
      toast.success("Acceso creado", { description: "Comparte el correo y la contraseña temporal con el cliente." });
      setOpen(false);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="self-start">
          <UserPlus className="size-4" /> Dar acceso al portal
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Acceso al portal · {client.name}</DialogTitle>
          <DialogDescription>
            Entra en /work/login con su correo y esta contraseña. Solo verá las piezas, actas y documentos que compartan con{" "}
            {client.name}.
          </DialogDescription>
        </DialogHeader>
        {canCreate ? (
          <ActionForm action={action} className="grid gap-3" key={state.id ?? "grant"}>
            <input type="hidden" name="role" value="client" />
            <input type="hidden" name="clientId" value={client.id} />
            <input type="hidden" name="title" value={client.contact.role || "Cliente"} />
            <TextInput name="name" label="Nombre" required defaultValue={client.contact.name} />
            <TextInput
              name="email"
              label="Correo"
              type="email"
              required
              defaultValue={client.contact.email}
              placeholder="persona@empresa.com"
            />
            <TextInput name="password" label="Contraseña temporal" type="password" required minLength={8} placeholder="Mínimo 8 caracteres" />
            <FormMessage error={state.error} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={pending}>
                <KeyRound className="size-4" /> {pending ? "Creando…" : "Crear acceso"}
              </Button>
            </div>
          </ActionForm>
        ) : (
          <p className="text-sm text-muted-foreground">
            Falta <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> en el servidor para crear usuarios.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
