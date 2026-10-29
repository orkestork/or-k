import type { RoleSlug, WorkflowState } from "@/types/work/domain";

export interface WorkflowStageMeta {
  state: WorkflowState;
  label: string;
  short: string;
  /** Column bucket for the Kanban board. */
  board: "brief" | "copy" | "design" | "review" | "client" | "adjustments" | "approved" | "done" | null;
  /** Role that owns the piece while it sits in this state. */
  owner: RoleSlug | null;
  tone: "neutral" | "info" | "progress" | "warn" | "positive" | "muted";
  order: number;
}

export const WORKFLOW: Record<WorkflowState, WorkflowStageMeta> = {
  request: { state: "request", label: "Solicitud", short: "Request", board: "brief", owner: "account_manager", tone: "neutral", order: 0 },
  briefing: { state: "briefing", label: "Briefing", short: "Brief", board: "brief", owner: "account_manager", tone: "info", order: 1 },
  copy: { state: "copy", label: "Copy", short: "Copy", board: "copy", owner: "copywriter", tone: "progress", order: 2 },
  design: { state: "design", label: "Diseño", short: "Design", board: "design", owner: "designer", tone: "progress", order: 3 },
  copy_review: { state: "copy_review", label: "Revisión de copy", short: "Copy review", board: "review", owner: "copywriter", tone: "warn", order: 4 },
  creative_review: { state: "creative_review", label: "Dirección creativa", short: "Creative", board: "review", owner: "creative_director", tone: "warn", order: 5 },
  account_review: { state: "account_review", label: "Revisión de cuenta", short: "Account", board: "review", owner: "account_manager", tone: "warn", order: 6 },
  client_review: { state: "client_review", label: "Revisión del cliente", short: "Client", board: "client", owner: "client", tone: "warn", order: 7 },
  adjustments: { state: "adjustments", label: "Ajustes", short: "Ajustes", board: "adjustments", owner: null, tone: "warn", order: 8 },
  approved: { state: "approved", label: "Aprobado", short: "Aprobado", board: "approved", owner: "account_manager", tone: "positive", order: 9 },
  scheduled: { state: "scheduled", label: "Programado", short: "Programado", board: "done", owner: "community_manager", tone: "positive", order: 10 },
  published: { state: "published", label: "Publicado", short: "Publicado", board: "done", owner: "community_manager", tone: "positive", order: 11 },
  completed: { state: "completed", label: "Completado", short: "Completado", board: "done", owner: null, tone: "muted", order: 12 },
  archived: { state: "archived", label: "Archivado", short: "Archivado", board: null, owner: null, tone: "muted", order: 13 },
};

export const WORKFLOW_ORDER: WorkflowState[] = Object.values(WORKFLOW)
  .sort((a, b) => a.order - b.order)
  .map((s) => s.state);

export const BOARD_COLUMNS: { id: NonNullable<WorkflowStageMeta["board"]>; label: string; states: WorkflowState[] }[] = [
  { id: "brief", label: "Brief", states: ["request", "briefing"] },
  { id: "copy", label: "Copy", states: ["copy"] },
  { id: "design", label: "Design", states: ["design"] },
  { id: "review", label: "Revisión interna", states: ["copy_review", "creative_review", "account_review"] },
  { id: "client", label: "Cliente", states: ["client_review"] },
  { id: "adjustments", label: "Ajustes", states: ["adjustments"] },
  { id: "approved", label: "Aprobado", states: ["approved", "scheduled", "published", "completed"] },
];

/** Past these states the deadline has been met, so a piece can't be overdue. */
export const DEADLINE_MET: WorkflowState[] = ["approved", "scheduled", "published", "completed", "archived"];

/** Open work whose deadline already passed (one rule for Home, Insights, filters and badges). */
export const isOverdue = (r: { state: WorkflowState; deadline: string }) =>
  !DEADLINE_MET.includes(r.state) && new Date(r.deadline).getTime() < Date.now();

/** Forward path through the flow (skips adjustments loop and archive). */
export const HAPPY_PATH: WorkflowState[] = [
  "request",
  "briefing",
  "copy",
  "design",
  "copy_review",
  "creative_review",
  "account_review",
  "client_review",
  "approved",
  "scheduled",
  "published",
  "completed",
];

export function nextState(state: WorkflowState): WorkflowState | null {
  const i = HAPPY_PATH.indexOf(state);
  if (i === -1 || i === HAPPY_PATH.length - 1) return null;
  return HAPPY_PATH[i + 1];
}

export function stageLabel(state: WorkflowState) {
  return WORKFLOW[state].label;
}
