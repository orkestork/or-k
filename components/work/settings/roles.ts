import type { RoleSlug } from "@/types/work/domain";

/** Roles grouped by area, in the order shown in selectors. */
export const ROLE_GROUPS: { label: string; roles: RoleSlug[] }[] = [
  { label: "Dirección", roles: ["super_admin", "agency_director", "creative_director", "art_director", "strategy_director", "operations_director", "finance"] },
  { label: "Cuentas y negocio", roles: ["account_manager", "account_director", "business_developer", "project_manager", "producer"] },
  { label: "Creatividad y contenido", roles: ["copywriter", "content_strategist", "designer", "ux_ui_designer", "illustrator", "motion_designer", "video_editor", "photographer", "artist_3d"] },
  { label: "Marketing y medios", roles: ["community_manager", "media_buyer", "seo_specialist", "data_analyst"] },
  { label: "Tecnología y producto", roles: ["product_manager", "tech_lead", "developer", "frontend_developer", "backend_developer", "mobile_developer", "qa_engineer", "devops"] },
  { label: "Personas", roles: ["hr"] },
  { label: "Externos", roles: ["freelancer", "client"] },
];

/** Area a role belongs to (the group it is listed under). */
export function roleArea(role: RoleSlug): string {
  return ROLE_GROUPS.find((g) => g.roles.includes(role))?.label ?? "Sin área";
}

export const ROLE_LABEL: Record<RoleSlug, string> = {
  super_admin: "Super admin",
  agency_director: "Dirección de agencia",
  creative_director: "Dirección creativa",
  art_director: "Dirección de arte",
  strategy_director: "Estrategia / Planner",
  operations_director: "Operaciones",
  finance: "Finanzas y administración",
  account_manager: "Responsable de cuenta",
  account_director: "Dirección de cuentas",
  business_developer: "Desarrollo de negocio",
  project_manager: "Project manager",
  producer: "Producción",
  copywriter: "Copywriter",
  content_strategist: "Estratega de contenido",
  designer: "Diseño gráfico",
  ux_ui_designer: "Diseño UX/UI",
  illustrator: "Ilustración",
  motion_designer: "Motion graphics",
  video_editor: "Edición de video",
  photographer: "Fotografía / audiovisual",
  artist_3d: "Artista 3D",
  community_manager: "Community manager",
  media_buyer: "Pauta / Media buyer",
  seo_specialist: "SEO / SEM",
  data_analyst: "Analítica y datos",
  product_manager: "Product manager",
  tech_lead: "Tech lead",
  developer: "Desarrollo full stack",
  frontend_developer: "Desarrollo frontend",
  backend_developer: "Desarrollo backend",
  mobile_developer: "Desarrollo móvil",
  qa_engineer: "QA / Testing",
  devops: "DevOps / Infraestructura",
  freelancer: "Freelance",
  hr: "Talento humano",
  client: "Cliente",
};

/** What each role does inside OR-K WORK, in plain words. */
export const ROLE_DUTIES: Record<RoleSlug, string[]> = {
  super_admin: [
    "Acceso total al workspace y a la configuración",
    "Crea, edita y elimina integrantes; asigna roles",
    "Crea clientes, proyectos y solicitudes",
    "Puede aprobar en cualquier etapa de revisión",
  ],
  agency_director: [
    "Administra el equipo: crea integrantes y cambia roles",
    "Crea y edita clientes y proyectos",
    "Supervisa carga de trabajo, deadlines e insights",
    "Puede aprobar en cualquier etapa de revisión",
  ],
  creative_director: [
    "Aprueba o devuelve piezas en Dirección creativa",
    "Define el concepto y la calidad creativa de la agencia",
    "Deja marcas y comentarios sobre las versiones",
  ],
  art_director: [
    "Define la línea visual de cada campaña",
    "Guía al equipo de diseño y revisa las versiones",
    "Deja marcas y comentarios sobre las piezas",
  ],
  strategy_director: [
    "Investiga marca, mercado y audiencias",
    "Construye la estrategia y el insight de cada campaña",
    "Aporta al briefing y al concepto creativo",
  ],
  operations_director: [
    "Organiza procesos, capacidad y tiempos del equipo",
    "Vigila deadlines, carga de trabajo y cuellos de botella",
  ],
  finance: [
    "Controla presupuestos, rondas extra y facturación",
    "Consulta proyectos, clientes e insights",
  ],
  account_manager: [
    "Recibe solicitudes y arma el briefing con el cliente",
    "Aprueba en Revisión de cuenta antes de enviar al cliente",
    "Registra los ajustes que pide el cliente y controla las rondas",
    "Lleva la relación con sus clientes asignados",
  ],
  account_director: [
    "Supervisa a los responsables de cuenta y la salud de cada cuenta",
    "Aprueba entregas importantes antes del cliente",
  ],
  business_developer: [
    "Abre nuevos clientes y oportunidades",
    "Prepara propuestas y cotizaciones",
  ],
  project_manager: [
    "Planifica proyectos, tiempos y responsables",
    "Asigna tareas y mueve piezas en el flujo",
    "Hace seguimiento a deadlines y riesgos",
  ],
  producer: [
    "Coordina rodajes, sesiones de fotos y proveedores",
    "Gestiona logística y presupuestos de producción",
  ],
  copywriter: [
    "Escribe el copy: concepto, headline, caption y CTA",
    "Revisa el copy sobre el diseño en Revisión de copy",
    "Comenta y deja marcas sobre las piezas",
  ],
  content_strategist: [
    "Planea parrillas y líneas editoriales",
    "Define formatos y mensajes por canal",
  ],
  designer: [
    "Diseña las piezas y sube cada versión (V1, V2…)",
    "Atiende las marcas y ajustes de diseño",
    "Usa la biblioteca de assets de cada cliente",
  ],
  ux_ui_designer: [
    "Diseña interfaces, flujos y prototipos",
    "Sube versiones y atiende ajustes de producto digital",
  ],
  illustrator: [
    "Crea ilustraciones y recursos gráficos a medida",
    "Sube versiones y atiende ajustes",
  ],
  motion_designer: [
    "Produce piezas animadas",
    "Sube versiones y atiende ajustes de motion",
  ],
  video_editor: [
    "Edita y postproduce video",
    "Sube versiones y atiende ajustes de edición",
  ],
  photographer: [
    "Realiza sesiones de foto y video",
    "Entrega material a la biblioteca de assets",
  ],
  artist_3d: [
    "Modela, texturiza y renderiza en 3D",
    "Sube versiones y atiende ajustes",
  ],
  community_manager: [
    "Programa y publica las piezas aprobadas",
    "Mueve las solicitudes a Programado y Publicado",
    "Gestiona la comunidad en redes",
  ],
  media_buyer: [
    "Planea e implementa la pauta digital",
    "Reporta inversión y resultados de campañas",
  ],
  seo_specialist: [
    "Optimiza posicionamiento orgánico y campañas de búsqueda",
    "Sugiere ajustes de contenido y keywords",
  ],
  data_analyst: [
    "Mide resultados y arma reportes",
    "Alimenta los insights del equipo y del cliente",
  ],
  product_manager: [
    "Define el producto, prioridades y roadmap",
    "Escribe requerimientos y acepta entregables",
  ],
  tech_lead: [
    "Define la arquitectura y revisa el código",
    "Guía al equipo de desarrollo",
  ],
  developer: [
    "Construye entregables digitales (landings, web, plataformas)",
    "Sube versiones y atiende ajustes técnicos",
  ],
  frontend_developer: [
    "Construye interfaces web a partir del diseño",
    "Sube versiones y atiende ajustes técnicos",
  ],
  backend_developer: [
    "Construye APIs, bases de datos e integraciones",
    "Atiende ajustes técnicos",
  ],
  mobile_developer: [
    "Construye apps iOS / Android",
    "Sube builds y atiende ajustes",
  ],
  qa_engineer: [
    "Prueba entregables antes de enviarlos",
    "Reporta errores y valida correcciones",
  ],
  devops: [
    "Gestiona despliegues, servidores y dominios",
    "Vigila la estabilidad de los productos en línea",
  ],
  hr: [
    "Lleva la ficha de cada empleado: contrato, seguridad social y documentos",
    "Aprueba vacaciones y permisos; controla saldos de días",
    "Sigue vencimientos de contratos, cumpleaños y aniversarios",
  ],
  freelancer: [
    "Trabaja en las solicitudes que se le asignen",
    "Sube versiones y comenta",
  ],
  client: [
    "Ve solo las piezas de su empresa en el portal",
    "Aprueba o pide ajustes en Revisión del cliente",
    "Comenta y deja marcas sobre las versiones",
  ],
};
