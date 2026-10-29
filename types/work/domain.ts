/* OR-K WORK — domain model.
   These shapes mirror what the Supabase queries will return, so pages can be
   wired now and the data source swapped later without touching the UI. */

export type RoleSlug =
  | "super_admin"
  | "agency_director"
  | "creative_director"
  | "art_director"
  | "strategy_director"
  | "operations_director"
  | "finance"
  | "account_manager"
  | "account_director"
  | "business_developer"
  | "project_manager"
  | "producer"
  | "copywriter"
  | "content_strategist"
  | "designer"
  | "ux_ui_designer"
  | "illustrator"
  | "motion_designer"
  | "video_editor"
  | "photographer"
  | "artist_3d"
  | "community_manager"
  | "media_buyer"
  | "seo_specialist"
  | "data_analyst"
  | "product_manager"
  | "tech_lead"
  | "developer"
  | "frontend_developer"
  | "backend_developer"
  | "mobile_developer"
  | "qa_engineer"
  | "devops"
  | "freelancer"
  | "hr"
  | "client";

export type WorkflowState =
  | "request"
  | "briefing"
  | "copy"
  | "design"
  | "copy_review"
  | "creative_review"
  | "account_review"
  | "client_review"
  | "adjustments"
  | "approved"
  | "scheduled"
  | "published"
  | "completed"
  | "archived";

export type Priority = "low" | "medium" | "high" | "urgent";

export type AdjustmentTarget =
  | "copy"
  | "design"
  | "copy_design"
  | "information"
  | "product"
  | "format"
  | "other";

export interface WorkUserRecord {
  id: string;
  name: string;
  email: string;
  role: RoleSlug;
  title: string;
  initials: string;
  color: string;
  active: boolean;
  /** Account a `client` user belongs to. */
  clientId?: string | null;
  /** Profile photo (public URL), initials are shown when missing. */
  avatarUrl?: string | null;
  /** Direct manager (org chart). */
  managerId?: string | null;
  /** Default person covering them when they're off. */
  backupId?: string | null;
  /** Set while the person is off today (vacation, sick leave…). */
  away?: { kind: Absence["kind"]; until: string; substituteId: string | null } | null;
}

export interface Absence {
  id: string;
  userId: string;
  kind: "vacation" | "sick" | "leave" | "other";
  startOn: string;
  endOn: string;
  substituteId: string | null;
  note: string;
  status: "pending" | "approved" | "rejected";
  decidedBy: string | null;
}

export interface HrProfile {
  userId: string;
  documentType: string;
  documentNumber: string;
  birthDate: string | null;
  phone: string;
  personalEmail: string;
  address: string;
  city: string;
  emergencyName: string;
  emergencyRelation: string;
  emergencyPhone: string;
  contractType: "indefinite" | "fixed" | "work" | "services" | "apprentice" | "freelance";
  startDate: string | null;
  endDate: string | null;
  /** Null when the viewer may not see pay. */
  salary: number | null;
  salaryPeriod: "monthly" | "hourly" | "project";
  eps: string;
  pensionFund: string;
  arl: string;
  compensationFund: string;
  notes: string;
  updatedAt: string | null;
  workSchedule: "full_time" | "part_time" | "hourly";
  arlRiskLevel: number;
  severanceFund: string;
  /** null = automatic (salary ≤ 2 SMMLV). */
  transportAllowance: boolean | null;
  contractValue: number | null;
  paymentFrequency: "monthly" | "biweekly" | "per_delivery";
  paysOwnSocialSecurity: boolean;
  taxId: string;
  bankName: string;
  bankAccountType: "savings" | "checking";
  bankAccountNumber: string;
  /** Obra o labor contracts: the work they cover. */
  workDescription: string;
}

export interface HrDocument {
  id: string;
  userId: string;
  category: "contract" | "id" | "certificate" | "social_security" | "payroll" | "other";
  name: string;
  size: number | null;
  uploadedAt: string;
  url?: string;
}

export interface ClientContact {
  name: string;
  role: string;
  email: string;
  phone: string;
}

export interface AssetItem {
  id: string;
  category:
    | "logos"
    | "brandbook"
    | "typography"
    | "colors"
    | "photography"
    | "product"
    | "templates"
    | "references"
    | "documents";
  name: string;
  kind: "image" | "pdf" | "font" | "video" | "zip" | "doc" | "link";
  addedAt: string;
  addedBy: string;
  /** Signed or external URL, when the asset has a file. */
  url?: string;
}

export interface ClientLegal {
  /** Razón social */
  legalName: string;
  /** NIT, with verification digit */
  taxId: string;
  taxRegime: string;
  address: string;
  city: string;
  country: string;
  website: string;
  billingEmail: string;
}

export interface ClientBilling {
  model: "project" | "retainer" | "hourly";
  paymentMethod: "transfer" | "pse" | "card" | "check" | "cash" | "other";
  termsDays: number;
  ivaRate: number;
  withholding: boolean;
  contractValue: number | null;
  installments: number;
  installmentFrequency: "monthly" | "biweekly" | "milestones";
  /** Custom % per installment (e.g. [50, 50]); empty = equal parts. */
  installmentSplit: number[];
  firstDueOn: string | null;
  notes: string;
}

export interface Client {
  id: string;
  name: string;
  logoText: string;
  accentColor: string;
  industry: string;
  contact: ClientContact;
  accountManagerId: string;
  teamIds: string[];
  since: string;
  /** Inactive clients stay on record but leave pickers and projections. */
  active: boolean;
  assets: AssetItem[];
  legal: ClientLegal;
}

export interface Project {
  id: string;
  clientId: string;
  name: string;
  brief: string;
  status: "active" | "on_hold" | "closed";
  startDate: string;
  targetDate: string;
  leadId: string;
  teamIds: string[];
  budgetHours?: number | null;
}

export interface FileVersion {
  id: string;
  label: string; // V1, V2…
  fileName: string;
  kind: AssetItem["kind"];
  uploadedById: string;
  uploadedAt: string;
  note: string;
  state: WorkflowState;
  /** Signed URL to the uploaded file, when stored. */
  fileUrl?: string;
  /** Visible to the client in their portal. */
  shared?: boolean;
}

export interface DesignMarker {
  id: string;
  index: number;
  x: number; // 0–1 relative to the piece
  y: number;
  body: string;
  authorId: string;
  createdAt: string;
  resolved: boolean;
  /** Version the marker was placed on. */
  versionId?: string | null;
}

export interface Comment {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
  state: WorkflowState;
  versionLabel?: string;
  mentionIds: string[];
  parentId?: string;
  internal: boolean;
}

export interface ApprovalRecord {
  id: string;
  stage: Extract<
    WorkflowState,
    "copy_review" | "creative_review" | "account_review" | "client_review"
  >;
  decision: "approved" | "changes_requested";
  byId: string;
  at: string;
  note: string;
}

export interface AdjustmentRequest {
  id: string;
  round: number;
  target: AdjustmentTarget;
  comment: string;
  byId: string;
  at: string;
  billable: boolean;
}

export interface ActivityEntry {
  id: string;
  at: string;
  actorId: string;
  verb: string;
  detail: string;
}

export interface CopyDraft {
  concept: string;
  headline: string;
  subheadline: string;
  caption: string;
  cta: string;
  visualIdeas: string;
  notes: string;
  drafts: { label: string; savedAt: string; savedById: string }[];
}

export interface RequestFile {
  id: string;
  name: string;
  kind: AssetItem["kind"];
  size: number | null;
  uploadedById: string;
  uploadedAt: string;
  /** Signed URL (detail views only). */
  url?: string;
}

export interface MinuteAgreement {
  text: string;
  ownerId: string | null;
  due: string | null;
  done: boolean;
}

/** Meeting minutes ("acta") attached to a request. */
export interface RequestMinute {
  id: string;
  title: string;
  heldOn: string;
  attendeeIds: string[];
  externalAttendees: string;
  summary: string;
  agreements: MinuteAgreement[];
  nextSteps: string;
  fileName: string | null;
  /** Signed URL of the signed/scanned acta (detail views only). */
  fileUrl?: string;
  visibleToClient: boolean;
  createdById: string;
  updatedAt: string;
}

export interface RequestSubtask {
  id: string;
  title: string;
  assigneeId: string | null;
  dueOn: string | null;
  done: boolean;
}

export interface Request {
  id: string; // ORK-2026-0001
  clientId: string;
  projectId: string;
  campaign: string;
  title: string;
  description: string;
  objective: string;
  audience: string;
  mainMessage: string;
  cta: string;
  deliverables: string[];
  formats: string[];
  channels: string[];
  references: string;
  deadline: string;
  priority: Priority;
  state: WorkflowState;
  assigneeId: string | null;
  createdById: string;
  createdAt: string;
  roundsIncluded: number;
  roundsUsed: number;
  observations: string;
  copy: CopyDraft;
  versions: FileVersion[];
  markers: DesignMarker[];
  comments: Comment[];
  approvals: ApprovalRecord[];
  adjustments: AdjustmentRequest[];
  activity: ActivityEntry[];
  /** Attachments: briefs, references, documents. */
  files?: RequestFile[];
  minutes?: RequestMinute[];
  /** People working with the lead assignee. */
  collaboratorIds?: string[];
  subtasks?: RequestSubtask[];
  /** Planned start (timeline); falls back to createdAt. */
  startOn?: string | null;
  /** Requests that must be approved/done before this one. */
  dependsOn?: string[];
  /** Person who signs off internal reviews (null: anyone owning the stage). */
  approverId?: string | null;
}

export interface TimeEntry {
  id: string;
  requestId: string;
  userId: string;
  minutes: number;
  workedOn: string;
  note: string;
}

export interface TemplateTask {
  title: string;
  campaign: string;
  objective: string;
  deliverables: string[];
  priority: Priority;
  /** Days from the project start. */
  startOffset: number;
  endOffset: number;
  assigneeId: string | null;
  collaboratorIds: string[];
  approverId?: string | null;
  subtasks: { title: string; assigneeId: string | null; offset: number | null }[];
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  durationDays: number;
  tasks: TemplateTask[];
  createdAt: string;
}

export interface ClientDoc {
  id: string;
  clientId: string;
  title: string;
  body: string;
  pinned: boolean;
  visibleToClient: boolean;
  updatedBy: string;
  updatedAt: string;
}

export interface Recurrence {
  id: string;
  projectId: string;
  title: string;
  objective: string;
  deliverables: string[];
  priority: Priority;
  assigneeId: string | null;
  collaboratorIds: string[];
  frequency: "weekly" | "biweekly" | "monthly";
  leadDays: number;
  nextRun: string;
  active: boolean;
}

export interface Automation {
  id: string;
  name: string;
  toState: WorkflowState;
  projectId: string | null;
  action: "notify_role" | "notify_user" | "assign_user" | "set_priority";
  role: RoleSlug | null;
  userId: string | null;
  priority: Priority | null;
  active: boolean;
}

export interface CalendarEvent {
  id: string;
  date: string;
  kind: "deadline" | "delivery" | "publish" | "meeting" | "campaign";
  title: string;
  clientId: string;
  requestId?: string;
  /** First day (YYYY-MM-DD) when the event spans several days, ending on `date`. */
  start?: string | null;
}

export interface Notification {
  id: string;
  at: string;
  kind: "assignment" | "mention" | "approval" | "adjustment" | "deadline" | "status";
  body: string;
  href: string;
  read: boolean;
  forUserId: string;
}
