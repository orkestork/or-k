import { Check } from "lucide-react";
import type { WorkflowState } from "@/types/work/domain";
import { cn } from "@/lib/work/utils";
import { clientStage, type ClientStage } from "./client-status";

const STEPS: { stage: ClientStage; label: string }[] = [
  { stage: "received", label: "Recibida" },
  { stage: "production", label: "En producción" },
  { stage: "review", label: "Tu revisión" },
  { stage: "approved", label: "Aprobada" },
  { stage: "delivered", label: "Entregada" },
];

/** Five client-facing steps; adjustments count as back in production. */
export function ClientStepper({ state }: { state: WorkflowState }) {
  const stage = clientStage(state);
  const at = Math.max(0, STEPS.findIndex((s) => s.stage === (stage === "adjustments" ? "production" : stage)));
  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((s, i) => {
        const done = i < at;
        const current = i === at;
        return (
          <li key={s.stage} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full border text-xs font-semibold",
                done && "border-tone-positive bg-tone-positive text-white",
                current && "border-primary bg-primary text-primary-foreground",
                !done && !current && "border-border text-muted-foreground",
              )}
            >
              {done ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span className={cn("hidden text-xs sm:block", current ? "font-medium" : "text-muted-foreground")}>
              {current && stage === "adjustments" ? "En ajustes" : s.label}
            </span>
            {i < STEPS.length - 1 ? <span className={cn("h-px flex-1", done ? "bg-tone-positive" : "bg-border")} /> : null}
          </li>
        );
      })}
    </ol>
  );
}
