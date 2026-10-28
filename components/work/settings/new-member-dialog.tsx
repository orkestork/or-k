"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import type { Client, WorkUserRecord } from "@/types/work/domain";
import { Button } from "@/components/work/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/work/ui/dialog";
import { NewMemberForm } from "./team-admin";

export function NewMemberDialog({
  clients,
  users,
  canCreate,
}: {
  clients: Client[];
  users: WorkUserRecord[];
  canCreate: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="size-4" /> Nuevo integrante
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo integrante</DialogTitle>
          <DialogDescription>
            Entra con su correo y la contraseña temporal; puede cambiarla en Settings.
          </DialogDescription>
        </DialogHeader>
        {canCreate ? (
          <NewMemberForm clients={clients} users={users} onDone={() => setOpen(false)} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Para crear usuarios desde aquí falta <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> en{" "}
            <code className="font-mono">.env.local</code> (Supabase → Project Settings → API Keys → service_role).
            Añádela y reinicia el servidor.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
