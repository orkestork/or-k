/* Data access for OR-K WORK.
   Reads and writes Supabase as the signed-in user (RLS decides what they can
   touch). Before Supabase is configured every call falls back to the
   in-memory mock so the UI keeps rendering in preview mode. */

import "server-only";
import type {
  Absence,
  ClientBilling,
  HrDocument,
  HrProfile,
  ActivityEntry,
  Automation,
  ClientDoc,
  ProjectTemplate,
  Recurrence,
  TemplateTask,
  TimeEntry,
  AdjustmentTarget,
  AssetItem,
  CalendarEvent,
  Client,
  Comment,
  Notification,
  Priority,
  Project,
  Request,
  RoleSlug,
  WorkflowState,
  WorkUserRecord,
} from "@/types/work/domain";
import { DEADLINE_MET, WORKFLOW, isOverdue, nextState } from "@/lib/work/workflow";
import { ABSENCE_LABEL, INTERNAL_REVIEW, canApprove, involves, isHr, mustApprove, peopleOn, seesAll } from "@/lib/work/people";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/work/supabase/server";
import { supabaseConfigured } from "@/lib/work/supabase/env";
import * as mock from "@/lib/work/mock/store";
import { resolvePayroll, type PayrollParams } from "@/lib/work/payroll";
import type { AppPlan, AppSubscribers, FinApp, Recurring } from "@/lib/work/finance";
import { adminConfigured, createAdminClient } from "@/lib/work/supabase/admin";

export const BUCKET = "work";
const SIGNED_URL_TTL = 60 * 60;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const REQUEST_SELECT =
  "*, request_versions(*), request_markers(*), request_comments(*), request_approvals(*), request_adjustments(*), request_activity(*), request_files(*), request_minutes(*), request_subtasks(*)";

async function sb() {
  return createClient();
}

function check<T>(res: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as NonNullable<T>;
}

/* ------------------------------------------------------------- mapping --- */

export function initialsOf(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function toUser(r: Row): WorkUserRecord {
  return {
    id: r.id,
    name: r.name || r.email,
    email: r.email,
    role: r.role,
    title: r.title,
    initials: initialsOf(r.name || r.email),
    color: r.color,
    active: r.active,
    clientId: r.client_id,
    avatarUrl: r.avatar_url,
    managerId: r.manager_id,
    backupId: r.backup_id,
  };
}

function toAsset(r: Row): AssetItem {
  return {
    id: r.id,
    category: r.category,
    name: r.name,
    kind: r.kind,
    addedAt: r.added_at,
    addedBy: r.added_by,
    url: r.url ?? undefined,
  };
}

export const EMPTY_LEGAL: Client["legal"] = {
  legalName: "",
  taxId: "",
  taxRegime: "",
  address: "",
  city: "",
  country: "Colombia",
  website: "",
  billingEmail: "",
};

function toClient(r: Row): Client {
  return {
    id: r.id,
    name: r.name,
    logoText: r.logo_text || initialsOf(r.name),
    accentColor: r.accent_color,
    industry: r.industry,
    contact: { name: "", role: "", email: "", phone: "", ...(r.contact ?? {}) },
    accountManagerId: r.account_manager_id ?? "",
    teamIds: r.team_ids ?? [],
    since: r.since,
    active: r.active ?? true,
    assets: ((r.assets as Row[] | undefined) ?? []).map(toAsset),
    legal: { ...EMPTY_LEGAL, ...(r.legal ?? {}) },
  };
}

function toProject(r: Row): Project {
  return {
    id: r.id,
    clientId: r.client_id,
    name: r.name,
    brief: r.brief,
    status: r.status,
    startDate: r.start_date,
    targetDate: r.target_date,
    leadId: r.lead_id ?? "",
    teamIds: r.team_ids ?? [],
    budgetHours: r.budget_hours === null || r.budget_hours === undefined ? null : Number(r.budget_hours),
  };
}

const byDate = (key: string, dir: 1 | -1 = 1) => (a: Row, b: Row) =>
  dir * (+new Date(a[key]) - +new Date(b[key]));

function toRequest(r: Row): Request {
  return {
    id: r.id,
    clientId: r.client_id,
    projectId: r.project_id,
    campaign: r.campaign,
    title: r.title,
    description: r.description,
    objective: r.objective,
    audience: r.audience,
    mainMessage: r.main_message,
    cta: r.cta,
    deliverables: r.deliverables ?? [],
    formats: r.formats ?? [],
    channels: r.channels ?? [],
    references: r.refs,
    deadline: r.deadline,
    priority: r.priority,
    state: r.state,
    assigneeId: r.assignee_id,
    collaboratorIds: r.collaborator_ids ?? [],
    startOn: r.start_on,
    dependsOn: r.depends_on ?? [],
    approverId: r.approver_id,
    subtasks: ((r.request_subtasks as Row[]) ?? [])
      .sort((a, b) => a.position - b.position || +new Date(a.created_at) - +new Date(b.created_at))
      .map((s) => ({ id: s.id, title: s.title, assigneeId: s.assignee_id, dueOn: s.due_on, done: s.done })),
    createdById: r.created_by ?? "",
    createdAt: r.created_at,
    roundsIncluded: r.rounds_included,
    roundsUsed: r.rounds_used,
    observations: r.observations,
    copy: {
      concept: "",
      headline: "",
      subheadline: "",
      caption: "",
      cta: "",
      visualIdeas: "",
      notes: "",
      drafts: [],
      ...(r.copy ?? {}),
    },
    versions: ((r.request_versions as Row[]) ?? []).sort(byDate("uploaded_at")).map((v) => ({
      id: v.id,
      label: v.label,
      fileName: v.file_name,
      kind: v.kind,
      uploadedById: v.uploaded_by ?? "",
      uploadedAt: v.uploaded_at,
      note: v.note,
      state: v.state,
      shared: v.shared ?? false,
    })),
    markers: ((r.request_markers as Row[]) ?? [])
      .sort((a, b) => a.index - b.index)
      .map((m) => ({
        id: m.id,
        index: m.index,
        x: m.x,
        y: m.y,
        body: m.body,
        authorId: m.author_id ?? "",
        createdAt: m.created_at,
        resolved: m.resolved,
        versionId: m.version_id,
      })),
    comments: ((r.request_comments as Row[]) ?? []).sort(byDate("created_at")).map(
      (c): Comment => ({
        id: c.id,
        authorId: c.author_id ?? "",
        body: c.body,
        createdAt: c.created_at,
        state: c.state,
        versionLabel: c.version_label ?? undefined,
        mentionIds: c.mention_ids ?? [],
        parentId: c.parent_id ?? undefined,
        internal: c.internal,
      }),
    ),
    approvals: ((r.request_approvals as Row[]) ?? []).sort(byDate("at")).map((a) => ({
      id: a.id,
      stage: a.stage,
      decision: a.decision,
      byId: a.by_id ?? "",
      at: a.at,
      note: a.note,
    })),
    adjustments: ((r.request_adjustments as Row[]) ?? []).sort(byDate("at")).map((a) => ({
      id: a.id,
      round: a.round,
      target: a.target,
      comment: a.comment,
      byId: a.by_id ?? "",
      at: a.at,
      billable: a.billable,
    })),
    files: ((r.request_files as Row[]) ?? []).sort(byDate("uploaded_at", -1)).map((f) => ({
      id: f.id,
      name: f.name,
      kind: f.kind,
      size: f.size,
      uploadedById: f.uploaded_by ?? "",
      uploadedAt: f.uploaded_at,
    })),
    minutes: ((r.request_minutes as Row[]) ?? []).sort(byDate("held_on", -1)).map((m) => ({
      id: m.id,
      title: m.title,
      heldOn: m.held_on,
      attendeeIds: m.attendee_ids ?? [],
      externalAttendees: m.external_attendees,
      summary: m.summary,
      agreements: m.agreements ?? [],
      nextSteps: m.next_steps,
      fileName: m.file_name,
      visibleToClient: m.visible_to_client,
      createdById: m.created_by ?? "",
      updatedAt: m.updated_at,
    })),
    activity: ((r.request_activity as Row[]) ?? []).sort(byDate("at", -1)).map(
      (a): ActivityEntry => ({
        id: a.id,
        at: a.at,
        actorId: a.actor_id ?? "",
        verb: a.verb,
        detail: a.detail,
      }),
    ),
  };
}

/* ------------------------------------------------------------- session --- */

/** Profile of the signed-in user, or null when there is no active session. */
export async function getMe(): Promise<WorkUserRecord | null> {
  if (!supabaseConfigured) return mock.getSessionUser();
  const supabase = await sb();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return data ? toUser(data) : null;
}

/** Signed-in user's profile; throws when there is none. */
export async function getSessionUser(): Promise<WorkUserRecord> {
  const me = await getMe();
  if (!me) throw new Error("Sesión no válida");
  return me;
}

async function requireMe() {
  const me = await getMe();
  if (!me || !me.active) throw new Error("Sesión no válida");
  return me;
}

/** Pages for management roles only: others go back to their Home. */
export async function requireManager() {
  const me = await getMe();
  if (supabaseConfigured && !seesAll(me?.role)) redirect("/work/home");
  return me;
}

export function isAdmin(user: Pick<WorkUserRecord, "role"> | null) {
  return !!user && (user.role === "super_admin" || user.role === "agency_director");
}

/* --------------------------------------------------------------- reads --- */

const todayYmd = () => new Date().toLocaleDateString("en-CA");

/** Attaches today's absence (if any) to each profile. */
async function withAway(supabase: Supa, users: WorkUserRecord[]) {
  if (!users.length) return users;
  const today = todayYmd();
  const { data } = await supabase
    .from("member_absences")
    .select("user_id, kind, end_on, substitute_id")
    .eq("status", "approved")
    .lte("start_on", today)
    .gte("end_on", today)
    .in("user_id", users.map((u) => u.id));
  const byUser = new Map((data ?? []).map((a) => [a.user_id as string, a]));
  return users.map((u) => {
    const a = byUser.get(u.id);
    return a ? { ...u, away: { kind: a.kind, until: a.end_on, substituteId: a.substitute_id } } : { ...u, away: null };
  });
}

export async function getUsers(): Promise<WorkUserRecord[]> {
  if (!supabaseConfigured) return mock.getUsers();
  const supabase = await sb();
  return withAway(supabase, check(await supabase.from("profiles").select("*").order("name")).map(toUser));
}

export async function getUser(id: string) {
  if (!supabaseConfigured) return mock.getUser(id);
  const supabase = await sb();
  const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  return data ? (await withAway(supabase, [toUser(data)]))[0] : null;
}

export async function getClients(): Promise<Client[]> {
  if (!supabaseConfigured) return mock.getClients();
  const supabase = await sb();
  return check(await supabase.from("clients").select("*, assets(*)").order("name")).map(toClient);
}

export async function getClient(id: string): Promise<Client | null> {
  if (!supabaseConfigured) return mock.getClient(id);
  const supabase = await sb();
  const { data } = await supabase.from("clients").select("*, assets(*)").eq("id", id).maybeSingle();
  if (!data) return null;
  const client = toClient(data);
  client.assets = await signAssets(client.assets, data.assets ?? []);
  return client;
}

export async function getProjects(): Promise<Project[]> {
  if (!supabaseConfigured) return mock.getProjects();
  const supabase = await sb();
  return check(await supabase.from("projects").select("*").order("target_date")).map(toProject);
}

export async function getProject(id: string): Promise<Project | null> {
  if (!supabaseConfigured) return mock.getProject(id);
  const supabase = await sb();
  const { data } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
  return data ? toProject(data) : null;
}

export async function getProjectsByClient(clientId: string): Promise<Project[]> {
  if (!supabaseConfigured) return mock.getProjectsByClient(clientId);
  const supabase = await sb();
  return check(
    await supabase.from("projects").select("*").eq("client_id", clientId).order("target_date"),
  ).map(toProject);
}

export async function getRequests(): Promise<Request[]> {
  if (!supabaseConfigured) return mock.getRequests();
  const supabase = await sb();
  return check(
    await supabase.from("requests").select(REQUEST_SELECT).order("created_at", { ascending: false }),
  ).map(toRequest);
}

export async function getRequest(id: string): Promise<Request | null> {
  if (!supabaseConfigured) return mock.getRequest(id);
  const supabase = await sb();
  const { data } = await supabase.from("requests").select(REQUEST_SELECT).eq("id", id).maybeSingle();
  if (!data) return null;
  const req = toRequest(data);
  const pathById = new Map(
    ((data.request_versions as Row[]) ?? [])
      .filter((v) => v.storage_path)
      .map((v) => [v.id as string, v.storage_path as string]),
  );
  // Acta files live outside requests/ (clients can't read them directly); RLS
  // already filtered the rows to the ones this user may see.
  const minutePathById = new Map(
    ((data.request_minutes as Row[]) ?? [])
      .filter((m) => m.file_path)
      .map((m) => [m.id as string, m.file_path as string]),
  );
  if (minutePathById.size) {
    const signer = adminConfigured ? createAdminClient() : supabase;
    const { data: signed } = await signer.storage
      .from(BUCKET)
      .createSignedUrls([...minutePathById.values()], SIGNED_URL_TTL);
    const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
    req.minutes = req.minutes?.map((m) => ({ ...m, fileUrl: urlByPath.get(minutePathById.get(m.id) ?? "") ?? undefined }));
  }
  const filePathById = new Map(
    ((data.request_files as Row[]) ?? []).map((f) => [f.id as string, f.storage_path as string]),
  );
  if (filePathById.size) {
    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls([...filePathById.values()], SIGNED_URL_TTL);
    const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
    req.files = req.files?.map((f) => ({ ...f, url: urlByPath.get(filePathById.get(f.id)!) ?? undefined }));
  }
  if (pathById.size) {
    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls([...pathById.values()], SIGNED_URL_TTL);
    const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
    req.versions = req.versions.map((v) => {
      const path = pathById.get(v.id);
      return path ? { ...v, fileUrl: urlByPath.get(path) ?? undefined } : v;
    });
  }
  return req;
}

export async function getRequestsByProject(projectId: string): Promise<Request[]> {
  if (!supabaseConfigured) return mock.getRequestsByProject(projectId);
  const supabase = await sb();
  return check(await supabase.from("requests").select(REQUEST_SELECT).eq("project_id", projectId)).map(
    toRequest,
  );
}

export async function getRequestsByClient(clientId: string): Promise<Request[]> {
  if (!supabaseConfigured) return mock.getRequestsByClient(clientId);
  const supabase = await sb();
  return check(await supabase.from("requests").select(REQUEST_SELECT).eq("client_id", clientId)).map(
    toRequest,
  );
}

async function signAssets(assets: AssetItem[], rows: Row[]) {
  const pathById = new Map(rows.filter((r) => r.storage_path).map((r) => [r.id, r.storage_path as string]));
  if (!pathById.size) return assets;
  const supabase = await sb();
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls([...pathById.values()], SIGNED_URL_TTL);
  const urlByPath = new Map((data ?? []).map((s) => [s.path, s.signedUrl]));
  return assets.map((a) => {
    const path = pathById.get(a.id);
    return path ? { ...a, url: urlByPath.get(path) ?? undefined } : a;
  });
}

/** All assets across clients, with signed URLs. */
export async function getAssets(): Promise<(AssetItem & { clientId: string })[]> {
  if (!supabaseConfigured) {
    const clients = await mock.getClients();
    return clients.flatMap((c) => c.assets.map((a) => ({ ...a, clientId: c.id })));
  }
  const supabase = await sb();
  const rows = check(await supabase.from("assets").select("*").order("added_at", { ascending: false }));
  const signed = await signAssets(rows.map(toAsset), rows);
  return signed.map((a, i) => ({ ...a, clientId: rows[i].client_id }));
}

export async function getCalendar(): Promise<CalendarEvent[]> {
  if (!supabaseConfigured) return mock.getCalendar();
  const supabase = await sb();
  const [requests, events] = await Promise.all([
    check(
      await supabase
        .from("requests")
        .select("id, title, deadline, state, client_id, start_on")
        .not("state", "in", "(completed,archived)"),
    ),
    check(await supabase.from("calendar_events").select("*")),
  ]);
  const all: CalendarEvent[] = [
    ...requests.map((r) => ({
      id: `ev-${r.id}`,
      date: r.deadline,
      kind: (r.state === "scheduled" || r.state === "published" ? "publish" : "deadline") as CalendarEvent["kind"],
      title: r.title,
      clientId: r.client_id,
      requestId: r.id,
      start: r.start_on,
    })),
    ...events.map((e) => ({
      id: e.id,
      date: e.date,
      kind: e.kind,
      title: e.title,
      clientId: e.client_id ?? "",
      requestId: e.request_id ?? undefined,
    })),
  ];
  return all.sort((a, b) => +new Date(a.date) - +new Date(b.date));
}

export async function getNotifications(): Promise<Notification[]> {
  if (!supabaseConfigured) return mock.getNotifications();
  const me = await getMe();
  if (!me) return [];
  const supabase = await sb();
  const stored = check(
    await supabase
      .from("notifications")
      .select("*")
      .eq("for_user_id", me.id)
      .order("at", { ascending: false })
      .limit(100),
  ).map(
    (n): Notification => ({
      id: n.id,
      at: n.at,
      kind: n.kind,
      body: n.body,
      href: n.href,
      read: n.read,
      forUserId: n.for_user_id,
    }),
  );

  // Deadline alerts are derived live instead of stored.
  const soon = check(
    await supabase
      .from("requests")
      .select("id, title, deadline")
      .or(`assignee_id.eq.${me.id},collaborator_ids.cs.{${me.id}}`)
      .not("state", "in", `(${DEADLINE_MET.join(",")})`)
      .lte("deadline", new Date(Date.now() + 2 * 86_400_000).toISOString()),
  ).map(
    (r): Notification => {
      const days = Math.round((+new Date(r.deadline) - Date.now()) / 86_400_000);
      return {
        id: `deadline-${r.id}`,
        at: r.deadline,
        kind: "deadline",
        body:
          days < 0
            ? `${r.id} · ${r.title} está vencida`
            : `${r.id} · ${r.title} vence ${days === 0 ? "hoy" : `en ${days} día(s)`}`,
        href: `/work/requests/${r.id}`,
        read: false,
        forUserId: me.id,
      };
    },
  );

  return [...soon, ...stored];
}

/* ------------------------------------------------------------ dashboard --- */

const isActive = (r: Request) => !["completed", "archived"].includes(r.state);
const REVIEW: WorkflowState[] = ["copy_review", "creative_review", "account_review", "client_review"];

export async function getDashboard() {
  if (!supabaseConfigured) return mock.getDashboard();
  const [me, reqs, projects, users] = await Promise.all([getMe(), getRequests(), getProjects(), getUsers()]);
  const subOf = (id: string) => users.find((u) => u.id === id)?.away?.substituteId;
  const active = reqs.filter(isActive);
  const mine = reqs.filter((r) => involves(r, me?.id));

  const needsMe = active.filter((r) => {
    const owner = WORKFLOW[r.state].owner;
    return (
      mustApprove(r, me, subOf) ||
      (!r.approverId && owner && me && owner === me.role) ||
      (involves(r, me?.id) && r.state === "adjustments")
    );
  });
  const adjustmentsOpen = active.filter((r) => r.state === "adjustments" && !needsMe.includes(r));
  const awaitingApproval = active.filter((r) => REVIEW.includes(r.state));
  const dueSoon = active
    .filter((r) => !DEADLINE_MET.includes(r.state) && (new Date(r.deadline).getTime() - Date.now()) / 86_400_000 <= 3)
    .sort((a, b) => +new Date(a.deadline) - +new Date(b.deadline));
  const completedThisWeek = reqs.filter((r) => {
    if (!["completed", "published"].includes(r.state)) return false;
    const last = r.activity[0];
    return last && Date.now() - +new Date(last.at) < 7 * 86_400_000;
  });

  return {
    today: mine.filter(isActive),
    needsAttention: [...needsMe, ...adjustmentsOpen],
    awaitingApproval,
    dueSoon,
    completedThisWeek,
    counts: {
      activeProjects: projects.filter((p) => p.status === "active").length,
      activeRequests: active.length,
      awaitingApproval: awaitingApproval.length,
      overdue: active.filter(isOverdue).length,
    },
  };
}

export async function getWorkload() {
  if (!supabaseConfigured) return mock.getWorkload();
  const [users, reqs] = await Promise.all([getUsers(), getRequests()]);
  const active = reqs.filter(isActive);
  return users
    .filter((u) => u.active && u.role !== "client")
    .map((u) => {
      const tasks = active.filter((r) => involves(r, u.id));
      return {
        user: u,
        count: tasks.length,
        urgent: tasks.filter((t) => t.priority === "urgent" || t.priority === "high").length,
        load: tasks.length >= 6 ? "high" : tasks.length >= 3 ? "medium" : "low",
      };
    })
    .sort((a, b) => b.count - a.count);
}

/* ------------------------------------------------------- write helpers --- */

type Supa = Awaited<ReturnType<typeof sb>>;

async function logActivity(supabase: Supa, requestId: string, actorId: string, verb: string, detail: string) {
  check(
    await supabase.from("request_activity").insert({ request_id: requestId, actor_id: actorId, verb, detail }),
  );
}

async function notify(
  supabase: Supa,
  actorId: string,
  userIds: (string | null | undefined)[],
  kind: Notification["kind"],
  body: string,
  href: string,
) {
  const targets = [...new Set(userIds.filter((u): u is string => !!u && u !== actorId))];
  if (!targets.length) return;
  // Whoever covers an absent person gets a copy of their notifications.
  const today = todayYmd();
  const { data: away } = await supabase
    .from("member_absences")
    .select("user_id, substitute_id, profiles!member_absences_user_id_fkey(name)")
    .eq("status", "approved")
    .lte("start_on", today)
    .gte("end_on", today)
    .in("user_id", targets)
    .not("substitute_id", "is", null);
  const covering = (away ?? [])
    .filter((a) => a.substitute_id !== actorId && !targets.includes(a.substitute_id as string))
    .map((a) => ({
      for_user_id: a.substitute_id as string,
      kind,
      body: `${body} · reemplazas a ${(a.profiles as unknown as { name: string } | null)?.name?.split(" ")[0] ?? "un compañero"}`,
      href,
    }));
  // Inbox is best-effort: a failed notification never blocks the action.
  await supabase
    .from("notifications")
    .insert([...targets.map((for_user_id) => ({ for_user_id, kind, body, href })), ...covering]);
}

/** Who covers `userId` today, if they're away. */
async function substituteOf(supabase: Supa, userId: string | null | undefined) {
  if (!userId) return null;
  const { data } = await supabase.rpc("work_substitute_of", { uid: userId });
  return (data as string | null) ?? null;
}

async function loadRequestRow(supabase: Supa, id: string) {
  const { data } = await supabase.from("requests").select("*").eq("id", id).maybeSingle();
  if (!data) throw new Error("Solicitud no encontrada");
  return data as Row;
}

/** Users whose role owns `state`, so they hear about pieces landing on them. */
async function ownersOf(supabase: Supa, state: WorkflowState) {
  const owner = WORKFLOW[state].owner;
  if (!owner || owner === "client") return [];
  const { data } = await supabase.from("profiles").select("id").eq("role", owner).eq("active", true);
  return (data ?? []).map((p) => p.id as string);
}

async function moveTo(supabase: Supa, row: Row, actorId: string, state: WorkflowState, verb = "movió a") {
  check(
    await supabase
      .from("requests")
      .update({ state, updated_at: new Date().toISOString() })
      .eq("id", row.id),
  );
  await logActivity(supabase, row.id, actorId, verb, WORKFLOW[state].label);
  await notify(
    supabase,
    actorId,
    [row.assignee_id, row.created_by, ...(row.approver_id ? [] : await ownersOf(supabase, state))],
    "status",
    `${row.id} pasó a ${WORKFLOW[state].label}`,
    `/work/requests/${row.id}`,
  );
  await notifyApprover(supabase, actorId, row, state);
}

/** Pings the request's approver when it lands on an internal review. */
async function notifyApprover(supabase: Supa, actorId: string, row: Row, state: WorkflowState | null) {
  if (!state || !row.approver_id || !(INTERNAL_REVIEW as readonly string[]).includes(state)) return;
  await notify(
    supabase,
    actorId,
    [row.approver_id],
    "approval",
    `Tienes una aprobación pendiente: ${row.id} · ${row.title} (${WORKFLOW[state].label})`,
    `/work/requests/${row.id}`,
  );
}

/* -------------------------------------------------------------- writes --- */

export async function setRequestState(requestId: string, state: WorkflowState) {
  if (!supabaseConfigured) return mock.setRequestState(requestId, state);
  const me = await requireMe();
  const supabase = await sb();
  const row = await loadRequestRow(supabase, requestId);
  // Moving a card out of an internal review is a sign-off too (board drags).
  if (row.state !== state && !canApprove(toRequest(row), me, await substituteOf(supabase, row.approver_id))) {
    const approver = row.approver_id ? await getUser(row.approver_id) : null;
    throw new Error(`Esta tarea espera la aprobación de ${approver?.name ?? "la persona asignada"}`);
  }
  await moveTo(supabase, row, me.id, state);
}

export async function advanceRequest(requestId: string) {
  if (!supabaseConfigured) return mock.advanceRequest(requestId);
  const me = await requireMe();
  const supabase = await sb();
  const row = await loadRequestRow(supabase, requestId);
  if (!canApprove(toRequest(row), me, await substituteOf(supabase, row.approver_id)))
    throw new Error("Esta tarea espera la aprobación de otra persona");
  const next = nextState(row.state);
  if (next) await moveTo(supabase, row, me.id, next);
}

export async function decideApproval(
  requestId: string,
  decision: "approved" | "changes_requested",
  note: string,
) {
  if (!supabaseConfigured) return mock.decideApproval(requestId, decision, note);
  const me = await requireMe();
  const supabase = await sb();
  const row = await loadRequestRow(supabase, requestId);
  const stage = row.state as WorkflowState;
  if (!REVIEW.includes(stage)) throw new Error("La solicitud no está en revisión");
  if (!canApprove(toRequest(row), me, await substituteOf(supabase, row.approver_id))) {
    const approver = row.approver_id ? await getUser(row.approver_id) : null;
    throw new Error(`Solo ${approver?.name ?? "la persona asignada"} (o quien la reemplace) puede aprobar esta etapa`);
  }

  check(
    await supabase
      .from("request_approvals")
      .insert({ request_id: requestId, stage, decision, by_id: me.id, note }),
  );

  const target =
    decision === "approved" ? nextState(stage) : stage === "copy_review" ? "design" : "adjustments";
  if (target) {
    check(
      await supabase
        .from("requests")
        .update({ state: target, updated_at: new Date().toISOString() })
        .eq("id", requestId),
    );
  }
  await logActivity(
    supabase,
    requestId,
    me.id,
    decision === "approved" ? "aprobó en" : "pidió cambios en",
    WORKFLOW[stage].label,
  );
  await notify(
    supabase,
    me.id,
    [row.assignee_id, row.created_by, ...(target ? await ownersOf(supabase, target) : [])],
    "approval",
    `${me.name.split(" ")[0]} ${decision === "approved" ? "aprobó" : "pidió cambios en"} ${WORKFLOW[stage].label} de ${requestId}`,
    `/work/requests/${requestId}`,
  );
  await notifyApprover(supabase, me.id, row, target);
}

export async function addComment(requestId: string, body: string, visibleToClient = false) {
  if (!supabaseConfigured) return mock.addComment(requestId, body);
  const text = body.trim();
  if (!text) return;
  const me = await requireMe();
  const supabase = await sb();
  const row = await loadRequestRow(supabase, requestId);
  const users = await getUsers();
  const mentionIds = users
    .filter((u) => u.name && new RegExp(`@${u.name.split(" ")[0]}\\b`, "i").test(text))
    .map((u) => u.id);
  const lastVersion = check(
    await supabase
      .from("request_versions")
      .select("label")
      .eq("request_id", requestId)
      .order("uploaded_at", { ascending: false })
      .limit(1),
  )[0];

  check(
    await supabase.from("request_comments").insert({
      request_id: requestId,
      author_id: me.id,
      body: text,
      state: row.state,
      version_label: lastVersion?.label ?? null,
      mention_ids: mentionIds,
      internal: me.role !== "client" && !visibleToClient,
    }),
  );
  if (me.role !== "client") {
    await logActivity(supabase, requestId, me.id, "comentó", text.slice(0, 60));
  } else {
    await supabase.rpc("work_notify_request_team", {
      rid: requestId,
      kind: "mention",
      body: `${me.name.split(" ")[0]} (cliente) comentó en ${requestId}`,
    });
  }
  await notify(
    supabase,
    me.id,
    mentionIds,
    "mention",
    `${me.name.split(" ")[0]} te mencionó en ${requestId}`,
    `/work/requests/${requestId}`,
  );
}

function kindFromName(fileName: string): AssetItem["kind"] {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "avif", "heic"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (["mp4", "mov", "webm", "m4v"].includes(ext)) return "video";
  if (["ttf", "otf", "woff", "woff2"].includes(ext)) return "font";
  if (["zip", "rar", "7z"].includes(ext)) return "zip";
  return "doc";
}

/** Records a version whose file was already uploaded to Storage (or none). */
export async function addVersion(
  requestId: string,
  fileName: string,
  note: string,
  storagePath?: string | null,
) {
  if (!supabaseConfigured) return mock.addVersion(requestId, fileName, note);
  const me = await requireMe();
  const supabase = await sb();
  const row = await loadRequestRow(supabase, requestId);
  const { count } = await supabase
    .from("request_versions")
    .select("id", { count: "exact", head: true })
    .eq("request_id", requestId);
  const label = `V${(count ?? 0) + 1}`;

  check(
    await supabase.from("request_versions").insert({
      request_id: requestId,
      label,
      file_name: fileName || `${requestId.toLowerCase()}_${label.toLowerCase()}`,
      kind: kindFromName(fileName),
      storage_path: storagePath || null,
      uploaded_by: me.id,
      note,
      state: row.state,
    }),
  );
  await logActivity(supabase, requestId, me.id, "subió", label);
  await notify(
    supabase,
    me.id,
    [row.assignee_id, row.created_by],
    "status",
    `${me.name.split(" ")[0]} subió ${label} en ${requestId}`,
    `/work/requests/${requestId}`,
  );
}

export async function registerAdjustment(requestId: string, target: AdjustmentTarget, comment: string) {
  if (!supabaseConfigured) return mock.registerAdjustment(requestId, target, comment);
  const me = await requireMe();
  const supabase = await sb();
  const row = await loadRequestRow(supabase, requestId);
  const round = row.rounds_used + 1;
  const state: WorkflowState = target === "copy" || target === "copy_design" ? "copy" : "design";

  check(
    await supabase.from("request_adjustments").insert({
      request_id: requestId,
      round,
      target,
      comment,
      by_id: me.id,
      billable: round > row.rounds_included,
    }),
  );
  check(
    await supabase
      .from("requests")
      .update({ rounds_used: round, state, updated_at: new Date().toISOString() })
      .eq("id", requestId),
  );
  await logActivity(supabase, requestId, me.id, "registró ajustes", `Ronda ${round}/${row.rounds_included}`);
  await notify(
    supabase,
    me.id,
    [row.assignee_id, ...(await ownersOf(supabase, state))],
    "adjustment",
    `Ajustes del cliente en ${requestId} (ronda ${round}/${row.rounds_included})`,
    `/work/requests/${requestId}`,
  );
}

export async function addMarker(input: {
  requestId: string;
  versionId: string | null;
  x: number;
  y: number;
  body: string;
}) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  const me = await requireMe();
  const supabase = await sb();
  const row = await loadRequestRow(supabase, input.requestId);
  const { count } = await supabase
    .from("request_markers")
    .select("id", { count: "exact", head: true })
    .eq("request_id", input.requestId);
  check(
    await supabase.from("request_markers").insert({
      request_id: input.requestId,
      version_id: input.versionId,
      index: (count ?? 0) + 1,
      x: Math.min(1, Math.max(0, input.x)),
      y: Math.min(1, Math.max(0, input.y)),
      body: input.body.trim(),
      author_id: me.id,
    }),
  );
  const body = `${me.name.split(" ")[0]} dejó una marca en ${input.requestId}`;
  if (me.role === "client") {
    await supabase.rpc("work_notify_request_team", { rid: input.requestId, kind: "mention", body });
  } else {
    await logActivity(supabase, input.requestId, me.id, "marcó la pieza", input.body.trim().slice(0, 60));
    await notify(supabase, me.id, [row.assignee_id, row.created_by], "mention", body, `/work/requests/${input.requestId}`);
  }
}

export async function addRequestFiles(
  requestId: string,
  files: { name: string; size: number; storagePath: string }[],
) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  const me = await requireMe();
  const supabase = await sb();
  if (!files.length) return;
  check(
    await supabase.from("request_files").insert(
      files.map((f) => ({
        request_id: requestId,
        name: f.name,
        kind: kindFromName(f.name),
        size: f.size,
        storage_path: f.storagePath,
        uploaded_by: me.id,
      })),
    ),
  );
  await logActivity(
    supabase,
    requestId,
    me.id,
    "adjuntó",
    files.length === 1 ? files[0].name : `${files.length} archivos`,
  );
}

export async function deleteRequestFile(fileId: string) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  await requireMe();
  const supabase = await sb();
  const { data } = await supabase.from("request_files").select("storage_path").eq("id", fileId).maybeSingle();
  check(await supabase.from("request_files").delete().eq("id", fileId));
  if (data?.storage_path) await supabase.storage.from(BUCKET).remove([data.storage_path]);
}

export type MinuteInput = {
  title: string;
  heldOn: string;
  attendeeIds: string[];
  externalAttendees: string;
  summary: string;
  agreements: RequestMinuteAgreementInput[];
  nextSteps: string;
  visibleToClient: boolean;
  /** undefined keeps the current file; null removes it. */
  file?: { path: string; name: string } | null;
};
type RequestMinuteAgreementInput = { text: string; ownerId: string | null; due: string | null; done: boolean };

export async function saveMinute(requestId: string, minuteId: string | null, input: MinuteInput) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  const me = await requireMe();
  const supabase = await sb();
  const row: Row = {
    request_id: requestId,
    title: input.title.trim(),
    held_on: input.heldOn,
    attendee_ids: input.attendeeIds,
    external_attendees: input.externalAttendees,
    summary: input.summary,
    agreements: input.agreements.filter((a) => a.text.trim()),
    next_steps: input.nextSteps,
    visible_to_client: input.visibleToClient,
    updated_at: new Date().toISOString(),
  };
  let oldPath: string | null = null;
  if (input.file !== undefined) {
    if (minuteId) {
      const { data } = await supabase.from("request_minutes").select("file_path").eq("id", minuteId).maybeSingle();
      oldPath = data?.file_path ?? null;
    }
    row.file_path = input.file?.path ?? null;
    row.file_name = input.file?.name ?? null;
  }
  if (minuteId) {
    check(await supabase.from("request_minutes").update(row).eq("id", minuteId));
  } else {
    check(await supabase.from("request_minutes").insert({ ...row, created_by: me.id }));
    await logActivity(supabase, requestId, me.id, "registró el acta", input.title.trim());
    await notify(
      supabase,
      me.id,
      input.agreements.map((a) => a.ownerId),
      "assignment",
      `${me.name.split(" ")[0]} te dejó compromisos en el acta "${input.title.trim()}" (${requestId})`,
      `/work/requests/${requestId}`,
    );
  }
  if (oldPath && oldPath !== row.file_path) await supabase.storage.from(BUCKET).remove([oldPath]);
}

export async function deleteMinute(minuteId: string) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  await requireMe();
  const supabase = await sb();
  const { data } = await supabase.from("request_minutes").select("file_path").eq("id", minuteId).maybeSingle();
  check(await supabase.from("request_minutes").delete().eq("id", minuteId));
  if (data?.file_path) await supabase.storage.from(BUCKET).remove([data.file_path]);
}

export async function toggleAgreement(minuteId: string, index: number, done: boolean) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  await requireMe();
  const supabase = await sb();
  const { data } = await supabase.from("request_minutes").select("agreements").eq("id", minuteId).maybeSingle();
  const agreements = [...((data?.agreements as RequestMinuteAgreementInput[]) ?? [])];
  if (!agreements[index]) return;
  agreements[index] = { ...agreements[index], done };
  check(await supabase.from("request_minutes").update({ agreements }).eq("id", minuteId));
}

export async function addSubtask(requestId: string, input: { title: string; assigneeId: string | null; dueOn: string | null }) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  const me = await requireMe();
  const supabase = await sb();
  const { count } = await supabase
    .from("request_subtasks")
    .select("id", { count: "exact", head: true })
    .eq("request_id", requestId);
  check(
    await supabase.from("request_subtasks").insert({
      request_id: requestId,
      title: input.title.trim(),
      assignee_id: input.assigneeId,
      due_on: input.dueOn,
      position: count ?? 0,
      created_by: me.id,
    }),
  );
  await notify(
    supabase,
    me.id,
    [input.assigneeId],
    "assignment",
    `${me.name.split(" ")[0]} te asignó la subtarea "${input.title.trim()}" en ${requestId}`,
    `/work/requests/${requestId}`,
  );
}

export async function updateSubtask(
  requestId: string,
  subtaskId: string,
  patch: Partial<{ title: string; assigneeId: string | null; dueOn: string | null; done: boolean }>,
) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  const me = await requireMe();
  const supabase = await sb();
  const { data: before } = await supabase
    .from("request_subtasks")
    .select("title, assignee_id")
    .eq("id", subtaskId)
    .maybeSingle();
  const row: Row = {};
  if (patch.title !== undefined) row.title = patch.title.trim();
  if (patch.assigneeId !== undefined) row.assignee_id = patch.assigneeId;
  if (patch.dueOn !== undefined) row.due_on = patch.dueOn;
  if (patch.done !== undefined) {
    row.done = patch.done;
    row.done_at = patch.done ? new Date().toISOString() : null;
  }
  check(await supabase.from("request_subtasks").update(row).eq("id", subtaskId));
  if (patch.done) await logActivity(supabase, requestId, me.id, "completó la subtarea", before?.title ?? "");
  if (patch.assigneeId && patch.assigneeId !== before?.assignee_id) {
    await notify(
      supabase,
      me.id,
      [patch.assigneeId],
      "assignment",
      `${me.name.split(" ")[0]} te asignó la subtarea "${before?.title ?? ""}" en ${requestId}`,
      `/work/requests/${requestId}`,
    );
  }
}

export async function deleteSubtask(subtaskId: string) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  await requireMe();
  const supabase = await sb();
  check(await supabase.from("request_subtasks").delete().eq("id", subtaskId));
}

export async function setVersionShared(requestId: string, versionId: string, shared: boolean) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  const me = await requireMe();
  const supabase = await sb();
  const { data } = await supabase
    .from("request_versions")
    .update({ shared, shared_at: shared ? new Date().toISOString() : null })
    .eq("id", versionId)
    .select("label")
    .maybeSingle();
  await logActivity(
    supabase,
    requestId,
    me.id,
    shared ? "compartió con el cliente" : "dejó de compartir",
    data?.label ?? "",
  );
}

export async function setMarkerResolved(markerId: string, resolved: boolean) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  await requireMe();
  const supabase = await sb();
  check(await supabase.from("request_markers").update({ resolved }).eq("id", markerId));
}

/** Client approves the piece or asks for changes (runs as a checked RPC). */
export async function clientDecide(requestId: string, decision: "approved" | "changes_requested", note: string) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  const supabase = await sb();
  check(await supabase.rpc("work_client_decide", { rid: requestId, decision, note }));
}

export async function saveCopy(requestId: string, copy: Omit<Request["copy"], "drafts">) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  const me = await requireMe();
  const supabase = await sb();
  const row = await loadRequestRow(supabase, requestId);
  const drafts = [...((row.copy?.drafts as Request["copy"]["drafts"]) ?? [])];
  const label = `Borrador ${drafts.length + 1}`;
  drafts.push({ label, savedAt: new Date().toISOString(), savedById: me.id });
  check(
    await supabase
      .from("requests")
      .update({ copy: { ...copy, drafts }, updated_at: new Date().toISOString() })
      .eq("id", requestId),
  );
  await logActivity(supabase, requestId, me.id, "guardó el copy", label);
}

/** Sets the people on a request: the first id leads, the rest collaborate. */
export async function setApprover(requestId: string, approverId: string | null) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  const me = await requireMe();
  const supabase = await sb();
  const row = await loadRequestRow(supabase, requestId);
  check(await supabase.from("requests").update({ approver_id: approverId }).eq("id", requestId));
  // The previous approver may lose access to the request: drop their unread
  // approval pings so the inbox doesn't link them to a 404.
  if (row.approver_id && row.approver_id !== approverId && adminConfigured) {
    await createAdminClient()
      .from("notifications")
      .delete()
      .eq("for_user_id", row.approver_id)
      .eq("kind", "approval")
      .eq("read", false)
      .eq("href", `/work/requests/${requestId}`);
  }
  const approver = approverId ? await getUser(approverId) : null;
  await logActivity(supabase, requestId, me.id, "definió quién aprueba:", approver?.name ?? "cualquiera de la etapa");
  if (approverId && (INTERNAL_REVIEW as readonly string[]).includes(row.state)) {
    await notifyApprover(supabase, me.id, { ...row, approver_id: approverId }, row.state);
  } else {
    await notify(supabase, me.id, [approverId], "approval", `${me.name.split(" ")[0]} te puso a aprobar ${requestId} · ${row.title}`, `/work/requests/${requestId}`);
  }
}

export async function assignRequest(requestId: string, peopleIds: string[]) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  const me = await requireMe();
  const supabase = await sb();
  const row = await loadRequestRow(supabase, requestId);
  const ids = [...new Set(peopleIds)];
  const before = peopleOn({ assigneeId: row.assignee_id, collaboratorIds: row.collaborator_ids });
  check(
    await supabase
      .from("requests")
      .update({ assignee_id: ids[0] ?? null, collaborator_ids: ids.slice(1) })
      .eq("id", requestId),
  );
  const users = await getUsers();
  const names = ids.map((id) => users.find((u) => u.id === id)?.name.split(" ")[0]).filter(Boolean);
  await logActivity(supabase, requestId, me.id, "asignó a", names.join(", ") || "nadie");
  await notify(
    supabase,
    me.id,
    ids.filter((id) => !before.includes(id)),
    "assignment",
    `${me.name.split(" ")[0]} te asignó ${requestId}`,
    `/work/requests/${requestId}`,
  );
}

export type NewRequestInput = {
  projectId: string;
  campaign: string;
  title: string;
  objective: string;
  audience: string;
  mainMessage: string;
  cta: string;
  deliverables: string;
  formats: string;
  channels: string;
  references: string;
  deadline: string;
  priority: Priority;
  assigneeId: string | null;
  collaboratorIds: string[];
  roundsIncluded: number;
  observations: string;
  startOn?: string;
  dependsOn?: string[];
  approverId?: string | null;
};

export async function createRequest(input: NewRequestInput): Promise<string> {
  if (!supabaseConfigured) return mock.createRequest(input);
  const me = await requireMe();
  const supabase = await sb();
  const project = await getProject(input.projectId);
  if (!project) throw new Error("Proyecto no encontrado");
  const split = (v: string) => v.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);

  const created = check(
    await supabase
      .from("requests")
      .insert({
        client_id: project.clientId,
        project_id: project.id,
        campaign: input.campaign || project.name,
        title: input.title.trim(),
        description: input.objective,
        objective: input.objective,
        audience: input.audience,
        main_message: input.mainMessage,
        cta: input.cta,
        deliverables: split(input.deliverables),
        formats: split(input.formats),
        channels: split(input.channels),
        refs: input.references,
        deadline: new Date(input.deadline ? `${input.deadline}T17:00:00` : Date.now() + 7 * 86_400_000).toISOString(),
        priority: input.priority,
        assignee_id: input.assigneeId,
        collaborator_ids: input.collaboratorIds.filter((id) => id !== input.assigneeId),
        start_on: input.startOn || new Date().toLocaleDateString("en-CA"),
        depends_on: input.dependsOn ?? [],
        approver_id: input.approverId ?? null,
        created_by: me.id,
        rounds_included: input.roundsIncluded,
        observations: input.observations,
        copy: { concept: "", headline: "", subheadline: "", caption: "", cta: input.cta, visualIdeas: "", notes: "", drafts: [] },
      })
      .select("id")
      .single(),
  ) as Row;

  await logActivity(supabase, created.id, me.id, "creó la solicitud", input.title);
  await notify(
    supabase,
    me.id,
    [input.assigneeId, ...input.collaboratorIds],
    "assignment",
    `${me.name.split(" ")[0]} te asignó ${created.id} · ${input.title}`,
    `/work/requests/${created.id}`,
  );
  return created.id;
}

const splitList = (v: string) => v.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);

/** Full edit of a request (admins). Logs state/assignee changes like the flow does. */
export async function updateRequest(id: string, input: NewRequestInput & { state?: WorkflowState }) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  const me = await requireMe();
  const supabase = await sb();
  const row = await loadRequestRow(supabase, id);
  const project = await getProject(input.projectId);
  if (!project) throw new Error("Proyecto no encontrado");

  check(
    await supabase
      .from("requests")
      .update({
        client_id: project.clientId,
        project_id: project.id,
        campaign: input.campaign || project.name,
        title: input.title.trim(),
        description: input.objective,
        objective: input.objective,
        audience: input.audience,
        main_message: input.mainMessage,
        cta: input.cta,
        deliverables: splitList(input.deliverables),
        formats: splitList(input.formats),
        channels: splitList(input.channels),
        refs: input.references,
        ...(input.deadline ? { deadline: new Date(`${input.deadline}T17:00:00`).toISOString() } : {}),
        priority: input.priority,
        assignee_id: input.assigneeId,
        collaborator_ids: input.collaboratorIds.filter((id) => id !== input.assigneeId),
        ...(input.startOn ? { start_on: input.startOn } : {}),
        depends_on: (input.dependsOn ?? []).filter((d) => d !== id),
        approver_id: input.approverId ?? null,
        rounds_included: input.roundsIncluded,
        observations: input.observations,
        ...(input.state ? { state: input.state } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id),
  );

  await logActivity(supabase, id, me.id, "editó la solicitud", input.title.trim());
  if (input.state && input.state !== row.state) {
    await logActivity(supabase, id, me.id, "movió a", WORKFLOW[input.state].label);
  }
  const before = peopleOn({ assigneeId: row.assignee_id, collaboratorIds: row.collaborator_ids });
  const added = peopleOn({ assigneeId: input.assigneeId, collaboratorIds: input.collaboratorIds }).filter(
    (u) => !before.includes(u),
  );
  await notify(supabase, me.id, added, "assignment", `${me.name.split(" ")[0]} te asignó ${id}`, `/work/requests/${id}`);
}

/** Deletes a request with everything attached to it, Storage files included. */
export async function deleteRequest(id: string) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  await requireMe();
  const supabase = await sb();
  const [versions, files, minutes] = await Promise.all([
    supabase.from("request_versions").select("storage_path").eq("request_id", id),
    supabase.from("request_files").select("storage_path").eq("request_id", id),
    supabase.from("request_minutes").select("file_path").eq("request_id", id),
  ]);
  const paths = [
    ...(versions.data ?? []).map((v) => v.storage_path),
    ...(files.data ?? []).map((f) => f.storage_path),
    ...(minutes.data ?? []).map((m) => m.file_path),
  ].filter(Boolean) as string[];
  check(await supabase.from("requests").delete().eq("id", id));
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
  await supabase.from("notifications").delete().eq("href", `/work/requests/${id}`);
}

/* --------------------------------------------- clients, projects, team --- */

export type ClientInput = {
  name: string;
  logoText: string;
  accentColor: string;
  industry: string;
  contact: Client["contact"];
  accountManagerId: string | null;
  teamIds: string[];
  legal: Client["legal"];
};

function clientRow(input: ClientInput) {
  return {
    name: input.name.trim(),
    logo_text: (input.logoText || initialsOf(input.name)).slice(0, 3).toUpperCase(),
    accent_color: input.accentColor || "#e31572",
    industry: input.industry,
    contact: input.contact,
    account_manager_id: input.accountManagerId,
    team_ids: input.teamIds,
    legal: input.legal,
  };
}

export async function createClientRecord(input: ClientInput) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  await requireMe();
  const supabase = await sb();
  return (check(await supabase.from("clients").insert(clientRow(input)).select("id").single()) as Row)
    .id as string;
}

export async function setClientActive(id: string, active: boolean) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  await requireMe();
  const supabase = await sb();
  check(await supabase.from("clients").update({ active }).eq("id", id));
}

export async function updateClientRecord(id: string, input: ClientInput) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  await requireMe();
  const supabase = await sb();
  check(await supabase.from("clients").update(clientRow(input)).eq("id", id));
}

export type ProjectInput = {
  clientId: string;
  name: string;
  brief: string;
  status: Project["status"];
  startDate: string;
  targetDate: string;
  leadId: string | null;
  teamIds: string[];
  budgetHours: number | null;
};

function projectRow(input: ProjectInput) {
  return {
    client_id: input.clientId,
    name: input.name.trim(),
    brief: input.brief,
    status: input.status,
    start_date: input.startDate || undefined,
    target_date: input.targetDate || undefined,
    lead_id: input.leadId,
    team_ids: input.teamIds,
    budget_hours: input.budgetHours,
  };
}

export async function createProjectRecord(input: ProjectInput) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  await requireMe();
  const supabase = await sb();
  return (check(await supabase.from("projects").insert(projectRow(input)).select("id").single()) as Row)
    .id as string;
}

export async function updateProjectRecord(id: string, input: ProjectInput) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  await requireMe();
  const supabase = await sb();
  check(await supabase.from("projects").update(projectRow(input)).eq("id", id));
}

export async function addAsset(input: {
  clientId: string;
  category: AssetItem["category"];
  name: string;
  storagePath?: string | null;
  url?: string | null;
}) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  const me = await requireMe();
  const supabase = await sb();
  check(
    await supabase.from("assets").insert({
      client_id: input.clientId,
      category: input.category,
      name: input.name,
      kind: input.url && !input.storagePath ? "link" : kindFromName(input.name),
      storage_path: input.storagePath || null,
      url: input.url || null,
      added_by: me.id,
    }),
  );
}

export async function deleteAsset(id: string) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  await requireMe();
  const supabase = await sb();
  const { data } = await supabase.from("assets").select("storage_path").eq("id", id).maybeSingle();
  check(await supabase.from("assets").delete().eq("id", id));
  if (data?.storage_path) await supabase.storage.from(BUCKET).remove([data.storage_path]);
}

export async function createCalendarEvent(input: {
  date: string;
  kind: CalendarEvent["kind"];
  title: string;
  clientId: string | null;
}) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  const me = await requireMe();
  const supabase = await sb();
  check(
    await supabase.from("calendar_events").insert({
      date: new Date(`${input.date}T09:00:00`).toISOString(),
      kind: input.kind,
      title: input.title,
      client_id: input.clientId,
      created_by: me.id,
    }),
  );
}

export async function markAllNotificationsRead() {
  if (!supabaseConfigured) return;
  const me = await requireMe();
  const supabase = await sb();
  check(await supabase.from("notifications").update({ read: true }).eq("for_user_id", me.id).eq("read", false));
}

export async function updateProfile(
  id: string,
  patch: Partial<{
    name: string;
    title: string;
    color: string;
    role: RoleSlug;
    active: boolean;
    clientId: string | null;
    avatarUrl: string | null;
    managerId: string | null;
    backupId: string | null;
  }>,
) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  await requireMe();
  const supabase = await sb();
  const row: Row = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.color !== undefined) row.color = patch.color;
  if (patch.role !== undefined) row.role = patch.role;
  if (patch.active !== undefined) row.active = patch.active;
  if (patch.clientId !== undefined) row.client_id = patch.clientId;
  if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl;
  if (patch.managerId !== undefined) row.manager_id = patch.managerId;
  if (patch.backupId !== undefined) row.backup_id = patch.backupId;
  check(await supabase.from("profiles").update(row).eq("id", id));
}

/* ======================================================= planning tools === */

/** Moves a request on the timeline (start and/or deadline as YYYY-MM-DD). */
export async function updateRequestDates(id: string, startOn: string, deadline: string) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  const me = await requireMe();
  const supabase = await sb();
  if (startOn > deadline) throw new Error("La fecha de inicio no puede ser posterior a la entrega");
  check(
    await supabase
      .from("requests")
      .update({ start_on: startOn, deadline: new Date(`${deadline}T17:00:00`).toISOString(), updated_at: new Date().toISOString() })
      .eq("id", id),
  );
  await logActivity(supabase, id, me.id, "reprogramó", `${startOn} → ${deadline}`);
}

/** What the client portal shows of a request: name, dates, deliverables and stage. */
export async function updateRequestSchedule(
  id: string,
  input: { title: string; startOn: string; deadline: string; deliverables: string[]; state: WorkflowState },
) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  const me = await requireMe();
  const supabase = await sb();
  if (!input.title.trim()) throw new Error("Escribe un título");
  if (!input.startOn || !input.deadline) throw new Error("Define inicio y entrega");
  if (input.startOn > input.deadline) throw new Error("La fecha de inicio no puede ser posterior a la entrega");
  const row = await loadRequestRow(supabase, id);
  check(
    await supabase
      .from("requests")
      .update({
        title: input.title.trim(),
        start_on: input.startOn,
        deadline: new Date(`${input.deadline}T17:00:00`).toISOString(),
        deliverables: input.deliverables.map((d) => d.trim()).filter(Boolean),
        state: input.state,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id),
  );
  await logActivity(supabase, id, me.id, "editó la solicitud", input.title.trim());
  if (input.state !== row.state) await logActivity(supabase, id, me.id, "movió a", WORKFLOW[input.state].label);
}

/* ------------------------------------------------------------- hours --- */

const toEntry = (r: Row): TimeEntry => ({
  id: r.id,
  requestId: r.request_id,
  userId: r.user_id,
  minutes: r.minutes,
  workedOn: r.worked_on,
  note: r.note,
});

export async function getTimeEntries(filter: { requestIds?: string[]; userId?: string } = {}): Promise<TimeEntry[]> {
  if (!supabaseConfigured) return [];
  const supabase = await sb();
  let query = supabase.from("time_entries").select("*").order("worked_on", { ascending: false });
  if (filter.requestIds) query = query.in("request_id", filter.requestIds.length ? filter.requestIds : ["-"]);
  if (filter.userId) query = query.eq("user_id", filter.userId);
  return check(await query).map(toEntry);
}

export async function addTimeEntry(input: { requestId: string; minutes: number; workedOn: string; note: string; userId?: string }) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  const me = await requireMe();
  const supabase = await sb();
  if (!(input.minutes > 0)) throw new Error("Indica cuánto tiempo trabajaste");
  check(
    await supabase.from("time_entries").insert({
      request_id: input.requestId,
      user_id: input.userId ?? me.id,
      minutes: Math.round(input.minutes),
      worked_on: input.workedOn,
      note: input.note,
    }),
  );
}

export async function deleteTimeEntry(id: string) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  await requireMe();
  const supabase = await sb();
  check(await supabase.from("time_entries").delete().eq("id", id));
}

/* --------------------------------------------------------- templates --- */

const DAY_MS = 86_400_000;
const dayDiff = (a: string, b: string) =>
  Math.round((+new Date(`${a}T12:00:00`) - +new Date(`${b}T12:00:00`)) / DAY_MS);
const addDays = (ymd: string, n: number) =>
  new Date(+new Date(`${ymd}T12:00:00`) + n * DAY_MS).toLocaleDateString("en-CA");
const ymdOf = (iso: string) => new Date(iso).toLocaleDateString("en-CA");

const toTemplate = (r: Row): ProjectTemplate => ({
  id: r.id,
  name: r.name,
  description: r.description,
  durationDays: r.duration_days,
  tasks: r.tasks ?? [],
  createdAt: r.created_at,
});

export async function getTemplates(): Promise<ProjectTemplate[]> {
  if (!supabaseConfigured) return [];
  const supabase = await sb();
  return check(await supabase.from("project_templates").select("*").order("name")).map(toTemplate);
}

/** Captures a project's tasks (relative dates, people, subtasks) as a reusable template. */
export async function saveProjectAsTemplate(projectId: string, name: string, description: string) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  const me = await requireMe();
  const supabase = await sb();
  const project = await getProject(projectId);
  if (!project) throw new Error("Proyecto no encontrado");
  const requests = (await getRequestsByProject(projectId)).filter((r) => r.state !== "archived");
  const base = project.startDate;
  const tasks: TemplateTask[] = requests
    .sort((a, b) => +new Date(a.startOn ?? a.createdAt) - +new Date(b.startOn ?? b.createdAt))
    .map((r) => {
      const start = r.startOn ?? ymdOf(r.createdAt);
      return {
        title: r.title,
        campaign: r.campaign,
        objective: r.objective,
        deliverables: r.deliverables,
        priority: r.priority,
        startOffset: dayDiff(start, base),
        endOffset: dayDiff(ymdOf(r.deadline), base),
        assigneeId: r.assigneeId,
        collaboratorIds: r.collaboratorIds ?? [],
        approverId: r.approverId ?? null,
        subtasks: (r.subtasks ?? []).map((s) => ({
          title: s.title,
          assigneeId: s.assigneeId,
          offset: s.dueOn ? dayDiff(s.dueOn, base) : null,
        })),
      };
    });
  check(
    await supabase.from("project_templates").insert({
      name: name.trim() || project.name,
      description,
      duration_days: Math.max(0, dayDiff(project.targetDate, base), ...tasks.map((t) => t.endOffset)),
      tasks,
      created_by: me.id,
    }),
  );
}

/** Creates a project and all its tasks from a template, starting on `startDate`. */
export async function createProjectFromTemplate(
  templateId: string,
  input: { clientId: string; name: string; startDate: string; leadId: string | null },
) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  const me = await requireMe();
  const supabase = await sb();
  const tpl = toTemplate(check(await supabase.from("project_templates").select("*").eq("id", templateId).single()) as Row);
  const people = [...new Set(tpl.tasks.flatMap((t) => [t.assigneeId, ...t.collaboratorIds]).filter(Boolean) as string[])];
  const projectId = await createProjectRecord({
    clientId: input.clientId,
    name: input.name.trim() || tpl.name,
    brief: tpl.description,
    status: "active",
    startDate: input.startDate,
    targetDate: addDays(input.startDate, tpl.durationDays),
    leadId: input.leadId,
    teamIds: people,
    budgetHours: null,
  });
  for (const t of tpl.tasks) {
    const id = await createRequest({
      projectId,
      campaign: t.campaign,
      title: t.title,
      objective: t.objective,
      audience: "",
      mainMessage: "",
      cta: "",
      deliverables: t.deliverables.join("\n"),
      formats: "",
      channels: "",
      references: "",
      deadline: addDays(input.startDate, t.endOffset),
      priority: t.priority,
      assigneeId: t.assigneeId,
      collaboratorIds: t.collaboratorIds,
      roundsIncluded: 2,
      observations: "",
      startOn: addDays(input.startDate, t.startOffset),
      approverId: t.approverId ?? null,
    });
    for (const st of t.subtasks) {
      await addSubtask(id, {
        title: st.title,
        assigneeId: st.assigneeId,
        dueOn: st.offset === null ? null : addDays(input.startDate, st.offset),
      });
    }
  }
  void me;
  return projectId;
}

export async function deleteTemplate(id: string) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  await requireMe();
  const supabase = await sb();
  check(await supabase.from("project_templates").delete().eq("id", id));
}

/* ------------------------------------------------------- client docs --- */

const toDoc = (r: Row): ClientDoc => ({
  id: r.id,
  clientId: r.client_id,
  title: r.title,
  body: r.body,
  pinned: r.pinned,
  visibleToClient: r.visible_to_client,
  updatedBy: r.updated_by ?? "",
  updatedAt: r.updated_at,
});

export async function getClientDocs(clientId: string): Promise<ClientDoc[]> {
  if (!supabaseConfigured) return [];
  const supabase = await sb();
  return check(
    await supabase
      .from("client_docs")
      .select("*")
      .eq("client_id", clientId)
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false }),
  ).map(toDoc);
}

export async function getClientDoc(id: string): Promise<ClientDoc | null> {
  if (!supabaseConfigured) return null;
  const supabase = await sb();
  const { data } = await supabase.from("client_docs").select("*").eq("id", id).maybeSingle();
  return data ? toDoc(data) : null;
}

export async function saveClientDoc(
  id: string | null,
  input: { clientId: string; title: string; body: string; pinned: boolean; visibleToClient: boolean },
) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  const me = await requireMe();
  const supabase = await sb();
  const row = {
    client_id: input.clientId,
    title: input.title.trim() || "Sin título",
    body: input.body,
    pinned: input.pinned,
    visible_to_client: input.visibleToClient,
    updated_by: me.id,
    updated_at: new Date().toISOString(),
  };
  if (id) {
    check(await supabase.from("client_docs").update(row).eq("id", id));
    return id;
  }
  return (check(await supabase.from("client_docs").insert(row).select("id").single()) as Row).id as string;
}

export async function deleteClientDoc(id: string) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  await requireMe();
  const supabase = await sb();
  check(await supabase.from("client_docs").delete().eq("id", id));
}

/* ---------------------------------------------------- client intake --- */

export async function clientCreateRequest(input: { projectId: string; title: string; description: string; wantedOn: string | null }) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  const supabase = await sb();
  const { data, error } = await supabase.rpc("work_client_create_request", {
    pid: input.projectId,
    req_title: input.title,
    req_description: input.description,
    wanted_on: input.wantedOn,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

/* ------------------------------------------------------- recurrences --- */

const toRecurrence = (r: Row): Recurrence => ({
  id: r.id,
  projectId: r.project_id,
  title: r.title,
  objective: r.objective,
  deliverables: r.deliverables ?? [],
  priority: r.priority,
  assigneeId: r.assignee_id,
  collaboratorIds: r.collaborator_ids ?? [],
  frequency: r.frequency,
  leadDays: r.lead_days,
  nextRun: r.next_run,
  active: r.active,
});

export async function getRecurrences(projectId?: string): Promise<Recurrence[]> {
  if (!supabaseConfigured) return [];
  const supabase = await sb();
  let query = supabase.from("recurrences").select("*").order("next_run");
  if (projectId) query = query.eq("project_id", projectId);
  return check(await query).map(toRecurrence);
}

export async function saveRecurrence(id: string | null, input: Omit<Recurrence, "id">) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  const me = await requireMe();
  const supabase = await sb();
  const row = {
    project_id: input.projectId,
    title: input.title.trim(),
    objective: input.objective,
    deliverables: input.deliverables,
    priority: input.priority,
    assignee_id: input.assigneeId,
    collaborator_ids: input.collaboratorIds,
    frequency: input.frequency,
    lead_days: input.leadDays,
    next_run: input.nextRun,
    active: input.active,
  };
  if (id) check(await supabase.from("recurrences").update(row).eq("id", id));
  else check(await supabase.from("recurrences").insert({ ...row, created_by: me.id }));
}

export async function deleteRecurrence(id: string) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  await requireMe();
  const supabase = await sb();
  check(await supabase.from("recurrences").delete().eq("id", id));
}

/* ------------------------------------------------------- automations --- */

const toAutomation = (r: Row): Automation => ({
  id: r.id,
  name: r.name,
  toState: r.to_state,
  projectId: r.project_id,
  action: r.action,
  role: r.role,
  userId: r.user_id,
  priority: r.priority,
  active: r.active,
});

export async function getAutomations(): Promise<Automation[]> {
  if (!supabaseConfigured) return [];
  const supabase = await sb();
  return check(await supabase.from("automations").select("*").order("created_at")).map(toAutomation);
}

export async function saveAutomation(input: Omit<Automation, "id" | "active">) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  const me = await requireMe();
  const supabase = await sb();
  check(
    await supabase.from("automations").insert({
      name: input.name,
      to_state: input.toState,
      project_id: input.projectId,
      action: input.action,
      role: input.action === "notify_role" ? input.role : null,
      user_id: input.action === "notify_user" || input.action === "assign_user" ? input.userId : null,
      priority: input.action === "set_priority" ? input.priority : null,
      created_by: me.id,
    }),
  );
}

export async function setAutomationActive(id: string, active: boolean) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  await requireMe();
  const supabase = await sb();
  check(await supabase.from("automations").update({ active }).eq("id", id));
}

export async function deleteAutomation(id: string) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  await requireMe();
  const supabase = await sb();
  check(await supabase.from("automations").delete().eq("id", id));
}

/* ------------------------------------------------------------ search --- */

export type SearchHit = { kind: "request" | "client" | "project" | "person"; id: string; title: string; subtitle: string; href: string };

/** Global ⌘K search across requests, clients, projects and people. */
export async function searchAll(term: string): Promise<SearchHit[]> {
  const t = term.trim();
  if (!supabaseConfigured || t.length < 2) return [];
  const supabase = await sb();
  const like = `%${t.replace(/[%_,()]/g, " ")}%`;
  const [reqs, clients, projects, people] = await Promise.all([
    supabase.from("requests").select("id, title, campaign, state").or(`id.ilike.${like},title.ilike.${like},campaign.ilike.${like}`).limit(8),
    supabase.from("clients").select("id, name, industry").ilike("name", like).limit(5),
    supabase.from("projects").select("id, name, client_id").ilike("name", like).limit(5),
    supabase.from("profiles").select("id, name, title").or(`name.ilike.${like},email.ilike.${like}`).eq("active", true).limit(5),
  ]);
  return [
    ...(reqs.data ?? []).map((r) => ({ kind: "request" as const, id: r.id, title: r.title, subtitle: `${r.id} · ${r.campaign}`, href: `/work/requests/${r.id}` })),
    ...(clients.data ?? []).map((c) => ({ kind: "client" as const, id: c.id, title: c.name, subtitle: c.industry || "Cliente", href: `/work/clients/${c.id}` })),
    ...(projects.data ?? []).map((p) => ({ kind: "project" as const, id: p.id, title: p.name, subtitle: "Proyecto", href: `/work/projects/${p.id}` })),
    ...(people.data ?? []).map((p) => ({ kind: "person" as const, id: p.id, title: p.name, subtitle: p.title || "Equipo", href: `/work/team/${p.id}` })),
  ];
}

/* ---------------------------------------------------------- absences --- */

const toAbsence = (r: Row): Absence => ({
  id: r.id,
  userId: r.user_id,
  kind: r.kind,
  startOn: r.start_on,
  endOn: r.end_on,
  substituteId: r.substitute_id,
  note: r.note,
  status: r.status,
  decidedBy: r.decided_by,
});

/** Current and upcoming absences (optionally for one person). */
export async function getAbsences(userId?: string): Promise<Absence[]> {
  if (!supabaseConfigured) return [];
  const supabase = await sb();
  let query = supabase.from("member_absences").select("*").gte("end_on", todayYmd()).order("start_on");
  if (userId) query = query.eq("user_id", userId);
  return check(await query).map(toAbsence);
}

/**
 * Records time off. HR/admins (or anyone logging it for someone else) create
 * it approved; people logging their own create a request their manager and HR
 * approve (the database enforces this).
 */
export async function saveAbsence(input: Omit<Absence, "id" | "status" | "decidedBy">) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  const me = await requireMe();
  const supabase = await sb();
  if (input.endOn < input.startOn) throw new Error("La fecha de regreso no puede ser anterior al inicio");
  check(
    await supabase.from("member_absences").insert({
      user_id: input.userId,
      kind: input.kind,
      start_on: input.startOn,
      end_on: input.endOn,
      substitute_id: input.substituteId,
      note: input.note,
      created_by: me.id,
    }),
  );
  const person = await getUser(input.userId);
  const asRequest = input.userId === me.id && !isHr(me.role);
  if (asRequest) {
    const { data: hrPeople } = await supabase.from("profiles").select("id").in("role", ["hr"]).eq("active", true);
    await notify(
      supabase,
      me.id,
      [person?.managerId, ...(hrPeople ?? []).map((h) => h.id as string)],
      "approval",
      `${me.name.split(" ")[0]} pidió ${ABSENCE_LABEL[input.kind].toLowerCase()} del ${input.startOn} al ${input.endOn}`,
      `/work/hr`,
    );
    return;
  }
  if (input.substituteId) {
    await notify(
      supabase,
      me.id,
      [input.substituteId],
      "assignment",
      `Reemplazarás a ${person?.name ?? "un compañero"} del ${input.startOn} al ${input.endOn}`,
      `/work/team/${input.userId}`,
    );
  }
}

/** Manager or HR approves / rejects a time-off request. */
export async function decideAbsence(id: string, decision: "approved" | "rejected") {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  const me = await requireMe();
  const supabase = await sb();
  const row = check(
    await supabase.from("member_absences").update({ status: decision }).eq("id", id).select("*").maybeSingle(),
  ) as Row | null;
  if (!row) throw new Error("No puedes decidir sobre esta solicitud");
  const a = toAbsence(row);
  await notify(
    supabase,
    me.id,
    [a.userId],
    "approval",
    `${me.name.split(" ")[0]} ${decision === "approved" ? "aprobó" : "rechazó"} tu solicitud de ${ABSENCE_LABEL[a.kind].toLowerCase()} (${a.startOn} → ${a.endOn})`,
    `/work/hr/${a.userId}`,
  );
  if (decision === "approved" && a.substituteId) {
    const person = await getUser(a.userId);
    await notify(supabase, me.id, [a.substituteId], "assignment", `Reemplazarás a ${person?.name ?? "un compañero"} del ${a.startOn} al ${a.endOn}`, `/work/team/${a.userId}`);
  }
}

/** Pending time-off requests the signed-in person can decide on. */
export async function getPendingAbsences(): Promise<Absence[]> {
  if (!supabaseConfigured) return [];
  const me = await requireMe();
  const supabase = await sb();
  const rows = check(await supabase.from("member_absences").select("*").eq("status", "pending").order("start_on")).map(toAbsence);
  if (isHr(me.role)) return rows;
  const { data: team } = await supabase.from("profiles").select("id").eq("manager_id", me.id);
  const mine = new Set((team ?? []).map((t) => t.id as string));
  return rows.filter((r) => mine.has(r.userId));
}

/** All absences of one person (history included), newest first. */
export async function getAbsenceHistory(userId: string): Promise<Absence[]> {
  if (!supabaseConfigured) return [];
  const supabase = await sb();
  return check(
    await supabase.from("member_absences").select("*").eq("user_id", userId).order("start_on", { ascending: false }),
  ).map(toAbsence);
}

/* ---------------------------------------------------------------- HR --- */

const toHr = (r: Row): HrProfile => ({
  userId: r.user_id,
  documentType: r.document_type,
  documentNumber: r.document_number,
  birthDate: r.birth_date,
  phone: r.phone,
  personalEmail: r.personal_email,
  address: r.address,
  city: r.city,
  emergencyName: r.emergency_name,
  emergencyRelation: r.emergency_relation,
  emergencyPhone: r.emergency_phone,
  contractType: r.contract_type,
  startDate: r.start_date,
  endDate: r.end_date,
  salary: r.salary === null || r.salary === undefined ? null : Number(r.salary),
  salaryPeriod: r.salary_period,
  eps: r.eps,
  pensionFund: r.pension_fund,
  arl: r.arl,
  compensationFund: r.compensation_fund,
  notes: r.notes,
  updatedAt: r.updated_at,
  workSchedule: r.work_schedule,
  arlRiskLevel: r.arl_risk_level,
  severanceFund: r.severance_fund,
  transportAllowance: r.transport_allowance,
  contractValue: r.contract_value === null || r.contract_value === undefined ? null : Number(r.contract_value),
  paymentFrequency: r.payment_frequency,
  paysOwnSocialSecurity: r.pays_own_social_security,
  taxId: r.tax_id,
  bankName: r.bank_name,
  bankAccountType: r.bank_account_type,
  bankAccountNumber: r.bank_account_number,
  workDescription: r.work_description ?? "",
});

export const EMPTY_HR = (userId: string): HrProfile => ({
  userId,
  documentType: "CC",
  documentNumber: "",
  birthDate: null,
  phone: "",
  personalEmail: "",
  address: "",
  city: "",
  emergencyName: "",
  emergencyRelation: "",
  emergencyPhone: "",
  contractType: "indefinite",
  startDate: null,
  endDate: null,
  salary: null,
  salaryPeriod: "monthly",
  eps: "",
  pensionFund: "",
  arl: "",
  compensationFund: "",
  notes: "",
  updatedAt: null,
  workSchedule: "full_time",
  arlRiskLevel: 1,
  severanceFund: "",
  transportAllowance: null,
  contractValue: null,
  paymentFrequency: "monthly",
  paysOwnSocialSecurity: false,
  taxId: "",
  bankName: "",
  bankAccountType: "savings",
  bankAccountNumber: "",
  workDescription: "",
});

/** One employee file (RLS: self, HR, finance). Null when not visible. */
export async function getHrProfile(userId: string): Promise<HrProfile | null> {
  if (!supabaseConfigured) return null;
  const supabase = await sb();
  const { data } = await supabase.from("hr_profiles").select("*").eq("user_id", userId).maybeSingle();
  return data ? toHr(data) : null;
}

export async function getHrProfiles(): Promise<HrProfile[]> {
  if (!supabaseConfigured) return [];
  const supabase = await sb();
  return check(await supabase.from("hr_profiles").select("*")).map(toHr);
}

export async function saveHrProfile(profile: HrProfile) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  await requireMe();
  const supabase = await sb();
  check(
    await supabase.from("hr_profiles").upsert({
      user_id: profile.userId,
      document_type: profile.documentType,
      document_number: profile.documentNumber,
      birth_date: profile.birthDate || null,
      phone: profile.phone,
      personal_email: profile.personalEmail,
      address: profile.address,
      city: profile.city,
      emergency_name: profile.emergencyName,
      emergency_relation: profile.emergencyRelation,
      emergency_phone: profile.emergencyPhone,
      contract_type: profile.contractType,
      start_date: profile.startDate || null,
      end_date: profile.endDate || null,
      salary: profile.salary,
      salary_period: profile.salaryPeriod,
      eps: profile.eps,
      pension_fund: profile.pensionFund,
      arl: profile.arl,
      compensation_fund: profile.compensationFund,
      notes: profile.notes,
      work_schedule: profile.workSchedule,
      arl_risk_level: profile.arlRiskLevel,
      severance_fund: profile.severanceFund,
      transport_allowance: profile.transportAllowance,
      contract_value: profile.contractValue,
      payment_frequency: profile.paymentFrequency,
      pays_own_social_security: profile.paysOwnSocialSecurity,
      tax_id: profile.taxId,
      bank_name: profile.bankName,
      bank_account_type: profile.bankAccountType,
      bank_account_number: profile.bankAccountNumber,
      work_description: profile.workDescription,
    }),
  );
}

export async function getPayrollParams(): Promise<ReturnType<typeof resolvePayroll>> {
  if (!supabaseConfigured) return resolvePayroll(null, new Date().getFullYear());
  const supabase = await sb();
  const { data } = await supabase.from("org_settings").select("value").eq("key", "payroll").maybeSingle();
  return resolvePayroll((data?.value as Partial<PayrollParams>) ?? null, new Date().getFullYear());
}

export async function savePayrollParams(params: PayrollParams) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  const me = await requireMe();
  const supabase = await sb();
  check(await supabase.from("org_settings").upsert({ key: "payroll", value: params, updated_by: me.id, updated_at: new Date().toISOString() }));
}

const toHrDoc = (r: Row): HrDocument => ({
  id: r.id,
  userId: r.user_id,
  category: r.category,
  name: r.name,
  size: r.size,
  uploadedAt: r.uploaded_at,
});

export async function getHrDocuments(userId: string): Promise<HrDocument[]> {
  if (!supabaseConfigured) return [];
  const supabase = await sb();
  const rows = check(
    await supabase.from("hr_documents").select("*").eq("user_id", userId).order("uploaded_at", { ascending: false }),
  );
  const paths = rows.map((r) => r.storage_path as string);
  if (!paths.length) return [];
  const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_TTL);
  const urlByPath = new Map((signed ?? []).map((x) => [x.path, x.signedUrl]));
  return rows.map((r) => ({ ...toHrDoc(r), url: urlByPath.get(r.storage_path) ?? undefined }));
}

export async function addHrDocument(input: { userId: string; category: HrDocument["category"]; name: string; size: number; storagePath: string }) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  const me = await requireMe();
  const supabase = await sb();
  check(
    await supabase.from("hr_documents").insert({
      user_id: input.userId,
      category: input.category,
      name: input.name,
      size: input.size,
      storage_path: input.storagePath,
      uploaded_by: me.id,
    }),
  );
}

export async function deleteHrDocument(id: string) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  await requireMe();
  const supabase = await sb();
  const { data } = await supabase.from("hr_documents").select("storage_path").eq("id", id).maybeSingle();
  check(await supabase.from("hr_documents").delete().eq("id", id));
  if (data?.storage_path) await supabase.storage.from(BUCKET).remove([data.storage_path]);
}

export async function deleteAbsence(id: string) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  await requireMe();
  const supabase = await sb();
  check(await supabase.from("member_absences").delete().eq("id", id));
}

/* ----------------------------------------------------------- finance --- */

export type FinExpense = {
  id: string;
  spentOn: string;
  category: string;
  vendor: string;
  description: string;
  amount: number;
  recurringId: string | null;
  clientId: string | null;
  projectId: string | null;
  paid: boolean;
  receiptName: string | null;
  receiptUrl?: string;
};

export type FinIncome = {
  id: string;
  issuedOn: string;
  clientId: string | null;
  projectId: string | null;
  description: string;
  invoiceNumber: string;
  amount: number;
  status: "scheduled" | "quoted" | "invoiced" | "paid";
  paidOn: string | null;
  installmentNo?: number | null;
  installmentOf?: number | null;
};

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));

export async function getRecurringCosts(): Promise<Recurring[]> {
  if (!supabaseConfigured) return [];
  const supabase = await sb();
  return check(await supabase.from("fin_recurring").select("*").order("name")).map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    vendor: r.vendor,
    amount: num(r.amount),
    frequency: r.frequency,
    dueDay: r.due_day,
    startOn: r.start_on,
    endOn: r.end_on,
    active: r.active,
    notes: r.notes,
  }));
}

export async function saveRecurringCost(id: string | null, input: Omit<Recurring, "id">) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  const me = await requireMe();
  const supabase = await sb();
  const row = {
    name: input.name.trim(),
    category: input.category,
    vendor: input.vendor,
    amount: input.amount,
    frequency: input.frequency,
    due_day: input.dueDay,
    start_on: input.startOn,
    end_on: input.endOn || null,
    active: input.active,
    notes: input.notes,
  };
  if (id) check(await supabase.from("fin_recurring").update(row).eq("id", id));
  else check(await supabase.from("fin_recurring").insert({ ...row, created_by: me.id }));
}

export async function deleteRecurringCost(id: string) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  await requireMe();
  const supabase = await sb();
  check(await supabase.from("fin_recurring").delete().eq("id", id));
}

/* ---------------------------------------------------- subscription apps --- */

export async function getApps(): Promise<{ apps: FinApp[]; plans: AppPlan[]; subscribers: AppSubscribers[] }> {
  if (!supabaseConfigured) return { apps: [], plans: [], subscribers: [] };
  const supabase = await sb();
  const [apps, plans, subs] = await Promise.all([
    supabase.from("fin_apps").select("*").order("name"),
    supabase.from("fin_app_plans").select("*").order("price"),
    supabase.from("fin_app_subscribers").select("*"),
  ]);
  return {
    apps: check(apps).map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      status: r.status,
      launchOn: r.launch_on,
      monthlyCost: num(r.monthly_cost),
      accentColor: r.accent_color,
    })),
    plans: check(plans).map((r) => ({ id: r.id, appId: r.app_id, name: r.name, price: num(r.price), billing: r.billing, active: r.active })),
    subscribers: check(subs).map((r) => ({ planId: r.plan_id, month: String(r.month).slice(0, 7), subscribers: r.subscribers })),
  };
}

export async function saveApp(id: string | null, input: Omit<FinApp, "id">) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  const me = await requireMe();
  const supabase = await sb();
  const row = {
    name: input.name.trim(),
    description: input.description,
    status: input.status,
    launch_on: input.launchOn || null,
    monthly_cost: input.monthlyCost,
    accent_color: input.accentColor,
  };
  if (id) check(await supabase.from("fin_apps").update(row).eq("id", id));
  else check(await supabase.from("fin_apps").insert({ ...row, created_by: me.id }));
}

export async function deleteApp(id: string) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  await requireMe();
  const supabase = await sb();
  check(await supabase.from("fin_apps").delete().eq("id", id));
}

export async function saveAppPlan(id: string | null, input: Omit<AppPlan, "id">) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  await requireMe();
  const supabase = await sb();
  const row = { app_id: input.appId, name: input.name.trim(), price: input.price, billing: input.billing, active: input.active };
  if (id) check(await supabase.from("fin_app_plans").update(row).eq("id", id));
  else check(await supabase.from("fin_app_plans").insert(row));
}

export async function deleteAppPlan(id: string) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  await requireMe();
  const supabase = await sb();
  check(await supabase.from("fin_app_plans").delete().eq("id", id));
}

/** Stores the subscribers of several plans for one month (YYYY-MM). */
export async function saveAppSubscribers(ym: string, counts: Record<string, number>) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  await requireMe();
  const supabase = await sb();
  const rows = Object.entries(counts).map(([plan_id, n]) => ({ plan_id, month: `${ym}-01`, subscribers: Math.max(0, Math.round(n)) }));
  if (rows.length) check(await supabase.from("fin_app_subscribers").upsert(rows));
}

/** Expenses between two dates (inclusive), newest first, with signed receipts. */
export async function getExpenses(from: string, to: string): Promise<FinExpense[]> {
  if (!supabaseConfigured) return [];
  const supabase = await sb();
  const rows = check(
    await supabase.from("fin_expenses").select("*").gte("spent_on", from).lte("spent_on", to).order("spent_on", { ascending: false }),
  );
  const paths = rows.filter((r) => r.receipt_path).map((r) => r.receipt_path as string);
  const urlByPath = new Map<string, string>();
  if (paths.length) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_TTL);
    (data ?? []).forEach((x) => { if (x.path && x.signedUrl) urlByPath.set(x.path, x.signedUrl); });
  }
  return rows.map((r) => ({
    id: r.id,
    spentOn: r.spent_on,
    category: r.category,
    vendor: r.vendor,
    description: r.description,
    amount: num(r.amount),
    recurringId: r.recurring_id,
    clientId: r.client_id,
    projectId: r.project_id,
    paid: r.paid,
    receiptName: r.receipt_name,
    receiptUrl: r.receipt_path ? urlByPath.get(r.receipt_path) : undefined,
  }));
}

export async function saveExpense(
  input: Omit<FinExpense, "id" | "receiptUrl" | "receiptName"> & { receipt?: { path: string; name: string } | null },
) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  const me = await requireMe();
  const supabase = await sb();
  check(
    await supabase.from("fin_expenses").insert({
      spent_on: input.spentOn,
      category: input.category,
      vendor: input.vendor,
      description: input.description,
      amount: input.amount,
      recurring_id: input.recurringId,
      client_id: input.clientId,
      project_id: input.projectId,
      paid: input.paid,
      receipt_path: input.receipt?.path ?? null,
      receipt_name: input.receipt?.name ?? null,
      created_by: me.id,
    }),
  );
}

export async function deleteExpense(id: string) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  await requireMe();
  const supabase = await sb();
  const { data } = await supabase.from("fin_expenses").select("receipt_path").eq("id", id).maybeSingle();
  check(await supabase.from("fin_expenses").delete().eq("id", id));
  if (data?.receipt_path) await supabase.storage.from(BUCKET).remove([data.receipt_path]);
}

export async function getIncome(from: string, to: string): Promise<FinIncome[]> {
  if (!supabaseConfigured) return [];
  const supabase = await sb();
  return check(
    await supabase.from("fin_income").select("*").gte("issued_on", from).lte("issued_on", to).order("issued_on", { ascending: false }),
  ).map((r) => ({
    id: r.id,
    issuedOn: r.issued_on,
    clientId: r.client_id,
    projectId: r.project_id,
    description: r.description,
    invoiceNumber: r.invoice_number,
    amount: num(r.amount),
    status: r.status,
    paidOn: r.paid_on,
    installmentNo: r.installment_no,
    installmentOf: r.installment_of,
  }));
}

export async function saveIncome(id: string | null, input: Omit<FinIncome, "id">) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  const me = await requireMe();
  const supabase = await sb();
  const row = {
    issued_on: input.issuedOn,
    client_id: input.clientId,
    project_id: input.projectId,
    description: input.description,
    invoice_number: input.invoiceNumber,
    amount: input.amount,
    status: input.status,
    paid_on: input.status === "paid" ? input.paidOn || new Date().toLocaleDateString("en-CA") : null,
  };
  if (id) check(await supabase.from("fin_income").update(row).eq("id", id));
  else check(await supabase.from("fin_income").insert({ ...row, created_by: me.id }));
}

export async function deleteIncome(id: string) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  await requireMe();
  const supabase = await sb();
  check(await supabase.from("fin_income").delete().eq("id", id));
}

export async function getBudgets(year: number): Promise<{ month: number; category: string; amount: number }[]> {
  if (!supabaseConfigured) return [];
  const supabase = await sb();
  return check(await supabase.from("fin_budgets").select("*").eq("year", year)).map((r) => ({
    month: r.month,
    category: r.category,
    amount: num(r.amount),
  }));
}

/** Replaces the budget of one month (categories with 0 are removed). */
export async function saveBudget(year: number, month: number, amounts: Record<string, number>) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  await requireMe();
  const supabase = await sb();
  check(await supabase.from("fin_budgets").delete().eq("year", year).eq("month", month));
  const rows = Object.entries(amounts)
    .filter(([, v]) => v > 0)
    .map(([category, amount]) => ({ year, month, category, amount }));
  if (rows.length) check(await supabase.from("fin_budgets").insert(rows));
}

/* ---------------------------------------------------- client billing --- */

export const EMPTY_BILLING: ClientBilling = {
  model: "project",
  paymentMethod: "transfer",
  termsDays: 30,
  ivaRate: 19,
  withholding: false,
  contractValue: null,
  installments: 1,
  installmentFrequency: "monthly",
  installmentSplit: [],
  firstDueOn: null,
  notes: "",
};

/** Billing terms (null when the viewer can't see them). */
export async function getClientBilling(clientId: string): Promise<ClientBilling | null> {
  if (!supabaseConfigured) return null;
  const supabase = await sb();
  const { data: r } = await supabase.from("client_billing").select("*").eq("client_id", clientId).maybeSingle();
  if (!r) return null;
  return {
    model: r.model,
    paymentMethod: r.payment_method,
    termsDays: r.terms_days,
    ivaRate: Number(r.iva_rate),
    withholding: r.withholding,
    contractValue: r.contract_value === null ? null : Number(r.contract_value),
    installments: r.installments,
    installmentFrequency: r.installment_frequency,
    installmentSplit: (r.installment_split ?? []).map(Number),
    firstDueOn: r.first_due_on,
    notes: r.notes,
  };
}

export async function saveClientBilling(clientId: string, b: ClientBilling, generate: boolean) {
  if (!supabaseConfigured) throw new Error("Requiere Supabase");
  const me = await requireMe();
  const supabase = await sb();
  check(
    await supabase.from("client_billing").upsert({
      client_id: clientId,
      model: b.model,
      payment_method: b.paymentMethod,
      terms_days: b.termsDays,
      iva_rate: b.ivaRate,
      withholding: b.withholding,
      contract_value: b.contractValue,
      installments: Math.max(1, b.installments),
      installment_frequency: b.installmentFrequency,
      installment_split: b.installmentSplit,
      first_due_on: b.firstDueOn,
      notes: b.notes,
      updated_by: me.id,
      updated_at: new Date().toISOString(),
    }),
  );
  if (generate) {
    const { error } = await supabase.rpc("work_generate_installments", { cid: clientId, pid: null });
    if (error) throw new Error(error.message);
  }
}

/** A client's income lines (installments, invoices) — finance roles only. */
export async function getClientIncome(clientId: string): Promise<FinIncome[]> {
  if (!supabaseConfigured) return [];
  const supabase = await sb();
  const { data } = await supabase.from("fin_income").select("*").eq("client_id", clientId).order("issued_on");
  return (data ?? []).map((r) => ({
    id: r.id,
    issuedOn: r.issued_on,
    clientId: r.client_id,
    projectId: r.project_id,
    description: r.description,
    invoiceNumber: r.invoice_number,
    amount: Number(r.amount),
    status: r.status,
    paidOn: r.paid_on,
    installmentNo: r.installment_no,
    installmentOf: r.installment_of,
  }));
}
