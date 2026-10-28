"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteAssetAction } from "@/lib/work/actions";
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

export function AssetDelete({ id, clientId, name }: { id: string; clientId: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="icon" variant="ghost" className="size-7" disabled={pending} aria-label={`Eliminar ${name}`}>
          <Trash2 className="size-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar este asset?</AlertDialogTitle>
          <AlertDialogDescription>{name} se borrará de forma permanente.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              start(async () => {
                try {
                  await deleteAssetAction(id, clientId);
                  toast.success("Asset eliminado");
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
