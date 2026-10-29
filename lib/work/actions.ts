"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type {
  Absence,
  ClientBilling,
  HrDocument,
  HrProfile,
  AdjustmentTarget,
  Automation,
  Recurrence,
  AssetItem,
  CalendarEvent,
  Project,
  Request,
  RoleSlug,
  WorkflowState,
} from "@/types/work/domain";
import {
  saveClientBilling,
  deleteExpense,
  deleteIncome,
  deleteRecurringCost,
  deleteApp,
  deleteAppPlan,
  saveApp,
  saveAppPlan,
  saveAppSubscribers,
  saveBudget,
  saveExpense,
  saveIncome,
  saveRecurringCost,
  type FinIncome,
  addHrDocument,
  decideAbsence,
  deleteHrDocument,
  saveHrProfile,
  savePayrollParams,
  deleteAbsence,
  saveAbsence,
  addTimeEntry,
  clientCreateRequest,
  createProjectFromTemplate,
  deleteAutomation,
  deleteClientDoc,
  deleteRecurrence,
  deleteTemplate,
  deleteTimeEntry,
  saveAutomation,
  saveClientDoc,
  saveProjectAsTemplate,
  saveRecurrence,
  searchAll,
  setAutomationActive,
  updateRequestDates,
  updateRequestSchedule,
  addAsset,
  addComment,
  addMarker,
  addRequestFiles,
  addSubtask,
  addVersion,
  advanceRequest,
  clientDecide,
  assignRequest,
  createCalendarEvent,
  createClientRecord,
  createProjectRecord,
  createRequest,
  decideApproval,
  deleteAsset,
  deleteMinute,
  deleteRequest,
  deleteRequestFile,
  deleteSubtask,
  getMe,
  isAdmin,
  markAllNotificationsRead,
  registerAdjustment,
  saveCopy,
  saveMinute,
  toggleAgreement,
  setApprover,
  setMarkerResolved,
  setVersionShared,
  setRequestState,
  updateClientRecord,
  setClientActive,
  updateRequest,
  updateSubtask,
  updateProfile,
  updateProjectRecord,
  type ClientInput,
  type MinuteInput,
  type NewRequestInput,
  type ProjectInput,
} from "@/lib/work/data";
import { adminConfigured, createAdminClient } from "@/lib/work/supabase/admin";
import type { PayrollParams } from "@/lib/work/payroll";
import { isHr, seesAll, seesFinance } from "@/lib/work/people";
import type { AppPlan, FinApp, Recurring } from "@/lib/work/finance";
import { createClient } from "@/lib/work/supabase/server";

export type FormState = { error: string | null; ok?: boolean; id?: string };

function revalidateRequest(id: string) {
  revalidatePath(`/work/requests/${id}`);
  revalidatePath("/work/requests");
  revalidatePath("/work/workflow");
  revalidatePath("/work/home");
  revalidatePath("/work/approvals");
  revalidatePath("/work/inbox");
}

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const list = (fd: FormData, key: string) => fd.getAll(key).map(String).filter(Boolean);
const message = (e: unknown) => (e instanceof Error ? e.message : "Algo salió mal");

/* ------------------------------------------------------------ requests --- */

export async function advanceRequestAction(id: string) {
  await advanceRequest(id);
  revalidateRequest(id);
}

export async function setRequestStateAction(id: string, state: WorkflowState) {
  await setRequestState(id, state);
  revalidateRequest(id);
}

export async function decideApprovalAction(
  id: string,
  decision: "approved" | "changes_requested",
  note: string,
) {
  await decideApproval(id, decision, note);
  revalidateRequest(id);
}

export async function addCommentAction(id: string, body: string, visibleToClient = false) {
  await addComment(id, body, visibleToClient);
  revalidateRequest(id);
  revalidatePath(`/work/portal/${id}`);
}

export async function addMarkerAction(input: {
  requestId: string;
  versionId: string | null;
  x: number;
  y: number;
  body: string;
}) {
  if (!input.body.trim()) throw new Error("Escribe el comentario de la marca");
  await addMarker(input);
  revalidateRequest(input.requestId);
  revalidatePath(`/work/portal/${input.requestId}`);
}

export async function addRequestFilesAction(
  requestId: string,
  files: { name: string; size: number; storagePath: string }[],
) {
  await addRequestFiles(requestId, files);
  revalidateRequest(requestId);
  revalidatePath(`/work/portal/${requestId}`);
}

export async function deleteRequestFileAction(requestId: string, fileId: string) {
  await deleteRequestFile(fileId);
  revalidateRequest(requestId);
  revalidatePath(`/work/portal/${requestId}`);
}

export async function saveMinuteAction(requestId: string, minuteId: string | null, input: MinuteInput) {
  if (!input.title.trim()) throw new Error("El acta necesita un título");
  if (!input.heldOn) throw new Error("Indica la fecha de la reunión");
  await saveMinute(requestId, minuteId, input);
  revalidateRequest(requestId);
  revalidatePath(`/work/portal/${requestId}`);
}

export async function deleteMinuteAction(requestId: string, minuteId: string) {
  await deleteMinute(minuteId);
  revalidateRequest(requestId);
  revalidatePath(`/work/portal/${requestId}`);
}

export async function toggleAgreementAction(requestId: string, minuteId: string, index: number, done: boolean) {
  await toggleAgreement(minuteId, index, done);
  revalidateRequest(requestId);
}

export async function addSubtaskAction(
  requestId: string,
  input: { title: string; assigneeId: string | null; dueOn: string | null },
) {
  if (!input.title.trim()) throw new Error("Escribe la subtarea");
  await addSubtask(requestId, input);
  revalidateRequest(requestId);
  revalidatePath("/work/team");
}

export async function updateSubtaskAction(
  requestId: string,
  subtaskId: string,
  patch: Partial<{ title: string; assigneeId: string | null; dueOn: string | null; done: boolean }>,
) {
  await updateSubtask(requestId, subtaskId, patch);
  revalidateRequest(requestId);
  revalidatePath("/work/team");
}

export async function deleteSubtaskAction(requestId: string, subtaskId: string) {
  await deleteSubtask(subtaskId);
  revalidateRequest(requestId);
  revalidatePath("/work/team");
}

export async function setVersionSharedAction(requestId: string, versionId: string, shared: boolean) {
  await setVersionShared(requestId, versionId, shared);
  revalidateRequest(requestId);
  revalidatePath(`/work/portal/${requestId}`);
  revalidatePath("/work/portal");
}

export async function setMarkerResolvedAction(requestId: string, markerId: string, resolved: boolean) {
  await setMarkerResolved(markerId, resolved);
  revalidateRequest(requestId);
  revalidatePath(`/work/portal/${requestId}`);
}

export async function clientDecideAction(
  id: string,
  decision: "approved" | "changes_requested",
  note: string,
) {
  await clientDecide(id, decision, note);
  revalidatePath("/work/portal");
  revalidatePath(`/work/portal/${id}`);
  revalidateRequest(id);
}

export async function addVersionAction(
  id: string,
  fileName: string,
  note: string,
  storagePath?: string | null,
) {
  await addVersion(id, fileName, note, storagePath);
  revalidateRequest(id);
}

export async function registerAdjustmentAction(
  id: string,
  target: AdjustmentTarget,
  comment: string,
) {
  await registerAdjustment(id, target, comment);
  revalidateRequest(id);
}

export async function saveCopyAction(id: string, copy: Omit<Request["copy"], "drafts">) {
  await saveCopy(id, copy);
  revalidateRequest(id);
}

export async function setApproverAction(id: string, approverId: string | null) {
  await setApprover(id, approverId);
  revalidateRequest(id);
}

export async function assignRequestAction(id: string, peopleIds: string[]) {
  await assignRequest(id, peopleIds);
  revalidateRequest(id);
  revalidatePath("/work/team");
}

function requestInput(formData: FormData): NewRequestInput {
  return {
    projectId: text(formData, "projectId"),
    campaign: text(formData, "campaign"),
    title: text(formData, "title"),
    objective: text(formData, "objective"),
    audience: text(formData, "audience"),
    mainMessage: text(formData, "mainMessage"),
    cta: text(formData, "cta"),
    deliverables: text(formData, "deliverables"),
    formats: text(formData, "formats"),
    channels: text(formData, "channels"),
    references: text(formData, "references"),
    deadline: text(formData, "deadline"),
    priority: (text(formData, "priority") || "medium") as NewRequestInput["priority"],
    assigneeId: text(formData, "assigneeId") || null,
    collaboratorIds: list(formData, "collaboratorIds"),
    roundsIncluded: Number(formData.get("roundsIncluded") ?? 2),
    observations: text(formData, "observations"),
    startOn: text(formData, "startOn") || undefined,
    dependsOn: list(formData, "dependsOn"),
    approverId: text(formData, "approverId") || null,
  };
}

/**
 * Creates a request plus its initial subtasks and returns the new id, so the
 * form can upload attachments to requests/<id>/ before opening it.
 */
export async function createRequestWithSubtasksAction(
  formData: FormData,
  subtasks: { title: string; assigneeId: string | null; dueOn: string | null }[],
): Promise<{ id: string } | { error: string }> {
  const input = requestInput(formData);
  if (!input.projectId) return { error: "Elige un proyecto." };
  if (!input.title) return { error: "Escribe un título." };
  try {
    const id = await createRequest(input);
    for (const st of subtasks.filter((s) => s.title.trim())) await addSubtask(id, st);
    revalidatePath("/work/requests");
    revalidatePath("/work/home");
    revalidatePath("/work/workflow");
    revalidatePath("/work/calendar");
    return { id };
  } catch (e) {
    return { error: message(e) };
  }
}

export async function updateRequestAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const input = requestInput(formData);
  if (!id || !input.projectId || !input.title) redirect(`/work/requests/${id}/edit?error=1`);
  await updateRequest(id, { ...input, state: (text(formData, "state") || undefined) as WorkflowState | undefined });
  revalidateRequest(id);
  revalidatePath("/work/calendar");
  revalidatePath(`/work/portal/${id}`);
  redirect(`/work/requests/${id}`);
}

export async function deleteRequestAction(id: string) {
  await requireAdmin();
  await deleteRequest(id);
  revalidateRequest(id);
  revalidatePath("/work/calendar");
  redirect("/work/requests");
}

/* ------------------------------------------------------------- clients --- */

function clientInput(fd: FormData): ClientInput {
  return {
    name: text(fd, "name"),
    logoText: text(fd, "logoText"),
    accentColor: text(fd, "accentColor"),
    industry: text(fd, "industry"),
    contact: {
      name: text(fd, "contactName"),
      role: text(fd, "contactRole"),
      email: text(fd, "contactEmail"),
      phone: text(fd, "contactPhone"),
    },
    accountManagerId: text(fd, "accountManagerId") || null,
    teamIds: list(fd, "teamIds"),
    legal: {
      legalName: text(fd, "legalName"),
      taxId: text(fd, "taxId"),
      taxRegime: text(fd, "taxRegime"),
      address: text(fd, "address"),
      city: text(fd, "city"),
      country: text(fd, "country"),
      website: text(fd, "website"),
      billingEmail: text(fd, "billingEmail"),
    },
  };
}

export async function setClientActiveAction(id: string, active: boolean) {
  const me = await getMe();
  if (!seesAll(me?.role)) throw new Error("No tienes permiso para cambiar el estado del cliente");
  await setClientActive(id, active);
  revalidatePath("/work", "layout");
}

export async function saveClientAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = text(fd, "id");
  const input = clientInput(fd);
  if (!input.name) return { error: "El nombre del cliente es obligatorio." };
  let target: string;
  try {
    if (id) {
      await updateClientRecord(id, input);
      target = id;
    } else {
      target = await createClientRecord(input);
    }
    if (fd.get("billingEnabled") === "1") {
      const split = text(fd, "billingSplit")
        .split(/[,/\s]+/)
        .map(Number)
        .filter((n) => n > 0);
      await saveClientBilling(
        target,
        {
          model: (text(fd, "billingModel") || "project") as ClientBilling["model"],
          paymentMethod: (text(fd, "billingMethod") || "transfer") as ClientBilling["paymentMethod"],
          termsDays: Number(text(fd, "billingTerms") || 30),
          ivaRate: Number(text(fd, "billingIva") || 19),
          withholding: fd.get("billingWithholding") === "on",
          contractValue: Number(text(fd, "billingValue").replace(/\D/g, "")) || null,
          installments: Number(text(fd, "billingInstallments") || 1),
          installmentFrequency: (text(fd, "billingFrequency") || "monthly") as ClientBilling["installmentFrequency"],
          installmentSplit: split,
          firstDueOn: text(fd, "billingFirstDue") || null,
          notes: text(fd, "billingNotes"),
        },
        fd.get("billingGenerate") === "on",
      );
    }
  } catch (e) {
    return { error: message(e) };
  }
  revalidatePath("/work/finance", "layout");
  revalidatePath("/work/clients");
  revalidatePath(`/work/clients/${target}`);
  redirect(`/work/clients/${target}`);
}

/* ------------------------------------------------------------ projects --- */

export async function saveProjectAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = text(fd, "id");
  const input: ProjectInput = {
    clientId: text(fd, "clientId"),
    name: text(fd, "name"),
    brief: text(fd, "brief"),
    status: (text(fd, "status") || "active") as Project["status"],
    startDate: text(fd, "startDate"),
    targetDate: text(fd, "targetDate"),
    leadId: text(fd, "leadId") || null,
    teamIds: list(fd, "teamIds"),
    budgetHours: text(fd, "budgetHours") ? Number(text(fd, "budgetHours")) : null,
  };
  if (!input.clientId || !input.name) return { error: "Cliente y nombre son obligatorios." };
  let target: string;
  try {
    if (id) {
      await updateProjectRecord(id, input);
      target = id;
    } else {
      target = await createProjectRecord(input);
    }
  } catch (e) {
    return { error: message(e) };
  }
  revalidatePath("/work/projects");
  revalidatePath(`/work/clients/${input.clientId}`);
  redirect(`/work/projects/${target}`);
}

/* -------------------------------------------------------------- assets --- */

export async function addAssetAction(input: {
  clientId: string;
  category: AssetItem["category"];
  name: string;
  storagePath?: string | null;
  url?: string | null;
}) {
  await addAsset(input);
  revalidatePath("/work/assets");
  revalidatePath(`/work/clients/${input.clientId}`);
}

export async function deleteAssetAction(id: string, clientId: string) {
  await deleteAsset(id);
  revalidatePath("/work/assets");
  revalidatePath(`/work/clients/${clientId}`);
}

/* ------------------------------------------------------- calendar/inbox --- */

export async function createEventAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const title = text(fd, "title");
  const date = text(fd, "date");
  if (!title || !date) return { error: "Título y fecha son obligatorios." };
  try {
    await createCalendarEvent({
      title,
      date,
      kind: (text(fd, "kind") || "meeting") as CalendarEvent["kind"],
      clientId: text(fd, "clientId") || null,
    });
  } catch (e) {
    return { error: message(e) };
  }
  revalidatePath("/work/calendar");
  return { error: null, ok: true };
}

export async function markAllReadAction() {
  await markAllNotificationsRead();
  revalidatePath("/work/inbox");
}

/* ------------------------------------------------------- team/settings --- */

export async function updateMyProfileAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await getMe();
  if (!me) return { error: "Sesión no válida" };
  try {
    await updateProfile(me.id, {
      name: text(fd, "name"),
      title: text(fd, "title"),
      color: text(fd, "color") || me.color,
    });
  } catch (e) {
    return { error: message(e) };
  }
  revalidatePath("/work", "layout");
  return { error: null, ok: true };
}

/** Sets (or clears) a profile photo. Members change their own; admins anyone's. */
export async function setAvatarAction(userId: string, avatarUrl: string | null) {
  const me = await getMe();
  if (!me) throw new Error("Sesión no válida");
  if (userId !== me.id && !isAdmin(me)) throw new Error("Solo un administrador puede cambiar la foto de otra persona");
  await updateProfile(userId, { avatarUrl });
  revalidatePath("/work", "layout");
}

export async function changePasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  if (password.length < 8) return { error: "Mínimo 8 caracteres." };
  if (password !== confirm) return { error: "Las contraseñas no coinciden." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  return { error: null, ok: true };
}

async function requireAdmin() {
  const me = await getMe();
  if (!isAdmin(me)) throw new Error("Solo un administrador puede gestionar el equipo");
  return me!;
}

export async function updateMemberAction(
  id: string,
  patch: { role?: RoleSlug; active?: boolean; clientId?: string | null; title?: string; managerId?: string | null; backupId?: string | null },
) {
  await requireAdmin();
  await updateProfile(id, patch);
  revalidatePath("/work/settings");
  revalidatePath("/work/clients", "layout");
  revalidatePath("/work/team");
  revalidatePath(`/work/team/${id}`);
}

export async function createMemberAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await getMe();
  if (!isAdmin(me) && !isHr(me?.role)) return { error: "Solo administradores o Talento humano pueden crear personas" };
  if (!adminConfigured) {
    return { error: "Falta SUPABASE_SERVICE_ROLE_KEY en .env.local para crear usuarios." };
  }
  const email = text(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  const name = text(fd, "name");
  const role = (text(fd, "role") || "designer") as RoleSlug;
  if (!email || !name) return { error: "Nombre y correo son obligatorios." };
  if (password.length < 8) return { error: "La contraseña temporal debe tener mínimo 8 caracteres." };
  if (role === "client" && !text(fd, "clientId")) return { error: "Elige a qué cliente pertenece este usuario." };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role, title: text(fd, "title") },
    app_metadata: { work_role: role },
  });
  if (error) return { error: error.message };

  // The auth trigger falls back to an inactive client when it can't apply the
  // role, so set the profile explicitly and surface any failure.
  const { error: profileError } = await admin
    .from("profiles")
    .update({
      name,
      title: text(fd, "title"),
      role,
      active: true,
      // Only client users belong to a client account.
      client_id: role === "client" ? text(fd, "clientId") || null : null,
      manager_id: role === "client" ? null : text(fd, "managerId") || null,
      backup_id: role === "client" ? null : text(fd, "backupId") || null,
    })
    .eq("id", data.user.id);
  if (profileError) {
    return {
      error: `Usuario creado, pero no se pudo asignar el rol (${profileError.message}). Corrígelo en su ficha.`,
    };
  }
  revalidatePath("/work/settings");
  revalidatePath("/work/team");
  revalidatePath("/work/clients", "layout");
  return { error: null, ok: true, id: data.user.id };
}

export async function removeMemberAction(id: string) {
  const me = await requireAdmin();
  if (id === me.id) throw new Error("No puedes eliminar tu propia cuenta");
  if (adminConfigured) {
    const { error } = await createAdminClient().auth.admin.deleteUser(id);
    if (error) throw new Error(error.message);
  } else {
    await updateProfile(id, { active: false });
  }
  revalidatePath("/work/settings");
  revalidatePath("/work/team");
  revalidatePath("/work/clients", "layout");
}

/* ======================================================= planning tools === */

export async function updateRequestDatesAction(id: string, startOn: string, deadline: string) {
  await updateRequestDates(id, startOn, deadline);
  revalidateRequest(id);
  revalidatePath("/work/calendar");
  revalidatePath("/work/projects", "layout");
}

export async function updateRequestScheduleAction(
  projectId: string,
  id: string,
  input: { title: string; startOn: string; deadline: string; deliverables: string[]; state: WorkflowState },
) {
  if (!seesAll((await getMe())?.role)) throw new Error("No tienes permiso para editar el cronograma");
  await updateRequestSchedule(id, input);
  revalidateRequest(id);
  revalidatePath("/work/calendar");
  revalidatePath(`/work/projects/${projectId}`);
  revalidatePath("/work/portal", "layout");
}

export async function addTimeEntryAction(input: { requestId: string; minutes: number; workedOn: string; note: string }) {
  await addTimeEntry(input);
  revalidateRequest(input.requestId);
  revalidatePath("/work/projects", "layout");
  revalidatePath("/work/insights");
  revalidatePath("/work/team", "layout");
}

export async function deleteTimeEntryAction(requestId: string, id: string) {
  await deleteTimeEntry(id);
  revalidateRequest(requestId);
  revalidatePath("/work/projects", "layout");
  revalidatePath("/work/insights");
}

export async function saveTemplateAction(projectId: string, name: string, description: string) {
  await saveProjectAsTemplate(projectId, name, description);
  revalidatePath("/work/templates");
}

export async function applyTemplateAction(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const templateId = text(fd, "templateId");
  const clientId = text(fd, "clientId");
  const startDate = text(fd, "startDate");
  if (!templateId || !clientId || !startDate) return { error: "Elige plantilla, cliente y fecha de inicio." };
  let projectId: string;
  try {
    projectId = await createProjectFromTemplate(templateId, {
      clientId,
      name: text(fd, "name"),
      startDate,
      leadId: text(fd, "leadId") || null,
    });
  } catch (e) {
    return { error: message(e) };
  }
  revalidatePath("/work/projects");
  revalidatePath("/work/requests");
  revalidatePath("/work/workflow");
  revalidatePath("/work/calendar");
  redirect(`/work/projects/${projectId}`);
}

export async function deleteTemplateAction(id: string) {
  await deleteTemplate(id);
  revalidatePath("/work/templates");
}

export async function saveClientDocAction(
  id: string | null,
  input: { clientId: string; title: string; body: string; pinned: boolean; visibleToClient: boolean },
) {
  const docId = await saveClientDoc(id, input);
  revalidatePath(`/work/clients/${input.clientId}`, "layout");
  revalidatePath("/work/portal");
  return docId;
}

export async function deleteClientDocAction(clientId: string, id: string) {
  await deleteClientDoc(id);
  revalidatePath(`/work/clients/${clientId}`, "layout");
  redirect(`/work/clients/${clientId}`);
}

export async function clientCreateRequestAction(_prev: FormState, fd: FormData): Promise<FormState> {
  let id: string;
  try {
    id = await clientCreateRequest({
      projectId: text(fd, "projectId"),
      title: text(fd, "title"),
      description: text(fd, "description"),
      wantedOn: text(fd, "wantedOn") || null,
    });
  } catch (e) {
    return { error: message(e) };
  }
  revalidatePath("/work/portal");
  revalidatePath("/work/requests");
  redirect(`/work/portal/${id}`);
}

export async function saveRecurrenceAction(id: string | null, input: Omit<Recurrence, "id">) {
  if (!input.title.trim()) throw new Error("Escribe el nombre de la tarea");
  await saveRecurrence(id, input);
  revalidatePath(`/work/projects/${input.projectId}`);
}

export async function deleteRecurrenceAction(projectId: string, id: string) {
  await deleteRecurrence(id);
  revalidatePath(`/work/projects/${projectId}`);
}

export async function saveAutomationAction(input: Omit<Automation, "id" | "active">) {
  await requireAdmin();
  await saveAutomation(input);
  revalidatePath("/work/settings");
}

export async function setAutomationActiveAction(id: string, active: boolean) {
  await requireAdmin();
  await setAutomationActive(id, active);
  revalidatePath("/work/settings");
}

export async function deleteAutomationAction(id: string) {
  await requireAdmin();
  await deleteAutomation(id);
  revalidatePath("/work/settings");
}

export async function saveAbsenceAction(input: Omit<Absence, "id" | "status" | "decidedBy">) {
  await saveAbsence(input);
  revalidatePath("/work", "layout");
}

export async function decideAbsenceAction(id: string, decision: "approved" | "rejected") {
  await decideAbsence(id, decision);
  revalidatePath("/work", "layout");
}

export async function savePayrollParamsAction(params: PayrollParams) {
  await savePayrollParams(params);
  revalidatePath("/work/hr", "layout");
}

export async function saveHrProfileAction(profile: HrProfile) {
  await saveHrProfile(profile);
  revalidatePath("/work/hr", "layout");
}

export async function addHrDocumentAction(input: {
  userId: string;
  category: HrDocument["category"];
  name: string;
  size: number;
  storagePath: string;
}) {
  await addHrDocument(input);
  revalidatePath(`/work/hr/${input.userId}`);
}

export async function deleteHrDocumentAction(userId: string, id: string) {
  await deleteHrDocument(id);
  revalidatePath(`/work/hr/${userId}`);
}

export async function deleteAbsenceAction(id: string) {
  await deleteAbsence(id);
  revalidatePath("/work", "layout");
}

export async function searchAction(term: string) {
  return searchAll(term);
}

/* ----------------------------------------------------------- finance --- */

async function requireFinance() {
  const me = await getMe();
  if (!seesFinance(me?.role)) throw new Error("Solo Finanzas y la dirección pueden gestionar finanzas");
}

const refreshFinance = () => revalidatePath("/work/finance", "layout");

export async function saveAppAction(id: string | null, input: Omit<FinApp, "id">) {
  await requireFinance();
  if (!input.name.trim()) throw new Error("Ponle un nombre a la aplicación");
  await saveApp(id, input);
  refreshFinance();
}

export async function deleteAppAction(id: string) {
  await requireFinance();
  await deleteApp(id);
  refreshFinance();
}

export async function saveAppPlanAction(id: string | null, input: Omit<AppPlan, "id">) {
  await requireFinance();
  if (!input.name.trim()) throw new Error("Ponle un nombre al plan");
  await saveAppPlan(id, input);
  refreshFinance();
}

export async function deleteAppPlanAction(id: string) {
  await requireFinance();
  await deleteAppPlan(id);
  refreshFinance();
}

export async function saveAppSubscribersAction(ym: string, counts: Record<string, number>) {
  await requireFinance();
  if (!/^\d{4}-\d{2}$/.test(ym)) throw new Error("Mes inválido");
  await saveAppSubscribers(ym, counts);
  refreshFinance();
}

export async function saveRecurringCostAction(id: string | null, input: Omit<Recurring, "id">) {
  await requireFinance();
  if (!input.name.trim()) throw new Error("Ponle un nombre al gasto");
  await saveRecurringCost(id, input);
  refreshFinance();
}

export async function deleteRecurringCostAction(id: string) {
  await requireFinance();
  await deleteRecurringCost(id);
  refreshFinance();
}

export async function saveExpenseAction(input: Parameters<typeof saveExpense>[0]) {
  await requireFinance();
  if (!(input.amount > 0)) throw new Error("Escribe el valor del gasto");
  await saveExpense(input);
  refreshFinance();
}

export async function deleteExpenseAction(id: string) {
  await requireFinance();
  await deleteExpense(id);
  refreshFinance();
}

export async function saveIncomeAction(id: string | null, input: Omit<FinIncome, "id">) {
  await requireFinance();
  if (!(input.amount > 0)) throw new Error("Escribe el valor");
  await saveIncome(id, input);
  refreshFinance();
}

export async function deleteIncomeAction(id: string) {
  await requireFinance();
  await deleteIncome(id);
  refreshFinance();
}

export async function saveBudgetAction(year: number, month: number, amounts: Record<string, number>) {
  await requireFinance();
  await saveBudget(year, month, amounts);
  refreshFinance();
}
