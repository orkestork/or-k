import { cn } from "@/lib/work/utils";
import { DEADLINE_MET, WORKFLOW } from "@/lib/work/workflow";
import { daysUntil } from "@/lib/work/format";
import { TONE_CLASS, type Tone } from "@/lib/work/tone";
import type { Priority, WorkflowState } from "@/types/work/domain";

export function StatusBadge({
  state,
  className,
}: {
  state: WorkflowState;
  className?: string;
}) {
  const meta = WORKFLOW[state];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE_CLASS[meta.tone as Tone],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {meta.label}
    </span>
  );
}

const PRIORITY_TONE: Record<Priority, { label: string; tone: Tone }> = {
  low: { label: "Baja", tone: "neutral" },
  medium: { label: "Media", tone: "info" },
  high: { label: "Alta", tone: "warn" },
  urgent: { label: "Urgente", tone: "primary" },
};

export function PriorityBadge({
  priority,
  className,
}: {
  priority: Priority;
  className?: string;
}) {
  const meta = PRIORITY_TONE[priority];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        TONE_CLASS[meta.tone],
        className,
      )}
    >
      {meta.label}
    </span>
  );
}

export function DeadlinePill({
  iso,
  state,
  className,
}: {
  iso: string;
  state?: WorkflowState;
  className?: string;
}) {
  const d = daysUntil(iso);
  if (d < 0 && state && DEADLINE_MET.includes(state)) return null;
  const label =
    d < 0
      ? `Vencido ${Math.abs(d)}d`
      : d === 0
        ? "Hoy"
        : d === 1
          ? "Mañana"
          : `${d} días`;
  const tone: string =
    d < 0
      ? "border-destructive/30 bg-destructive/10 text-destructive"
      : d <= 2
        ? TONE_CLASS.warn
        : "border-border text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        tone,
        className,
      )}
    >
      {label}
    </span>
  );
}
