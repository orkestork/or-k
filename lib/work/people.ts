import type { Request, WorkUserRecord } from "@/types/work/domain";
import { WORKFLOW } from "@/lib/work/workflow";

/** Lead assignee first, then collaborators (no duplicates). */
export function peopleOn(r: Pick<Request, "assigneeId" | "collaboratorIds">): string[] {
  return [...new Set([r.assigneeId, ...(r.collaboratorIds ?? [])].filter((id): id is string => !!id))];
}

/** True when `userId` leads, collaborates on, or owns an open subtask of the request. */
export function involves(r: Request, userId: string | null | undefined): boolean {
  if (!userId) return false;
  return (
    peopleOn(r).includes(userId) ||
    (r.subtasks ?? []).some((s) => !s.done && s.assigneeId === userId)
  );
}

export const INTERNAL_REVIEW = ["copy_review", "creative_review", "account_review"] as const;
const isInternalReview = (state: Request["state"]) => (INTERNAL_REVIEW as readonly string[]).includes(state);
const isAdminRole = (role: string) => role === "super_admin" || role === "agency_director";

/**
 * The request is waiting on this person's sign-off — as the approver, or as
 * the substitute covering an approver who is away (`substituteOf`).
 */
export function mustApprove(
  r: Request,
  me: Pick<WorkUserRecord, "id" | "role"> | null | undefined,
  substituteOf: (id: string) => string | null | undefined = () => null,
): boolean {
  if (!me || !isInternalReview(r.state)) return false;
  if (r.approverId) return r.approverId === me.id || substituteOf(r.approverId) === me.id;
  return WORKFLOW[r.state].owner === me.role;
}

/** Whether this person may approve / request changes right now. */
export function canApprove(
  r: Request,
  me: Pick<WorkUserRecord, "id" | "role"> | null | undefined,
  approverSubstituteId?: string | null,
): boolean {
  if (!me) return false;
  if (!isInternalReview(r.state) || !r.approverId) return true;
  return r.approverId === me.id || approverSubstituteId === me.id || isAdminRole(me.role);
}

export const ABSENCE_LABEL: Record<"vacation" | "sick" | "leave" | "other", string> = {
  vacation: "De vacaciones",
  sick: "Incapacidad",
  leave: "Permiso",
  other: "Ausente",
};

/** Management roles see the whole operation; mirrors work_sees_all() in SQL. */
export const MANAGEMENT_ROLES = [
  "super_admin", "agency_director", "creative_director", "art_director", "strategy_director",
  "operations_director", "finance", "account_director", "account_manager", "project_manager",
  "producer", "product_manager", "tech_lead",
] as const;

export const seesAll = (role: string | null | undefined) =>
  !!role && (MANAGEMENT_ROLES as readonly string[]).includes(role);

/** HR + admins manage employee files (mirrors work_is_hr). */
export const isHr = (role: string | null | undefined) =>
  role === "super_admin" || role === "agency_director" || role === "hr";

/** May read salaries (mirrors work_sees_pay). */
export const seesPay = (role: string | null | undefined) => isHr(role) || role === "finance";

const nextDay = (ymd: string) => new Date(Date.parse(`${ymd}T12:00:00`) + 86_400_000).toLocaleDateString("en-CA");

const businessDays = (from: string, to: string) => {
  let n = 0;
  for (let d = new Date(`${from}T12:00:00`); d <= new Date(`${to}T12:00:00`); d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0 && d.getDay() !== 6) n++;
  }
  return n;
};

/**
 * Colombian vacation balance: 15 working days per year worked, accrued daily
 * from the start date; minus approved vacation days (weekdays) already taken.
 */
export function vacationBalance(
  startDate: string | null,
  absences: { kind: string; status: string; startOn: string; endOn: string }[],
  today = new Date().toLocaleDateString("en-CA"),
) {
  const vacations = absences.filter((a) => a.kind === "vacation");
  const taken = vacations
    .filter((a) => a.status === "approved" && a.startOn <= today)
    .reduce((n, a) => n + businessDays(a.startOn, a.endOn < today ? a.endOn : today), 0);
  // Approved days still ahead (not taken yet).
  const scheduled = vacations
    .filter((a) => a.status === "approved" && a.endOn > today)
    .reduce((n, a) => n + businessDays(a.startOn > today ? a.startOn : nextDay(today), a.endOn), 0);
  const pending = vacations.filter((a) => a.status === "pending").reduce((n, a) => n + businessDays(a.startOn, a.endOn), 0);
  const days = startDate ? (Date.parse(`${today}T12:00:00`) - Date.parse(`${startDate}T12:00:00`)) / 86_400_000 : 0;
  const accrued = Math.max(0, Math.floor(((days / 365) * 15) * 10) / 10);
  return { accrued, taken, scheduled, pending, available: Math.round((accrued - taken) * 10) / 10, businessDays };
}

/** Finance module access (mirrors work_sees_finance). */
export const seesFinance = (role: string | null | undefined) =>
  role === "super_admin" || role === "agency_director" || role === "finance";
