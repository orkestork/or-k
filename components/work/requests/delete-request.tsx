"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteRequestAction } from "@/lib/work/actions";
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

export function DeleteRequestButton({ id, title }: { id: string; title: string }) {
  const [pending, start] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="text-destructive" disabled={pending}>
          <Trash2 className="size-4" /> Eliminar solicitud
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar {id}?</AlertDialogTitle>
          <AlertDialogDescription>
            “{title}” se borrará con sus versiones, archivos, actas, comentarios y actividad. No se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              start(async () => {
                try {
                  await deleteRequestAction(id);
                } catch (e) {
                  // redirect() surfaces as a thrown navigation signal; only real errors land here.
                  if (e instanceof Error && !/NEXT_REDIRECT/.test(e.message)) toast.error(e.message);
                  else throw e;
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
