/* OR-K WORK — mock dataset. Dates are computed relative to "now" so the app
   always feels current. Swap this module for Supabase queries later; the
   returned shapes already match `types/work/domain`. */

import type {
  ActivityEntry,
  CalendarEvent,
  Client,
  Comment,
  Notification,
  Project,
  Request,
  WorkflowState,
  WorkUserRecord,
} from "@/types/work/domain";
import { HAPPY_PATH, WORKFLOW } from "@/lib/work/workflow";

const NOW = Date.now();
const DAY = 86_400_000;
const HOUR = 3_600_000;
export const ago = (d: number) => new Date(NOW - d * DAY).toISOString();
export const hoursAgo = (h: number) => new Date(NOW - h * HOUR).toISOString();
export const inDays = (d: number) => new Date(NOW + d * DAY).toISOString();

/* ------------------------------------------------------------------ team --- */

export const USERS: WorkUserRecord[] = [
  { id: "u-juan", name: "Juan Andrés Bernal Méndez", email: "juan@or-k.co", role: "super_admin", title: "Business Director", initials: "JB", color: "#e31572", active: true },
  { id: "u-andres", name: "Andrés Carrillo Ávila", email: "andres@or-k.co", role: "agency_director", title: "Executive Director", initials: "AC", color: "#8b5cf6", active: true },
  { id: "u-maureen", name: "Maureen Blandón Zavala", email: "maureen@or-k.co", role: "agency_director", title: "Financial Director", initials: "MB", color: "#0ea5e9", active: true },
  { id: "u-brandon", name: "Brandon Bustos", email: "brandon@or-k.co", role: "creative_director", title: "Technology & Creativity Director", initials: "BB", color: "#f59e0b", active: true },
  { id: "u-luis", name: "Luis Urdaneta", email: "luis@or-k.co", role: "account_manager", title: "Commercial Director", initials: "LU", color: "#22c55e", active: true },
  { id: "u-laura", name: "Laura Restrepo", email: "laura@or-k.co", role: "account_manager", title: "Account Manager", initials: "LR", color: "#ec4899", active: true },
  { id: "u-camila", name: "Camila Ortiz", email: "camila@or-k.co", role: "copywriter", title: "Senior Copywriter", initials: "CO", color: "#14b8a6", active: true },
  { id: "u-mateo", name: "Mateo Duarte", email: "mateo@or-k.co", role: "copywriter", title: "Copywriter", initials: "MD", color: "#a3e635", active: true },
  { id: "u-daniel", name: "Daniel Salazar", email: "daniel@or-k.co", role: "designer", title: "Art Director", initials: "DS", color: "#f97316", active: true },
  { id: "u-valentina", name: "Valentina Gómez", email: "valentina@or-k.co", role: "designer", title: "Designer", initials: "VG", color: "#c084fc", active: true },
  { id: "u-sofia", name: "Sofía León", email: "sofia@or-k.co", role: "motion_designer", title: "Motion Designer", initials: "SL", color: "#38bdf8", active: true },
  { id: "u-julian", name: "Julián Mora", email: "julian@or-k.co", role: "developer", title: "Developer", initials: "JM", color: "#64748b", active: true },
  { id: "u-natalia", name: "Natalia Ruiz", email: "natalia@or-k.co", role: "community_manager", title: "Community Manager", initials: "NR", color: "#fb7185", active: true },
];

/** The user "you" are signed in as while there is no real auth. */
export const CURRENT_USER_ID = "u-brandon";

/* --------------------------------------------------------------- clients --- */

export const CLIENTS: Client[] = ([
  {
    id: "c-marwa", name: "MARWA", logoText: "MW", accentColor: "#e11d48",
    industry: "Retail · Moda", accountManagerId: "u-laura",
    teamIds: ["u-laura", "u-camila", "u-daniel", "u-sofia"],
    since: ago(240),
    contact: { name: "Diana Marín", role: "Marketing Lead", email: "diana@marwa.com", phone: "+57 310 555 2210" },
    assets: [
      { id: "a-mw-1", category: "logos", name: "MARWA · logo primario.svg", kind: "image", addedAt: ago(200), addedBy: "u-daniel" },
      { id: "a-mw-2", category: "brandbook", name: "MARWA Brandbook 2026.pdf", kind: "pdf", addedAt: ago(180), addedBy: "u-laura" },
      { id: "a-mw-3", category: "typography", name: "Söhne · familia completa.zip", kind: "font", addedAt: ago(180), addedBy: "u-daniel" },
      { id: "a-mw-4", category: "photography", name: "Editorial FW26 (selección).zip", kind: "zip", addedAt: ago(20), addedBy: "u-sofia" },
    ],
  },
  {
    id: "c-kliniu", name: "Kliniu", logoText: "KL", accentColor: "#0ea5e9",
    industry: "Salud · Consumo", accountManagerId: "u-luis",
    teamIds: ["u-luis", "u-mateo", "u-valentina", "u-natalia"],
    since: ago(160),
    contact: { name: "Sebastián Rojas", role: "CEO", email: "sebastian@kliniucolombia.com", phone: "+57 320 555 8841" },
    assets: [
      { id: "a-kl-1", category: "logos", name: "Kliniu · logotipo.svg", kind: "image", addedAt: ago(150), addedBy: "u-valentina" },
      { id: "a-kl-2", category: "product", name: "Render dispensador v3.png", kind: "image", addedAt: ago(40), addedBy: "u-valentina" },
      { id: "a-kl-3", category: "colors", name: "Paleta Kliniu.pdf", kind: "pdf", addedAt: ago(150), addedBy: "u-valentina" },
    ],
  },
  {
    id: "c-lorigine", name: "L'Origine", logoText: "LO", accentColor: "#a21caf",
    industry: "Belleza · Skincare", accountManagerId: "u-laura",
    teamIds: ["u-laura", "u-camila", "u-daniel"],
    since: ago(90),
    contact: { name: "Camille Dubois", role: "Fundadora", email: "camille@lorigine.com.co", phone: "+57 315 555 1176" },
    assets: [
      { id: "a-lo-1", category: "references", name: "Moodboard dirección visual.pdf", kind: "pdf", addedAt: ago(80), addedBy: "u-daniel" },
    ],
  },
  {
    id: "c-geu", name: "GEU", logoText: "GE", accentColor: "#1d4ed8",
    industry: "Industrial · Caucho", accountManagerId: "u-luis",
    teamIds: ["u-luis", "u-camila", "u-julian"],
    since: ago(300),
    contact: { name: "Fernando Gómez", role: "Gerente comercial", email: "fernando@geu.com.co", phone: "+57 300 555 4402" },
    assets: [],
  },
  {
    id: "c-totalpars", name: "Totalpars", logoText: "TP", accentColor: "#ea580c",
    industry: "Movilidad · Repuestos", accountManagerId: "u-luis",
    teamIds: ["u-luis", "u-mateo", "u-valentina", "u-julian"],
    since: ago(60),
    contact: { name: "Marcela Peña", role: "Head of Growth", email: "marcela@totalpars.com", phone: "+57 312 555 9930" },
    assets: [
      { id: "a-tp-1", category: "templates", name: "Grid marketplace (Figma).link", kind: "link", addedAt: ago(30), addedBy: "u-julian" },
    ],
  },
] as Omit<Client, "legal" | "active">[]).map((c) => ({
  ...c,
  active: true,
  legal: { legalName: c.name, taxId: "", taxRegime: "", address: "", city: "", country: "Colombia", website: "", billingEmail: "" },
}));

/* -------------------------------------------------------------- projects --- */

export const PROJECTS: Project[] = [
  { id: "p-marwa-fw26", clientId: "c-marwa", name: "Campaña FW26", brief: "Lanzamiento de la colección Fall/Winter 26: key visual, sistema de piezas para redes y activación en tienda.", status: "active", startDate: ago(35), targetDate: inDays(18), leadId: "u-laura", teamIds: ["u-laura", "u-camila", "u-daniel", "u-sofia"] },
  { id: "p-marwa-360", clientId: "c-marwa", name: "Propuesta 360", brief: "Documento estratégico y landing de la propuesta anual 360 para MARWA.", status: "active", startDate: ago(20), targetDate: inDays(9), leadId: "u-laura", teamIds: ["u-laura", "u-camila", "u-daniel"] },
  { id: "p-kliniu-launch", clientId: "c-kliniu", name: "Lanzamiento dispensadores", brief: "Salida al mercado de la nueva línea de dispensadores: video de producto, piezas de beneficio y pauta.", status: "active", startDate: ago(45), targetDate: inDays(6), leadId: "u-luis", teamIds: ["u-luis", "u-mateo", "u-valentina", "u-sofia", "u-natalia"] },
  { id: "p-lorigine-id", clientId: "c-lorigine", name: "Sistema de identidad", brief: "Construcción del sistema de marca de L'Origine y sus aplicaciones.", status: "active", startDate: ago(70), targetDate: inDays(25), leadId: "u-laura", teamIds: ["u-laura", "u-camila", "u-daniel"] },
  { id: "p-geu-rebrand", clientId: "c-geu", name: "Rebrand multimarca", brief: "Arquitectura de marca y naming para las submarcas de GEU.", status: "on_hold", startDate: ago(120), targetDate: inDays(60), leadId: "u-luis", teamIds: ["u-luis", "u-camila"] },
  { id: "p-totalpars-store", clientId: "c-totalpars", name: "Marketplace", brief: "Identidad y contenido para el marketplace de repuestos de Totalpars.", status: "active", startDate: ago(28), targetDate: inDays(14), leadId: "u-luis", teamIds: ["u-luis", "u-mateo", "u-valentina", "u-julian"] },
];

/* -------------------------------------------------------------- requests --- */

type RequestSeed = {
  id: string;
  projectId: string;
  campaign: string;
  title: string;
  objective: string;
  audience: string;
  mainMessage: string;
  cta: string;
  deliverables: string[];
  formats: string[];
  channels: string[];
  deadlineInDays: number;
  createdDaysAgo: number;
  priority: Request["priority"];
  state: WorkflowState;
  assigneeId: string | null;
  createdById: string;
  roundsIncluded: number;
  roundsUsed: number;
};

const REQUEST_SEEDS: RequestSeed[] = [
  { id: "ORK-2026-0001", projectId: "p-marwa-fw26", campaign: "FW26 · Awareness", title: "Key visual campaña FW26", objective: "Definir el key visual maestro de la colección para toda la campaña.", audience: "Mujeres 25–40, moda contemporánea, Bogotá y Medellín.", mainMessage: "La temporada se siente antes de verse.", cta: "Descúbrelo en tienda", deliverables: ["Key visual 1:1", "Adaptación 9:16", "Adaptación 16:9"], formats: ["1080×1080", "1080×1920", "1920×1080"], channels: ["Instagram", "OOH", "Web"], deadlineInDays: 3, createdDaysAgo: 12, priority: "high", state: "creative_review", assigneeId: "u-daniel", createdById: "u-laura", roundsIncluded: 2, roundsUsed: 1 },
  { id: "ORK-2026-0002", projectId: "p-marwa-fw26", campaign: "FW26 · Lanzamiento", title: "Carrusel lanzamiento IG", objective: "Contar la historia de la colección en un carrusel de 6 slides.", audience: "Comunidad actual de MARWA en Instagram.", mainMessage: "Seis piezas, una temporada.", cta: "Ver colección", deliverables: ["Carrusel 6 slides"], formats: ["1080×1350"], channels: ["Instagram"], deadlineInDays: 7, createdDaysAgo: 6, priority: "medium", state: "design", assigneeId: "u-daniel", createdById: "u-laura", roundsIncluded: 2, roundsUsed: 0 },
  { id: "ORK-2026-0003", projectId: "p-marwa-360", campaign: "Propuesta 360", title: "Landing propuesta 360", objective: "Landing de una sola vista que resuma la propuesta anual para MARWA.", audience: "Comité directivo de MARWA.", mainMessage: "Un año, un sistema.", cta: "Agendar presentación", deliverables: ["Copy landing", "Wireframe de contenido"], formats: ["Desktop", "Mobile"], channels: ["Web"], deadlineInDays: 5, createdDaysAgo: 4, priority: "high", state: "copy", assigneeId: "u-camila", createdById: "u-laura", roundsIncluded: 3, roundsUsed: 0 },
  { id: "ORK-2026-0004", projectId: "p-kliniu-launch", campaign: "Lanzamiento · Producto", title: "Video producto 15s", objective: "Video corto que muestre el dispensador en uso y sus 3 beneficios clave.", audience: "Administradores de oficinas y espacios comerciales.", mainMessage: "Higiene sin fricción.", cta: "Cotiza para tu espacio", deliverables: ["Video 15s master", "Cortes 6s"], formats: ["1080×1080", "1080×1920"], channels: ["Instagram", "TikTok", "YouTube"], deadlineInDays: 2, createdDaysAgo: 15, priority: "urgent", state: "client_review", assigneeId: "u-sofia", createdById: "u-luis", roundsIncluded: 2, roundsUsed: 1 },
  { id: "ORK-2026-0005", projectId: "p-kliniu-launch", campaign: "Lanzamiento · Beneficios", title: "Post beneficios dispensador", objective: "Pieza única que liste los beneficios del dispensador de forma visual.", audience: "Decisores de compra B2B.", mainMessage: "Menos contacto, más confianza.", cta: "Conoce la línea", deliverables: ["Post 1:1"], formats: ["1080×1080"], channels: ["Instagram", "LinkedIn"], deadlineInDays: 4, createdDaysAgo: 11, priority: "medium", state: "adjustments", assigneeId: "u-valentina", createdById: "u-luis", roundsIncluded: 2, roundsUsed: 2 },
  { id: "ORK-2026-0006", projectId: "p-lorigine-id", campaign: "Identidad · Aplicaciones", title: "Aplicaciones de marca", objective: "Mostrar el sistema de identidad aplicado a packaging, papelería y redes.", audience: "Fundadora y equipo de L'Origine.", mainMessage: "Un origen, muchas superficies.", cta: "—", deliverables: ["Mockups packaging", "Papelería", "Plantillas RRSS"], formats: ["Varios"], channels: ["Presentación"], deadlineInDays: 8, createdDaysAgo: 9, priority: "medium", state: "account_review", assigneeId: "u-daniel", createdById: "u-laura", roundsIncluded: 3, roundsUsed: 1 },
  { id: "ORK-2026-0007", projectId: "p-lorigine-id", campaign: "Identidad · Manual", title: "Manual de marca v1", objective: "Primera versión del manual de marca con fundamentos y usos.", audience: "Equipo interno y proveedores de L'Origine.", mainMessage: "—", cta: "—", deliverables: ["Manual PDF"], formats: ["A4"], channels: ["Documento"], deadlineInDays: 12, createdDaysAgo: 3, priority: "low", state: "briefing", assigneeId: "u-laura", createdById: "u-laura", roundsIncluded: 2, roundsUsed: 0 },
  { id: "ORK-2026-0008", projectId: "p-totalpars-store", campaign: "Marketplace · Home", title: "Banner home marketplace", objective: "Banner principal del home que comunique la propuesta de valor del marketplace.", audience: "Talleres y flotas de transporte.", mainMessage: "Todo el repuesto, un solo lugar.", cta: "Explorar catálogo", deliverables: ["Banner desktop", "Banner mobile"], formats: ["1600×600", "800×800"], channels: ["Web"], deadlineInDays: 6, createdDaysAgo: 14, priority: "medium", state: "approved", assigneeId: "u-valentina", createdById: "u-luis", roundsIncluded: 2, roundsUsed: 1 },
  { id: "ORK-2026-0009", projectId: "p-totalpars-store", campaign: "Marketplace · Onboarding", title: "Email onboarding vendedores", objective: "Secuencia de bienvenida para nuevos vendedores del marketplace.", audience: "Vendedores registrados sin primera publicación.", mainMessage: "Publica tu primer repuesto hoy.", cta: "Publicar ahora", deliverables: ["Email 1", "Email 2", "Email 3"], formats: ["HTML"], channels: ["Email"], deadlineInDays: 9, createdDaysAgo: 7, priority: "medium", state: "copy_review", assigneeId: "u-mateo", createdById: "u-luis", roundsIncluded: 2, roundsUsed: 0 },
  { id: "ORK-2026-0010", projectId: "p-marwa-fw26", campaign: "FW26 · Contenido", title: "Reel behind the scenes", objective: "Reel documental del backstage de la sesión de fotos FW26.", audience: "Comunidad de MARWA.", mainMessage: "Así se hizo la temporada.", cta: "—", deliverables: ["Reel 30s"], formats: ["1080×1920"], channels: ["Instagram", "TikTok"], deadlineInDays: 16, createdDaysAgo: 1, priority: "low", state: "request", assigneeId: null, createdById: "u-laura", roundsIncluded: 1, roundsUsed: 0 },
  { id: "ORK-2026-0011", projectId: "p-kliniu-launch", campaign: "Lanzamiento · Pauta", title: "Pauta display Q4", objective: "Set de banners display para la pauta de cierre de año.", audience: "Retargeting y prospección B2B.", mainMessage: "Higiene sin fricción.", cta: "Cotiza", deliverables: ["Set 6 tamaños"], formats: ["300×250", "728×90", "160×600", "320×50", "300×600", "970×250"], channels: ["Google Display"], deadlineInDays: -3, createdDaysAgo: 30, priority: "medium", state: "published", assigneeId: "u-natalia", createdById: "u-luis", roundsIncluded: 2, roundsUsed: 1 },
  { id: "ORK-2026-0012", projectId: "p-geu-rebrand", campaign: "Rebrand · Naming", title: "Naming submarcas", objective: "Explorar y proponer nombres para las 4 submarcas de GEU.", audience: "Junta directiva de GEU.", mainMessage: "—", cta: "—", deliverables: ["Territorios de naming", "Long list", "Short list"], formats: ["Documento"], channels: ["Presentación"], deadlineInDays: -20, createdDaysAgo: 80, priority: "low", state: "archived", assigneeId: "u-camila", createdById: "u-luis", roundsIncluded: 1, roundsUsed: 0 },
];

/* --- generators: activity / comments / versions from the request state ---- */

const clientOfProject = (projectId: string) =>
  PROJECTS.find((p) => p.id === projectId)!.clientId;

function buildActivity(seed: RequestSeed): ActivityEntry[] {
  const reached = HAPPY_PATH.slice(0, HAPPY_PATH.indexOf(seed.state) + 1);
  const project = PROJECTS.find((p) => p.id === seed.projectId)!;
  const entries: ActivityEntry[] = [];
  let t = seed.createdDaysAgo;
  const step = Math.max(0.4, seed.createdDaysAgo / (reached.length + 1));

  entries.push({
    id: `${seed.id}-act-0`,
    at: ago(t),
    actorId: seed.createdById,
    verb: "creó la solicitud",
    detail: seed.title,
  });

  reached.forEach((state, i) => {
    if (state === "request") return;
    t = Math.max(0, t - step);
    const meta = WORKFLOW[state];
    entries.push({
      id: `${seed.id}-act-${i}`,
      at: ago(t),
      actorId: meta.owner
        ? project.teamIds.find((id) => USERS.find((u) => u.id === id)?.role === meta.owner) ??
          seed.assigneeId ??
          seed.createdById
        : seed.createdById,
      verb: "movió a",
      detail: meta.label,
    });
  });

  if (seed.roundsUsed > 0) {
    entries.push({
      id: `${seed.id}-act-adj`,
      at: ago(Math.max(0, t + step / 2)),
      actorId: clientOfProject(seed.projectId) === "c-kliniu" ? "u-luis" : "u-laura",
      verb: "registró ajustes del cliente",
      detail: `Ronda ${seed.roundsUsed} de ${seed.roundsIncluded}`,
    });
  }

  return entries.sort((a, b) => +new Date(b.at) - +new Date(a.at));
}

function buildComments(seed: RequestSeed): Comment[] {
  const idx = HAPPY_PATH.indexOf(seed.state);
  if (idx < HAPPY_PATH.indexOf("copy")) return [];
  const out: Comment[] = [
    {
      id: `${seed.id}-c1`,
      authorId: "u-camila",
      body: "Dejé el concepto y los headlines en el workspace de copy. El territorio va por “sensación antes que producto”.",
      createdAt: ago(Math.max(1, seed.createdDaysAgo - 3)),
      state: "copy",
      mentionIds: [],
      internal: true,
    },
  ];
  if (idx >= HAPPY_PATH.indexOf("design")) {
    out.push({
      id: `${seed.id}-c2`,
      authorId: seed.assigneeId ?? "u-daniel",
      body: "Subí V1 con dos rutas visuales. La B usa más aire y tipografía a gran escala.",
      createdAt: ago(Math.max(1, seed.createdDaysAgo - 5)),
      state: "design",
      versionLabel: "V1",
      mentionIds: ["u-brandon"],
      internal: true,
    });
  }
  if (idx >= HAPPY_PATH.indexOf("copy_review")) {
    out.push({
      id: `${seed.id}-c3`,
      authorId: "u-camila",
      body: "@" + (USERS.find((u) => u.id === seed.assigneeId)?.name.split(" ")[0] ?? "diseño") +
        " el CTA quedó muy pequeño en la ruta B, súbelo un nivel.",
      createdAt: ago(Math.max(1, seed.createdDaysAgo - 6)),
      state: "copy_review",
      versionLabel: "V1",
      mentionIds: seed.assigneeId ? [seed.assigneeId] : [],
      internal: true,
    });
  }
  if (idx >= HAPPY_PATH.indexOf("creative_review")) {
    out.push({
      id: `${seed.id}-c4`,
      authorId: "u-brandon",
      body: "Ruta B aprobada como base. Ajustar el interlineado del titular y unificar el rosa con el brandbook antes de cuenta.",
      createdAt: ago(Math.max(1, seed.createdDaysAgo - 7)),
      state: "creative_review",
      versionLabel: "V2",
      mentionIds: [],
      internal: true,
    });
  }
  return out.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
}

function buildVersions(seed: RequestSeed): Request["versions"] {
  const idx = HAPPY_PATH.indexOf(seed.state);
  if (idx < HAPPY_PATH.indexOf("design")) return [];
  const versions: Request["versions"] = [
    {
      id: `${seed.id}-v1`,
      label: "V1",
      fileName: `${seed.id.toLowerCase()}_v1.png`,
      kind: seed.channels.includes("TikTok") || seed.title.includes("Video") || seed.title.includes("Reel") ? "video" : "image",
      uploadedById: seed.assigneeId ?? "u-daniel",
      uploadedAt: ago(Math.max(1, seed.createdDaysAgo - 5)),
      note: "Primera propuesta · dos rutas visuales.",
      state: "design",
    },
  ];
  if (idx >= HAPPY_PATH.indexOf("creative_review") || seed.roundsUsed > 0) {
    versions.push({
      id: `${seed.id}-v2`,
      label: "V2",
      fileName: `${seed.id.toLowerCase()}_v2.png`,
      kind: versions[0].kind,
      uploadedById: seed.assigneeId ?? "u-daniel",
      uploadedAt: ago(Math.max(1, seed.createdDaysAgo - 7)),
      note: "Ajustes de copy review aplicados.",
      state: "copy_review",
    });
  }
  if (["account_review", "client_review", "approved", "scheduled", "published", "completed"].includes(seed.state)) {
    versions.push({
      id: `${seed.id}-v3`,
      label: "V3",
      fileName: `${seed.id.toLowerCase()}_v3_final.png`,
      kind: versions[0].kind,
      uploadedById: seed.assigneeId ?? "u-daniel",
      uploadedAt: ago(Math.max(0.5, seed.createdDaysAgo - 9)),
      note: "Versión para revisión de cliente.",
      state: "account_review",
    });
  }
  return versions;
}

function buildApprovals(seed: RequestSeed): Request["approvals"] {
  const idx = HAPPY_PATH.indexOf(seed.state);
  const out: Request["approvals"] = [];
  if (idx > HAPPY_PATH.indexOf("copy_review")) {
    out.push({ id: `${seed.id}-ap1`, stage: "copy_review", decision: "approved", byId: "u-camila", at: ago(Math.max(1, seed.createdDaysAgo - 6)), note: "Copy alineado con la pieza." });
  }
  if (idx > HAPPY_PATH.indexOf("creative_review")) {
    out.push({ id: `${seed.id}-ap2`, stage: "creative_review", decision: "approved", byId: "u-brandon", at: ago(Math.max(1, seed.createdDaysAgo - 7)), note: "Ruta B como base, con ajustes menores." });
  }
  if (idx > HAPPY_PATH.indexOf("account_review")) {
    out.push({ id: `${seed.id}-ap3`, stage: "account_review", decision: "approved", byId: USERS.find((u) => PROJECTS.find((p) => p.id === seed.projectId)?.leadId === u.id)?.id ?? "u-laura", at: ago(Math.max(0.5, seed.createdDaysAgo - 9)), note: "Aprobado internamente, listo para cliente." });
  }
  if (["approved", "scheduled", "published", "completed"].includes(seed.state)) {
    out.push({ id: `${seed.id}-ap4`, stage: "client_review", decision: "approved", byId: "u-laura", at: ago(Math.max(0.2, seed.createdDaysAgo - 10)), note: "Cliente aprobó sin cambios." });
  }
  return out;
}

function buildAdjustments(seed: RequestSeed): Request["adjustments"] {
  if (seed.roundsUsed === 0) return [];
  const out: Request["adjustments"] = [];
  for (let r = 1; r <= seed.roundsUsed; r++) {
    out.push({
      id: `${seed.id}-adj${r}`,
      round: r,
      target: r === 1 ? "design" : "copy_design",
      comment:
        r === 1
          ? "El cliente pide más protagonismo del producto y bajar el texto."
          : "Segunda ronda: ajustar el claim y el color del CTA.",
      byId: "u-laura",
      at: ago(Math.max(0.5, seed.createdDaysAgo - 8 - r)),
      billable: r > seed.roundsIncluded,
    });
  }
  return out;
}

function buildCopy(seed: RequestSeed): Request["copy"] {
  const started = HAPPY_PATH.indexOf(seed.state) >= HAPPY_PATH.indexOf("copy");
  if (!started) {
    return { concept: "", headline: "", subheadline: "", caption: "", cta: seed.cta, visualIdeas: "", notes: "", drafts: [] };
  }
  return {
    concept: `Territorio “${seed.mainMessage}”. La pieza comunica la sensación antes que el producto: primero el mood, después la razón.`,
    headline: seed.mainMessage,
    subheadline: seed.objective,
    caption: `${seed.mainMessage} — ${seed.cta}. #ORK`,
    cta: seed.cta,
    visualIdeas: "Composición con mucho aire, tipografía a gran escala, foto editorial con luz lateral. Rosa OR-K como acento puntual.",
    notes: "Mantener el tono declarativo. Evitar adjetivos de más.",
    drafts: [
      { label: "Draft 1", savedAt: ago(Math.max(1, seed.createdDaysAgo - 3)), savedById: "u-camila" },
      { label: "Draft 2", savedAt: ago(Math.max(1, seed.createdDaysAgo - 4)), savedById: "u-camila" },
    ],
  };
}

export function buildRequests(): Request[] {
  return REQUEST_SEEDS.map((seed) => ({
    id: seed.id,
    clientId: clientOfProject(seed.projectId),
    projectId: seed.projectId,
    campaign: seed.campaign,
    title: seed.title,
    description: seed.objective,
    objective: seed.objective,
    audience: seed.audience,
    mainMessage: seed.mainMessage,
    cta: seed.cta,
    deliverables: seed.deliverables,
    formats: seed.formats,
    channels: seed.channels,
    references: "Referencias en el board del proyecto + carpeta compartida del cliente.",
    deadline: inDays(seed.deadlineInDays),
    priority: seed.priority,
    state: seed.state,
    assigneeId: seed.assigneeId,
    createdById: seed.createdById,
    createdAt: ago(seed.createdDaysAgo),
    roundsIncluded: seed.roundsIncluded,
    roundsUsed: seed.roundsUsed,
    observations:
      seed.priority === "urgent"
        ? "Fecha inamovible: coincide con el evento de lanzamiento."
        : "",
    copy: buildCopy(seed),
    versions: buildVersions(seed),
    markers:
      seed.id === "ORK-2026-0001"
        ? [
            { id: "m1", index: 1, x: 0.5, y: 0.18, body: "Subir el titular una línea, respira poco arriba.", authorId: "u-brandon", createdAt: ago(7), resolved: true },
            { id: "m2", index: 2, x: 0.72, y: 0.82, body: "CTA a un nivel más grande y con el rosa del brandbook.", authorId: "u-camila", createdAt: ago(6), resolved: false },
          ]
        : [],
    comments: buildComments(seed),
    approvals: buildApprovals(seed),
    adjustments: buildAdjustments(seed),
    activity: buildActivity(seed),
  }));
}

/* ------------------------------------------------------------- calendar --- */

export function buildCalendar(requests: Request[]): CalendarEvent[] {
  const events: CalendarEvent[] = requests
    .filter((r) => !["archived", "completed"].includes(r.state))
    .map((r) => ({
      id: `ev-${r.id}`,
      date: r.deadline,
      kind: r.state === "scheduled" || r.state === "published" ? "publish" : "deadline",
      title: r.title,
      clientId: r.clientId,
      requestId: r.id,
    }));

  events.push(
    { id: "ev-marwa-present", date: inDays(9), kind: "meeting", title: "Presentación propuesta 360 · MARWA", clientId: "c-marwa" },
    { id: "ev-kliniu-launch", date: inDays(6), kind: "campaign", title: "Lanzamiento dispensadores Kliniu", clientId: "c-kliniu" },
    { id: "ev-lorigine-review", date: inDays(3), kind: "meeting", title: "Revisión identidad · L'Origine", clientId: "c-lorigine" },
    { id: "ev-totalpars-go", date: inDays(14), kind: "delivery", title: "Entrega marketplace · Totalpars", clientId: "c-totalpars" },
    { id: "ev-weekly", date: inDays(1), kind: "meeting", title: "Weekly de agencia", clientId: "c-marwa" },
    { id: "ev-marwa-shoot", date: ago(6), kind: "delivery", title: "Sesión de fotos FW26", clientId: "c-marwa" },
    { id: "ev-kliniu-kickoff", date: ago(12), kind: "meeting", title: "Kickoff campaña Kliniu", clientId: "c-kliniu" },
    { id: "ev-geu-checkin", date: inDays(11), kind: "meeting", title: "Check-in rebrand · GEU", clientId: "c-geu" },
    { id: "ev-totalpars-content", date: inDays(18), kind: "delivery", title: "Batch de contenido · Totalpars", clientId: "c-totalpars" },
    { id: "ev-lorigine-pack", date: inDays(22), kind: "delivery", title: "Entrega packaging · L'Origine", clientId: "c-lorigine" },
    { id: "ev-kliniu-report", date: inDays(25), kind: "meeting", title: "Reporte de resultados · Kliniu", clientId: "c-kliniu" },
  );
  return events.sort((a, b) => +new Date(a.date) - +new Date(b.date));
}

/* --------------------------------------------------------- notifications --- */

export function buildNotifications(requests: Request[]): Notification[] {
  return [
    { id: "n1", at: hoursAgo(2), kind: "approval", body: "Camila aprobó el copy de ORK-2026-0001", href: "/work/requests/ORK-2026-0001", read: false, forUserId: "u-brandon" },
    { id: "n2", at: hoursAgo(5), kind: "mention", body: "Te mencionaron en un comentario de ORK-2026-0001", href: "/work/requests/ORK-2026-0001", read: false, forUserId: "u-brandon" },
    { id: "n3", at: hoursAgo(9), kind: "status", body: "ORK-2026-0004 pasó a Revisión del cliente", href: "/work/requests/ORK-2026-0004", read: false, forUserId: "u-brandon" },
    { id: "n4", at: ago(1), kind: "adjustment", body: "Cliente pidió ajustes en ORK-2026-0005 (ronda 2/2)", href: "/work/requests/ORK-2026-0005", read: true, forUserId: "u-brandon" },
    { id: "n5", at: ago(1), kind: "deadline", body: "ORK-2026-0004 vence en 2 días", href: "/work/requests/ORK-2026-0004", read: true, forUserId: "u-brandon" },
    { id: "n6", at: ago(2), kind: "assignment", body: "Se te asignó revisar ORK-2026-0006", href: "/work/requests/ORK-2026-0006", read: true, forUserId: "u-brandon" },
  ];
}
