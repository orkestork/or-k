import type { Request, WorkflowState } from "@/types/work/domain";
import { WORKFLOW, nextState } from "@/lib/work/workflow";

export type ClientStage = "received" | "production" | "adjustments" | "review" | "approved" | "delivered" | "archived";

/** Where a request stands, in the words a client uses. */
export function clientStage(state: WorkflowState): ClientStage {
  switch (state) {
    case "request":
    case "briefing":
      return "received";
    case "client_review":
      return "review";
    case "adjustments":
      return "adjustments";
    case "approved":
    case "scheduled":
      return "approved";
    case "published":
    case "completed":
      return "delivered";
    case "archived":
      return "archived";
    default:
      return "production";
  }
}

const STAGE: Record<ClientStage, { label: string; className: string; progress: number }> = {
  received: { label: "Recibida", className: "bg-muted text-muted-foreground", progress: 0.05 },
  production: { label: "En producción", className: "bg-tone-info/15 text-tone-info", progress: 0.4 },
  adjustments: { label: "En ajustes", className: "bg-tone-warn/15 text-tone-warn", progress: 0.55 },
  review: { label: "Esperando tu revisión", className: "bg-primary/15 text-primary", progress: 0.75 },
  approved: { label: "Aprobada", className: "bg-tone-positive/15 text-tone-positive", progress: 0.9 },
  delivered: { label: "Entregada", className: "bg-tone-positive/15 text-tone-positive", progress: 1 },
  archived: { label: "Archivada", className: "bg-muted text-muted-foreground", progress: 1 },
};

export function clientStatus(state: WorkflowState) {
  return STAGE[clientStage(state)];
}

/** 0–100 progress of a set of requests, weighted by how far each one is. */
export function clientProgress(requests: Pick<Request, "state">[]) {
  if (!requests.length) return 0;
  return Math.round((requests.reduce((a, r) => a + clientStatus(r.state).progress, 0) / requests.length) * 100);
}

const STATE_BY_LABEL = new Map(Object.values(WORKFLOW).map((m) => [m.label, m.state]));

/** Turns a raw activity entry into a client-facing sentence (or null to hide it). */
export function clientActivity(
  entry: { verb: string; detail: string },
  title: string,
): { text: string; tone: "info" | "positive" | "warn" | "primary" } | null {
  switch (entry.verb) {
    case "subió":
      return { text: `Nueva versión ${entry.detail} de «${title}»`, tone: "info" };
    case "adjuntó":
      return { text: `Nuevo archivo en «${title}»: ${entry.detail}`, tone: "info" };
    case "creó la solicitud desde el portal":
      return { text: `Pediste «${title}»`, tone: "info" };
    case "reprogramó":
      return { text: `Se actualizaron las fechas de «${title}»`, tone: "info" };
    case "pidió ajustes":
      return { text: `Pediste ajustes en «${title}»`, tone: "warn" };
    case "aprobó en": {
      if (entry.detail === WORKFLOW.client_review.label) return { text: `Aprobaste «${title}»`, tone: "positive" };
      // An internal sign-off that hands the piece to the client.
      const stage = STATE_BY_LABEL.get(entry.detail);
      return stage && nextState(stage) === "client_review"
        ? { text: `«${title}» está lista para tu revisión`, tone: "primary" }
        : null;
    }
    case "movió a": {
      const state = STATE_BY_LABEL.get(entry.detail);
      if (!state) return null;
      const stage = clientStage(state);
      if (stage === "review") return { text: `«${title}» está lista para tu revisión`, tone: "primary" };
      if (stage === "delivered") return { text: `«${title}» fue entregada`, tone: "positive" };
      if (stage === "production") return { text: `«${title}» entró en producción`, tone: "info" };
      return null;
    }
    default:
      return null;
  }
}
