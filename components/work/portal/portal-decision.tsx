"use client";

import { useState, useTransition } from "react";
import { Check, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { clientDecideAction } from "@/lib/work/actions";
import { Button } from "@/components/work/ui/button";
import { Textarea } from "@/components/work/ui/textarea";

export function PortalDecision({
  requestId,
  roundsLeft,
  versionLabel,
  openMarkers = 0,
}: {
  requestId: string;
  roundsLeft: number;
  versionLabel?: string;
  openMarkers?: number;
}) {
  const [mode, setMode] = useState<"idle" | "approve" | "changes">("idle");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  const submit = (decision: "approved" | "changes_requested") =>
    start(async () => {
      try {
        const tagged = versionLabel ? `[${versionLabel}] ${note}`.trim() : note;
        await clientDecideAction(requestId, decision, tagged);
        toast.success(decision === "approved" ? "¡Pieza aprobada!" : "Enviamos tus ajustes al equipo");
        setMode("idle");
        setNote("");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo enviar");
      }
    });

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-primary/40 bg-primary/5 p-4">
      <div>
        <p className="text-sm font-medium">
          {versionLabel ? `La versión ${versionLabel} espera tu revisión` : "Esta pieza espera tu revisión"}
        </p>
        {openMarkers ? (
          <p className="text-xs text-muted-foreground">
            Dejaste {openMarkers} marca(s) sobre la pieza: se enviarán junto con tus ajustes.
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {roundsLeft > 0
            ? `Te quedan ${roundsLeft} ronda(s) de ajustes incluidas.`
            : "Ya usaste las rondas incluidas; una nueva ronda puede tener costo adicional."}
        </p>
      </div>
      {mode === "idle" ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setMode("approve")}>
            <Check className="size-4" /> Aprobar
          </Button>
          <Button size="sm" variant="outline" onClick={() => setMode("changes")}>
            <RotateCcw className="size-4" /> Pedir ajustes
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Textarea
            autoFocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={mode === "approve" ? "Comentario (opcional)" : "¿Qué te gustaría ajustar?"}
            className="min-h-16 bg-background"
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setMode("idle")}>
              Cancelar
            </Button>
            {mode === "approve" ? (
              <Button size="sm" disabled={pending} onClick={() => submit("approved")}>
                Confirmar aprobación
              </Button>
            ) : (
              <Button size="sm" disabled={pending || !note.trim()} onClick={() => submit("changes_requested")}>
                Enviar ajustes
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
