"use client";

import { useSyncExternalStore } from "react";

/**
 * Site language. "mix" is the original copy (Spanish with English brand terms);
 * "es" forces everything to Spanish and "en" everything to English.
 */
export type Lang = "mix" | "es" | "en";

const STORAGE_KEY = "ork-lang";
const listeners = new Set<() => void>();
let current: Lang = "mix";
let loaded = false;

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  // ?lang=es|en wins (shareable links), then the visitor's last choice.
  const fromUrl = new URLSearchParams(window.location.search).get("lang");
  const saved = fromUrl ?? window.localStorage.getItem(STORAGE_KEY);
  if (saved === "es" || saved === "en") current = saved;
}

export function getLang(): Lang {
  load();
  return current;
}

export function setLang(lang: Lang) {
  current = lang;
  if (typeof window !== "undefined") {
    if (lang === "mix") window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, lang);
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Current language; always "mix" during SSR and hydration so markup matches. */
export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getLang, () => "mix");
}

const norm = (text: string) => text.replace(/\s+/g, " ").trim();

// Spanish → English.
const EN_RAW: Record<string, string> = {
  // Loader, sound, nav
  "Cargando O R-K": "Loading O R-K",
  "Ideas tomando forma": "Ideas taking shape",
  "Activar ambiente sonoro": "Turn on ambient sound",
  "Desactivar ambiente sonoro": "Turn off ambient sound",
  "Sonido activo": "Sound on",
  "Sonido inactivo": "Sound off",
  "O R-K inicio": "O R-K home",
  "Explora UTS Method": "Explore UTS Method",
  "Trabajo": "Work",
  "Método UTS": "UTS Method",
  "Nosotros": "About us",
  "Servicios": "Services",
  "Conversemos": "Let's talk",
  "Iniciar sesión": "Log in",
  "Navegación principal": "Main navigation",
  "Idioma": "Language",
  // Hero
  "No somos espectadores del cambio.": "We are not spectators of change.",
  "No somos": "We are not",
  "espectadores": "spectators",
  "del cambio.": "of change.",
  "Estrategia, creatividad y tecnología en la misma mesa para entender tu negocio, transformarlo y hacerlo crecer.":
    "Strategy, creativity and technology at the same table to understand your business, transform it and make it grow.",
  "Desplázate para explorar": "Scroll to explore",
  "ESTRATEGIA": "STRATEGY",
  "DISEÑO": "DESIGN",
  "TECNOLOGÍA": "TECHNOLOGY",
  "CULTURA": "CULTURE",
  // UTS section
  "Una lógica para trabajar sobre el negocio completo.": "One logic to work on the whole business.",
  "Eje Z · Profundidad": "Z axis · Depth",
  "Eje X · Transversalidad": "X axis · Transversality",
  "Eje Y · Verticalidad": "Y axis · Verticality",
  "Entendemos cómo funciona realmente el negocio: estrategia, estructura, procesos, personas, cultura, tecnología, datos, marca, ventas y oportunidades.":
    "We understand how the business really works: strategy, structure, processes, people, culture, technology, data, brand, sales and opportunities.",
  "Convertimos el diagnóstico en capacidades: sistemas, automatizaciones, integraciones, plataformas, datos, herramientas internas e inteligencia artificial.":
    "We turn the diagnosis into capabilities: systems, automations, integrations, platforms, data, internal tools and artificial intelligence.",
  "Convertimos la transformación en crecimiento: creatividad, marketing, performance, ventas, CRM, e-commerce, canales y analítica.":
    "We turn transformation into growth: creativity, marketing, performance, sales, CRM, e-commerce, channels and analytics.",
  "Qué trabajamos": "What we work on",
  "Estrategia": "Strategy",
  "Estructura": "Structure",
  "Procesos": "Processes",
  "Personas": "People",
  "Cultura": "Culture",
  "Datos": "Data",
  "Sistemas": "Systems",
  "Automatizaciones": "Automations",
  "Integraciones": "Integrations",
  "Plataformas": "Platforms",
  "Herramientas internas": "Internal tools",
  "Inteligencia artificial": "Artificial intelligence",
  "Creatividad": "Creativity",
  "Ventas y CRM": "Sales & CRM",
  "Analítica": "Analytics",
  "Ver la fase": "See the phase",
  // Sectors
  "Sectores en los que trabajamos": "Industries we work in",
  "Trabajamos con": "We work with",
  "MODA": "FASHION",
  "ENTRETENIMIENTO": "ENTERTAINMENT",
  "EDUCACIÓN": "EDUCATION",
  "SALUD": "HEALTH",
  "HOSPITALIDAD": "HOSPITALITY",
  "MOVILIDAD": "MOBILITY",
  "CONSUMO": "CONSUMER",
  // Reel and street
  "Reel de O R-K": "O R-K reel",
  "Ver el reel": "Watch the reel",
  "Cerrar reel": "Close reel",
  "La marca en la calle": "The brand on the street",
  "Comercial TV": "TV commercial",
  "Producción audiovisual": "Audiovisual production",
  "Comerciales para televisión y digital de marcas que se ven todos los días.":
    "TV and digital commercials for brands people see every day.",
  // Work
  "03 / Trabajo seleccionado": "03 / Selected work",
  "Ideas en acción.": "Ideas in action.",
  "Ideas en": "Ideas in",
  "acción.": "action.",
  "Una selección de marcas, plataformas y experiencias que construimos con equipos que quieren crecer.":
    "A selection of brands, platforms and experiences we built with teams that want to grow.",
  "Estrategia de marca": "Brand strategy",
  "Identidad visual": "Visual identity",
  "Identidad de marca": "Brand identity",
  "Dirección visual": "Visual direction",
  "Identidad corporativa": "Corporate identity",
  "Sistema visual": "Visual system",
  "Diseño de marca": "Brand design",
  "Plataforma digital": "Digital platform",
  "Sitio web": "Website",
  "Films para redes": "Social films",
  "Mascota": "Mascot",
  "Tienda y catálogo": "Store & catalog",
  "Arquitectura de marca": "Brand architecture",
  "Ecosistema web": "Web ecosystem",
  "Mascota y contenido": "Mascot & content",
  "Identidad": "Identity",
  "UX de búsqueda": "Search UX",
  "Tienda web": "Online store",
  "App móvil": "Mobile app",
  "Experiencia 3D": "3D experience",
  "Agente con IA": "AI agent",
  "Web academia": "Academy website",
  "Clases en vivo": "Live classes",
  "Producto": "Product",
  "Línea de producto": "Product line",
  "Puntos Kliniu": "Kliniu Points",
  "Servicio": "Service",
  "Sistema de marca": "Brand system",
  "Bus rayos X": "X-ray bus",
  "Categorías": "Categories",
  "Catálogo global": "Global catalog",
  "Agente Drokex": "Drokex agent",
  "Academia de música y producción en Bogotá. Construimos su marca, el sitio web de la academia y las piezas audiovisuales para comunicar «Play your talent».":
    "A music and production academy in Bogotá. We built its brand, the academy website and the audiovisual pieces to communicate “Play your talent”.",
  "Fórmula capilar tricoactivadora. Dirigimos la imagen del producto, diseñamos su tienda web y produjimos los films para redes.":
    "A tri-activating hair formula. We art-directed the product imagery, designed its online store and produced the social films.",
  "Dispensadores y soluciones de limpieza. Creamos el nombre, la identidad, la mascota y una tienda con catálogo y puntos de venta.":
    "Dispensers and cleaning solutions. We created the name, the identity, the mascot and a store with a catalog and points of sale.",
  "Seis unidades de negocio bajo una sola marca. Diseñamos el sistema visual, el ecosistema web multimarca y a Gus, su mascota.":
    "Six business units under one brand. We designed the visual system, the multi-brand web ecosystem and Gus, its mascot.",
  "Repuestos para transporte masivo, de carga y maquinaria. Hicimos su identidad, una búsqueda por sistema del bus y la tienda web y móvil.":
    "Spare parts for mass transit, freight and machinery. We made its identity, a search by bus system and the web and mobile store.",
  "Catálogo digital para que las empresas de LATAM vendan al mundo. Creamos la marca, la plataforma con globo interactivo y un agente 3D.":
    "A digital catalog so LATAM companies can sell to the world. We created the brand, the platform with an interactive globe and a 3D agent.",
  // Case page
  "Volver": "Back",
  "Cliente": "Client",
  "Año": "Year",
  "Sigue bajando": "Keep scrolling",
  "Siguiente proyecto": "Next project",
  "Ver en vivo": "View live",
  "Ver proyecto en vivo": "View live project",
  "Ver": "View",
  // Posters and region
  "Pósters de O R-K en la calle": "O R-K posters on the street",
  "Tres pósters de O R-K sobre un muro de concreto: Make brands useful. Boring is expensive. Something is about to surface.":
    "Three O R-K posters on a concrete wall: Make brands useful. Boring is expensive. Something is about to surface.",
  "Presencia de O R-K en Latinoamérica": "O R-K across Latin America",
  "Sin fronteras": "Without borders",
  "México": "Mexico",
  "Perú": "Peru",
  "República Dominicana": "Dominican Republic",
  // Contact
  "Hagámoslo inevitable.": "Let's make it inevitable.",
  "¿Tienes algo en mente?": "Got something in mind?",
  "Un proyecto nuevo": "A new project",
  "Una colaboración": "A collaboration",
  "Una idea sin resolver": "An unsolved idea",
  "Descubre si tu empresa está preparada": "Find out if your company is ready",
  // How it works overlay
  "Cómo funciona O R-K": "How O R-K works",
  "Cerrar": "Close",
  "Volver al inicio": "Back to start",
  "Siguiente escena": "Next scene",
  "Conoce nuestro equipo": "Meet our team",
  "Una forma de avanzar juntos / UTS by O R-K": "A way to move forward together / UTS by O R-K",
  "UTS es nuestra manera de acompañar a una empresa desde la claridad hasta el crecimiento. Primero entendemos contigo, después transformamos lo necesario y, cuando todo está listo, escalamos lo que funciona.":
    "UTS is how we guide a company from clarity to growth. First we understand with you, then we transform what's needed and, when everything is ready, we scale what works.",
  "Nuestra regla": "Our rule",
  "No cambiamos lo que aún no entendemos. No hacemos crecer algo que todavía no está preparado.":
    "We don't change what we don't yet understand. We don't grow something that isn't ready yet.",
  "Descubre cómo funciona": "Discover how it works",
  "Desplázate para continuar · También puedes usar el trackpad": "Scroll to continue · You can also use the trackpad",
  "Arrastra para girar": "Drag to rotate",
  "Conversemos sobre tu empresa": "Let's talk about your company",
  "Tu empresa es una sola": "Your company is one whole",
  "Todo está": "Everything is",
  "conectado.": "connected.",
  "Por eso la miramos completa, no por partes.": "That's why we look at it as a whole, not in parts.",
  "Miramos hacia adentro para entender qué está pasando de verdad.": "We look inward to understand what is really happening.",
  "Conectamos y mejoramos lo que necesita cambiar.": "We connect and improve what needs to change.",
  "Llevamos las nuevas capacidades a un nivel más alto.": "We take the new capabilities to a higher level.",
  "Entender antes": "Understand before",
  "de cambiar.": "changing.",
  "Nos sentamos contigo, hacemos las preguntas correctas y conocemos la empresa que existe hoy.":
    "We sit down with you, ask the right questions and get to know the company that exists today.",
  "Quiénes hacen que las cosas pasen y qué necesitan.": "Who makes things happen and what they need.",
  "Cómo se organizan, deciden y trabajan juntos.": "How they organize, decide and work together.",
  "Operación": "Operations",
  "Qué fluye, qué se frena y dónde hay oportunidades.": "What flows, what stalls and where the opportunities are.",
  "Una transformación sólida empieza por entender la realidad.": "A solid transformation starts by understanding reality.",
  "Transformar la claridad": "Turning clarity",
  "en capacidad.": "into capability.",
  "Convertimos lo que entendimos en soluciones que ayudan a tu equipo a trabajar mejor.":
    "We turn what we understood into solutions that help your team work better.",
  "La tecnología entra cuando sabemos qué problema debe resolver.": "Technology comes in once we know what problem it must solve.",
  "Ahora sí,": "Now,",
  "a crecer.": "let's grow.",
  "Alineamos a toda la organización para convertir las nuevas capacidades en resultados.":
    "We align the whole organization to turn the new capabilities into results.",
  "No se trata solo de vender más. Se trata de estar listo para crecer bien.":
    "It's not just about selling more. It's about being ready to grow well.",
  "¿Hasta dónde quieres llevar tu": "How far do you want to take your",
  "empresa?": "company?",
  "Si entiendes tu realidad, puedes transformarla. Y cuando estás preparado, puedes crecer sin perder el control.":
    "If you understand your reality, you can transform it. And when you are ready, you can grow without losing control.",
  "Entender": "Understand",
  "Transformar": "Transform",
  "Crecer": "Grow",
  "Primero entendemos contigo. Después transformamos juntos. Y entonces, escalamos lo que funciona.":
    "First we understand with you. Then we transform together. And then, we scale what works.",
  // Team
  "Nosotros / El equipo": "About us / The team",
  "Personas detrás": "The people behind",
  "de la estrategia.": "the strategy.",
  "Estrategia, creatividad y tecnología trabajando en la misma mesa.": "Strategy, creativity and technology working at the same table.",
  "Estratega de negocios y arquitecto de transformación empresarial con más de 18 años de experiencia en estrategia, operaciones, innovación, tecnología y desarrollo comercial en Latinoamérica.\n\nComo Founding Partner de O R-K, integra personas, procesos, tecnología e inteligencia artificial para construir organizaciones más conectadas, eficientes y preparadas para crecer. Es creador de ORCA Sphere™, un modelo que entiende las empresas como sistemas interdependientes, permitiendo alinear estrategia, operación y capacidades para generar resultados medibles y sostenibles.":
    "Business strategist and architect of business transformation with more than 18 years of experience in strategy, operations, innovation, technology and commercial development in Latin America.\n\nAs Founding Partner of O R-K, he brings together people, processes, technology and artificial intelligence to build organizations that are more connected, efficient and ready to grow. He is the creator of ORCA Sphere™, a model that understands companies as interdependent systems, aligning strategy, operations and capabilities to deliver measurable, sustainable results.",
  "Empresaria nicaragüense e ingeniera industrial con más de 15 años de experiencia en el desarrollo y consolidación de marcas y proyectos empresariales en distintos países de Latinoamérica. Su trayectoria se ha enfocado en la optimización de procesos, la gestión organizacional, logística y financiera, así como en el fortalecimiento de estructuras empresariales con proyección regional.":
    "Nicaraguan entrepreneur and industrial engineer with more than 15 years of experience developing and consolidating brands and business projects across Latin America. Her career has focused on process optimization, organizational, logistics and financial management, and on strengthening business structures with regional reach.",
  "Empresario colombiano con más de 25 años de trayectoria en la creación y desarrollo de marcas, proyectos empresariales y oportunidades comerciales en distintos países de Latinoamérica. Su experiencia se ha construido principalmente a partir de iniciativas propias, liderando negocios desde su concepción con inversión y riesgo empresarial directo, combinando visión empresarial, creatividad y estrategias de marketing para el desarrollo y posicionamiento de proyectos.":
    "Colombian entrepreneur with more than 25 years creating and developing brands, business projects and commercial opportunities across Latin America. His experience has been built mainly on his own ventures, leading businesses from conception with direct investment and business risk, combining business vision, creativity and marketing strategy to develop and position projects.",
  "Empresario colombiano con más de 30 años de experiencia en comunicación estratégica, desarrollo de marca y marketing. Es fundador de la reconocida agencia Audiovisual Huella Digital en Colombia, desde donde ha liderado proyectos para importantes compañías y organizaciones como Grupo Bolívar, MetLife, Alpina, Mercedes-Benz, Homecenter, DHL, Tetra Pak, Oracle, Avianca, PepsiCo, entre otras marcas de alto reconocimiento.":
    "Colombian entrepreneur with more than 30 years of experience in strategic communication, brand development and marketing. He founded the well-known audiovisual agency Huella Digital in Colombia, where he has led projects for major companies and organizations such as Grupo Bolívar, MetLife, Alpina, Mercedes-Benz, Homecenter, DHL, Tetra Pak, Oracle, Avianca and PepsiCo, among other leading brands.",
  "Diseñador Gráfico Publicitario e Ingeniero de Software con más de 10 años de experiencia en medios digitales, creatividad y tecnología.\n\nSu trayectoria integra dirección creativa, branding, estrategia digital, desarrollo web, aplicaciones móviles, UI/UX, automatización e inteligencia artificial, liderando proyectos desde la conceptualización hasta su implementación.\n\nSu enfoque conecta creatividad, negocio y tecnología para desarrollar ideas que no solo generan impacto visual, sino que se convierten en productos, plataformas y experiencias con valor real.":
    "Advertising graphic designer and software engineer with more than 10 years of experience in digital media, creativity and technology.\n\nHis work spans creative direction, branding, digital strategy, web development, mobile apps, UI/UX, automation and artificial intelligence, leading projects from concept to implementation.\n\nHis approach connects creativity, business and technology to build ideas that don't just make a visual impact, but become products, platforms and experiences with real value.",
};

// English → Spanish (the English terms used in the original mixed copy).
const ES_RAW: Record<string, string> = {
  "Explora UTS Method": "Explora el Método UTS",
  "Business innovation & technology · Bogotá": "Innovación de negocios y tecnología · Bogotá",
  "Business innovation & technology.": "Innovación de negocios y tecnología.",
  "O R-K — Business Innovation & Technology": "O R-K — Innovación de negocios y tecnología",
  "01 / UTS METHOD": "01 / MÉTODO UTS",
  "UTS by O R-K": "UTS por O R-K",
  "Understand": "Entender",
  "Transform": "Transformar",
  "Scale": "Escalar",
  "Performance": "Rendimiento",
  "E-commerce": "Comercio electrónico",
  "RETAIL": "COMERCIO",
  "STARTUPS": "EMPRENDIMIENTOS",
  "Designed by Magnific": "Diseñado con Magnific",
  "Boring is expensive.": "Lo aburrido sale caro.",
  "Make brands useful.": "Haz marcas útiles.",
  "Tres pósters de O R-K sobre un muro de concreto: Make brands useful. Boring is expensive. Something is about to surface.":
    "Tres pósters de O R-K sobre un muro de concreto: Haz marcas útiles. Lo aburrido sale caro. Algo está por emerger.",
  "Method.": "Método.",
  "Business Director": "Director de Negocios",
  "Financial Director": "Directora Financiera",
  "Executive Director": "Director Ejecutivo",
  "Commercial Director": "Director Comercial",
  "Technology & Creativity Director": "Director de Tecnología y Creatividad",
  "Films para redes": "Videos para redes",
  "UX de búsqueda": "Experiencia de búsqueda",
  "App móvil": "Aplicación móvil",
  "Estratega de negocios y arquitecto de transformación empresarial con más de 18 años de experiencia en estrategia, operaciones, innovación, tecnología y desarrollo comercial en Latinoamérica.\n\nComo Founding Partner de O R-K, integra personas, procesos, tecnología e inteligencia artificial para construir organizaciones más conectadas, eficientes y preparadas para crecer. Es creador de ORCA Sphere™, un modelo que entiende las empresas como sistemas interdependientes, permitiendo alinear estrategia, operación y capacidades para generar resultados medibles y sostenibles.":
    "Estratega de negocios y arquitecto de transformación empresarial con más de 18 años de experiencia en estrategia, operaciones, innovación, tecnología y desarrollo comercial en Latinoamérica.\n\nComo socio fundador de O R-K, integra personas, procesos, tecnología e inteligencia artificial para construir organizaciones más conectadas, eficientes y preparadas para crecer. Es creador de ORCA Sphere™, un modelo que entiende las empresas como sistemas interdependientes, permitiendo alinear estrategia, operación y capacidades para generar resultados medibles y sostenibles.",
};

// Parametrised strings (aria-labels built from data).
const EN_PATTERNS: [RegExp, string][] = [
  [/^Ver lo que hicimos con (.+)$/, "See what we did with $1"],
  [/^Abrir faceta (.+)$/, "Open facet $1"],
  [/^Piezas de (.+)$/, "$1 pieces"],
  [/^Siguiente proyecto: (.+)$/, "Next project: $1"],
];
const ES_PATTERNS: [RegExp, string][] = [
  [/^Abrir faceta Understand$/, "Abrir faceta Entender"],
  [/^Abrir faceta Transform$/, "Abrir faceta Transformar"],
  [/^Abrir faceta Scale$/, "Abrir faceta Escalar"],
];

function build(raw: Record<string, string>) {
  const map = new Map<string, string>();
  for (const [key, value] of Object.entries(raw)) map.set(norm(key), value);
  return map;
}

const DICTS = { en: build(EN_RAW), es: build(ES_RAW) };
const PATTERNS = { en: EN_PATTERNS, es: ES_PATTERNS };
const SEPARATORS = /(\s*[•·/]\s*)/;

/** Translate one string, or return undefined when it should stay as is. */
export function lookup(text: string, lang: Lang): string | undefined {
  if (lang === "mix") return undefined;
  const key = norm(text);
  if (!key) return undefined;
  const dict = DICTS[lang];
  const hit = dict.get(key);
  if (hit !== undefined) return hit;
  for (const [pattern, replacement] of PATTERNS[lang]) {
    if (pattern.test(key)) return key.replace(pattern, replacement);
  }
  // Compound labels such as "Naming • Identidad de marca" or "Z · Understand".
  if (SEPARATORS.test(key)) {
    let changed = false;
    const parts = key.split(SEPARATORS).map((part) => {
      if (SEPARATORS.test(part) && part.trim().length <= 1) return part;
      const value = dict.get(part.trim());
      if (value === undefined) return part;
      changed = true;
      return value;
    });
    if (changed) return parts.join("");
  }
  return undefined;
}

/** Translate or fall back to the original text. */
export function tr(text: string, lang: Lang): string {
  return lookup(text, lang) ?? text;
}
