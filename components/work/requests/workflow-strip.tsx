import { Check } from "lucide-react";
import { HAPPY_PATH, WORKFLOW } from "@/lib/work/workflow";
import { cn } from "@/lib/work/utils";
import type { WorkflowState } from "@/types/work/domain";

export function WorkflowStrip({ state }: { state: WorkflowState }) {
  const inAdjustments = state === "adjustments";
  const idx = inAdjustments
    ? HAPPY_PATH.indexOf("design")
    : Math.max(0, HAPPY_PATH.indexOf(state));

  return (
    <div className="overflow-x-auto">
      <ol className="flex min-w-max items-center gap-1.5 text-xs">
        {HAPPY_PATH.map((s, i) => {
          const done = i < idx;
          const current = i === idx && !inAdjustments;
          return (
            <li key={s} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 whitespace-nowrap",
                  current && "border-primary/40 bg-primary/10 text-primary",
                  done && "border-tone-positive/30 bg-tone-positive/10 text-tone-positive",
                  !current && !done && "border-border text-muted-foreground/70",
                )}
              >
                {done ? <Check className="size-3" /> : null}
                {WORKFLOW[s].label}
              </span>
              {i < HAPPY_PATH.length - 1 ? (
                <span className="h-px w-3 bg-border" />
              ) : null}
            </li>
          );
        })}
      </ol>
      {inAdjustments ? (
        <p className="mt-2 text-xs text-tone-warn">
          En ajustes — la pieza volvió al equipo tras una ronda de cambios.
        </p>
      ) : null}
    </div>
  );
}
