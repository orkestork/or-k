/* In-memory data access for O R-K WORK.
   Async on purpose — swapping these for Supabase calls later won't touch the UI.
   State lives for the lifetime of the server process (fine for the mock). */

import "server-only";
import type {
  ActivityEntry,
  Client,
  Comment,
  Project,
  Request,
  WorkflowState,
  WorkUserRecord,
} from "@/types/work/domain";
import { WORKFLOW, nextState } from "@/lib/work/workflow";
import {
  CLIENTS,
  CURRENT_USER_ID,
  PROJECTS,
  USERS,
  buildCalendar,
  buildNotifications,
  buildRequests,
  ago,
} from "./seed";

type DB = {
  users: WorkUserRecord[];
  clients: Client[];
  projects: Project[];
  requests: Request[];
};

const g = globalThis as unknown as { __orkWorkDB?: DB };

function db(): DB {
  if (!g.__orkWorkDB) {
    g.__orkWorkDB = {
      users: USERS,
      clients: CLIENTS,
      projects: PROJECTS,
      requests: buildRequests(),
    };
  }
  return g.__orkWorkDB;
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/* --------------------------------------------------------------- reads --- */

export async function getUsers() {
  return clone(db().users);
}

export async function getUser(id: string) {
  return clone(db().users.find((u) => u.id === id) ?? null);
}

export async function getSessionUser() {
  return clone(db().users.find((u) => u.id === CURRENT_USER_ID)!);
}

export async function getClients() {
  return clone(db().clients);
}

export async function getClient(id: string) {
  return clone(db().clients.find((c) => c.id === id) ?? null);
}

export async function getProjects() {
  return clone(db().projects);
}

export async function getProject(id: string) {
  return clone(db().projects.find((p) => p.id === id) ?? null);
}

export async function getProjectsByClient(clientId: string) {
  return clone(db().projects.filter((p) => p.clientId === clientId));
}

export async function getRequests() {
  return clone(db().requests);
}

export async function getRequest(id: string) {
  return clone(db().requests.find((r) => r.id === id) ?? null);
}

export async function getRequestsByProject(projectId: string) {
  return clone(db().requests.filter((r) => r.projectId === projectId));
}

export async function getRequestsByClient(clientId: string) {
  return clone(db().requests.filter((r) => r.clientId === clientId));
}

export async function getCalendar() {
  return buildCalendar(db().requests);
}

export async function getNotifications(userId = CURRENT_USER_ID) {
  return buildNotifications(db().requests).filter((n) => n.forUserId === userId);
}

/* ------------------------------------------------------------ dashboard --- */

export async function getDashboard(userId = CURRENT_USER_ID) {
  const reqs = db().requests;
  const mine = reqs.filter((r) => r.assigneeId === userId);
  const active = reqs.filter(
    (r) => !["completed", "archived"].includes(r.state),
  );

  const needsMe = active.filter((r) => {
    const owner = WORKFLOW[r.state].owner;
    const me = db().users.find((u) => u.id === userId);
    return owner && me && owner === me.role;
  });

  const awaitingApproval = active.filter((r) =>
    ["copy_review", "creative_review", "account_review", "client_review"].includes(
      r.state,
    ),
  );

  const dueSoon = active
    .filter((r) => {
      const d = (new Date(r.deadline).getTime() - Date.now()) / 86_400_000;
      return d <= 3;
    })
    .sort((a, b) => +new Date(a.deadline) - +new Date(b.deadline));

  const completedThisWeek = reqs.filter((r) => {
    if (!["completed", "published"].includes(r.state)) return false;
    const last = r.activity[0];
    return last && Date.now() - +new Date(last.at) < 7 * 86_400_000;
  });

  const adjustmentsOpen = active.filter((r) => r.state === "adjustments");

  return {
    today: clone(mine.filter((r) => !["completed", "archived"].includes(r.state))),
    needsAttention: clone([...needsMe, ...adjustmentsOpen.filter((r) => !needsMe.includes(r))]),
    awaitingApproval: clone(awaitingApproval),
    dueSoon: clone(dueSoon),
    completedThisWeek: clone(completedThisWeek),
    counts: {
      activeProjects: db().projects.filter((p) => p.status === "active").length,
      activeRequests: active.length,
      awaitingApproval: awaitingApproval.length,
      overdue: active.filter((r) => new Date(r.deadline).getTime() < Date.now())
        .length,
    },
  };
}

/* ------------------------------------------------------------ workload --- */

export async function getWorkload() {
  const reqs = db().requests.filter(
    (r) => !["completed", "archived"].includes(r.state),
  );
  return db()
    .users.filter((u) => u.active && u.role !== "client")
    .map((u) => {
      const tasks = reqs.filter((r) => r.assigneeId === u.id);
      return {
        user: clone(u),
        count: tasks.length,
        urgent: tasks.filter((t) => t.priority === "urgent" || t.priority === "high").length,
        load: tasks.length >= 6 ? "high" : tasks.length >= 3 ? "medium" : "low",
      };
    })
    .sort((a, b) => b.count - a.count);
}

/* -------------------------------------------------------------- writes --- */

function touch(req: Request, actorId: string, verb: string, detail: string) {
  const entry: ActivityEntry = {
    id: `${req.id}-act-${Date.now()}`,
    at: new Date().toISOString(),
    actorId,
    verb,
    detail,
  };
  req.activity = [entry, ...req.activity];
}

export async function setRequestState(
  requestId: string,
  state: WorkflowState,
  actorId = CURRENT_USER_ID,
) {
  const req = db().requests.find((r) => r.id === requestId);
  if (!req) return;
  req.state = state;
  touch(req, actorId, "movió a", WORKFLOW[state].label);
}

export async function advanceRequest(requestId: string, actorId = CURRENT_USER_ID) {
  const req = db().requests.find((r) => r.id === requestId);
  if (!req) return;
  const next = nextState(req.state);
  if (!next) return;
  req.state = next;
  touch(req, actorId, "movió a", WORKFLOW[next].label);
}

export async function decideApproval(
  requestId: string,
  decision: "approved" | "changes_requested",
  note: string,
  actorId = CURRENT_USER_ID,
) {
  const req = db().requests.find((r) => r.id === requestId);
  if (!req) return;
  const stage = req.state as
    | "copy_review"
    | "creative_review"
    | "account_review"
    | "client_review";

  req.approvals = [
    ...req.approvals,
    {
      id: `${req.id}-ap-${Date.now()}`,
      stage,
      decision,
      byId: actorId,
      at: new Date().toISOString(),
      note,
    },
  ];

  if (decision === "approved") {
    const next = nextState(req.state);
    if (next) req.state = next;
    touch(req, actorId, "aprobó en", WORKFLOW[stage].label);
  } else {
    req.state = stage === "copy_review" ? "design" : "adjustments";
    touch(req, actorId, "pidió cambios en", WORKFLOW[stage].label);
  }
}

export async function addComment(
  requestId: string,
  body: string,
  actorId = CURRENT_USER_ID,
) {
  const req = db().requests.find((r) => r.id === requestId);
  if (!req || !body.trim()) return;
  const mentionIds = db()
    .users.filter((u) =>
      new RegExp(`@${u.name.split(" ")[0]}`, "i").test(body),
    )
    .map((u) => u.id);
  const comment: Comment = {
    id: `${req.id}-c-${Date.now()}`,
    authorId: actorId,
    body: body.trim(),
    createdAt: new Date().toISOString(),
    state: req.state,
    mentionIds,
    internal: true,
  };
  req.comments = [...req.comments, comment];
  touch(req, actorId, "comentó", body.trim().slice(0, 60));
}

export async function addVersion(
  requestId: string,
  fileName: string,
  note: string,
  actorId = CURRENT_USER_ID,
) {
  const req = db().requests.find((r) => r.id === requestId);
  if (!req) return;
  const n = req.versions.length + 1;
  req.versions = [
    ...req.versions,
    {
      id: `${req.id}-v-${Date.now()}`,
      label: `V${n}`,
      fileName: fileName || `${req.id.toLowerCase()}_v${n}.png`,
      kind: "image",
      uploadedById: actorId,
      uploadedAt: new Date().toISOString(),
      note,
      state: req.state,
    },
  ];
  touch(req, actorId, "subió", `V${n}`);
}

export async function registerAdjustment(
  requestId: string,
  target: Request["adjustments"][number]["target"],
  comment: string,
  actorId = CURRENT_USER_ID,
) {
  const req = db().requests.find((r) => r.id === requestId);
  if (!req) return;
  const round = req.roundsUsed + 1;
  req.roundsUsed = round;
  req.adjustments = [
    ...req.adjustments,
    {
      id: `${req.id}-adj-${Date.now()}`,
      round,
      target,
      comment,
      byId: actorId,
      at: new Date().toISOString(),
      billable: round > req.roundsIncluded,
    },
  ];
  req.state = target === "copy" || target === "copy_design" ? "copy" : "design";
  touch(req, actorId, "registró ajustes", `Ronda ${round}/${req.roundsIncluded}`);
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
  priority: Request["priority"];
  assigneeId: string | null;
  roundsIncluded: number;
  observations: string;
};

export async function createRequest(
  input: NewRequestInput,
  actorId = CURRENT_USER_ID,
): Promise<string> {
  const store = db();
  const project = store.projects.find((p) => p.id === input.projectId);
  if (!project) throw new Error("Proyecto no encontrado");

  const year = new Date().getFullYear();
  const seq = store.requests.length + 1;
  const id = `ORK-${year}-${String(seq).padStart(4, "0")}`;
  const split = (v: string) =>
    v.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);

  const request: Request = {
    id,
    clientId: project.clientId,
    projectId: input.projectId,
    campaign: input.campaign || project.name,
    title: input.title,
    description: input.objective,
    objective: input.objective,
    audience: input.audience,
    mainMessage: input.mainMessage,
    cta: input.cta,
    deliverables: split(input.deliverables),
    formats: split(input.formats),
    channels: split(input.channels),
    references: input.references,
    deadline: new Date(input.deadline || Date.now() + 7 * 86_400_000).toISOString(),
    priority: input.priority,
    state: "request",
    assigneeId: input.assigneeId,
    createdById: actorId,
    createdAt: new Date().toISOString(),
    roundsIncluded: input.roundsIncluded,
    roundsUsed: 0,
    observations: input.observations,
    copy: { concept: "", headline: "", subheadline: "", caption: "", cta: input.cta, visualIdeas: "", notes: "", drafts: [] },
    versions: [],
    markers: [],
    comments: [],
    approvals: [],
    adjustments: [],
    activity: [
      {
        id: `${id}-act-0`,
        at: new Date().toISOString(),
        actorId,
        verb: "creó la solicitud",
        detail: input.title,
      },
    ],
  };

  store.requests = [request, ...store.requests];
  return id;
}

/** Reset the mock DB (used by a dev-only control). */
export async function resetStore() {
  g.__orkWorkDB = undefined;
  void ago;
}
