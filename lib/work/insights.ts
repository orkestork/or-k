import type { Request, WorkflowState } from "@/types/work/domain";
import { WORKFLOW, nextState } from "@/lib/work/workflow";

const DAY = 86_400_000;
const STATE_BY_LABEL = new Map(Object.values(WORKFLOW).map((m) => [m.label, m.state]));

/** State a request entered with this activity entry, if it was a transition. */
function enteredState(verb: string, detail: string): WorkflowState | null {
  const stage = STATE_BY_LABEL.get(detail);
  if (verb === "movió a") return stage ?? null;
  if (verb === "aprobó en" && stage) return nextState(stage);
  if (verb === "pidió cambios en" && stage) return stage === "copy_review" ? "design" : "adjustments";
  if (verb === "pidió ajustes") return "adjustments";
  return null;
}

/**
 * Average days spent in each stage, from each request's activity log.
 * Only finished stays count (time in the current stage is still running).
 */
export function stageDurations(requests: Request[]) {
  const totals = new Map<WorkflowState, { days: number; stays: number }>();
  for (const r of requests) {
    const transitions = [...r.activity]
      .sort((a, b) => +new Date(a.at) - +new Date(b.at))
      .map((a) => ({ at: +new Date(a.at), state: enteredState(a.verb, a.detail) }))
      .filter((t): t is { at: number; state: WorkflowState } => t.state !== null);
    let current: WorkflowState = "request";
    let since = +new Date(r.createdAt);
    for (const t of transitions) {
      const acc = totals.get(current) ?? { days: 0, stays: 0 };
      acc.days += (t.at - since) / DAY;
      acc.stays += 1;
      totals.set(current, acc);
      current = t.state;
      since = t.at;
    }
  }
  return totals;
}
