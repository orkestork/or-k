"use client";

import { useTransition } from "react";
import { Power } from "lucide-react";
import { toast } from "sonner";
import { setClientActiveAction } from "@/lib/work/actions";
import { Button } from "@/components/work/ui/button";
import { cn } from "@/lib/work/utils";

/** Switches a client on or off; inactive clients keep their history. */
export function ClientActiveToggle({ id, name, active, compact }: { id: string; name: string; active: boolean; compact?: boolean }) {
  const [pending, start] = useTransition();
  const toggle = () =>
    start(async () => {
      try {
        await setClientActiveAction(id, !active);
        toast.success(active ? `${name} quedó inactivo` : `${name} quedó activo`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo cambiar el estado");
      }
    });

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={toggle}
      title={active ? "Desactivar cliente" : "Activar cliente"}
      className={cn(compact && "h-7 px-2 text-xs", !active && "text-tone-positive")}
    >
      <Power className="size-3.5" />
      {active ? "Desactivar" : "Activar"}
    </Button>
  );
}
