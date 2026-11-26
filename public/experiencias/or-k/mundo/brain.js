// Local "brain" for the O R-K agents: used when the AI endpoint is not configured or fails.
// Understands intents, the visitor's industry and which service they need, keeps a little
// memory per agent and varies its phrasing. It never invents prices, clients or results.

const SVC = {
  aldea: {
    agent: 'Sofía', name: 'Tecnología y desarrollo',
    what: 'diseñamos y desarrollamos plataformas, aplicaciones y herramientas digitales a la medida para optimizar procesos e integrar la operación',
    items: ['plataformas internas a la medida', 'aplicaciones web y móviles', 'integraciones entre tus sistemas (ERP, CRM, tienda, facturación)', 'automatización de tareas repetitivas'],
    fit: (b) => `En ${b} podríamos centralizar pedidos, inventario y clientes en una sola plataforma y automatizar lo que hoy se hace a mano`,
    ask: '¿Qué tarea de tu operación te quita más tiempo hoy?',
  },
  molino: {
    agent: 'Mateo', name: 'Marketing y performance',
    what: 'diseñamos estrategias de marketing digital con campañas en Google Ads y Meta, embudos de conversión y seguimiento de KPIs',
    items: ['campañas en Google Ads y Meta', 'embudos de conversión y landing pages', 'medición de conversiones y costo por cliente', 'optimización continua con datos'],
    fit: (b) => `Para ${b} armaríamos campañas enfocadas en tus clientes ideales y mediríamos cuántas visitas terminan en ventas, no solo los clics`,
    ask: '¿Hoy inviertes en publicidad digital o arrancamos desde cero?',
  },
  bosque: {
    agent: 'Valentina', name: 'Comunidad y contenido',
    what: 'creamos estrategias de redes sociales y contenido, gestionamos comunidades y medimos el engagement',
    items: ['estrategia y calendario de contenidos', 'producción de piezas para redes', 'gestión de comunidad y respuestas', 'medición de engagement'],
    fit: (b) => `Para ${b} crearíamos contenido útil y conversaciones que hagan que tu comunidad participe, y mediríamos qué formatos funcionan`,
    ask: '¿En qué redes está hoy tu marca?',
  },
  lago: {
    agent: 'Diego', name: 'Diseño corporativo',
    what: 'creamos la identidad visual y todo el ecosistema de comunicación de tu marca: piezas impresas y digitales, catálogos, brochures y material comercial',
    items: ['sistema visual de marca', 'catálogos y brochures', 'presentaciones comerciales', 'piezas impresas y digitales coherentes'],
    fit: (b) => `Para ${b} definiríamos un sistema visual para que catálogo, web y redes se vean como una sola marca`,
    ask: '¿Ya tienes logo y manual de marca, o empezamos por ahí?',
  },
  torre: {
    agent: 'Camila', name: 'Plataformas web',
    what: 'diseñamos y desarrollamos sitios web, tiendas en línea y portales fáciles de usar, conectados con tu operación',
    items: ['sitios web corporativos', 'tiendas en línea (e-commerce)', 'portales y áreas de clientes', 'buscadores y filtros de catálogo'],
    fit: (b) => `Para ${b} haríamos una web rápida y clara, con catálogo, búsqueda y contacto directo, conectada con tu operación`,
    ask: '¿Ya tienes sitio web o sería el primero?',
  },
  ruinas: {
    agent: 'Andrés', name: 'Analítica y KPIs',
    what: 'definimos indicadores, conectamos tus fuentes de datos y construimos tableros para decidir con información confiable',
    items: ['definición de KPIs con el equipo', 'tableros conectados a tus datos', 'reportes automáticos', 'una sola fuente de verdad para todas las áreas'],
    fit: (b) => `Para ${b} definiríamos los indicadores que de verdad importan y un tablero que se actualice solo`,
    ask: '¿Dónde guardas hoy tus datos de ventas y clientes?',
  },
  helada: {
    agent: 'Lucía', name: 'Producción audiovisual',
    what: 'producimos video, fotografía y animación para campañas, pensados desde el rodaje para cada formato',
    items: ['videos para campañas y lanzamientos', 'formatos verticales para redes (reels)', 'fotografía de producto y marca', 'animación y motion graphics'],
    fit: (b) => `Para ${b} planearíamos un rodaje con versiones para la web y para redes, así cada formato se ve bien`,
    ask: '¿Es para un lanzamiento, para redes o para tu web?',
  },
  volcan: {
    agent: 'Martín', name: 'Branding e identidad',
    what: 'definimos el posicionamiento de tu marca y construimos una identidad visual que la diferencie',
    items: ['estrategia y posicionamiento', 'identidad visual y logotipo', 'tono de comunicación', 'manual de marca'],
    fit: (b) => `Para ${b} empezaríamos por entender a tu audiencia y lo que te hace único, y desde ahí construiríamos la identidad`,
    ask: '¿Tu marca es nueva o quieres renovar una que ya existe?',
  },
};
const COMPANY = 'O R-K es un equipo de innovación de negocio y tecnología. Trabajamos con el método UTS: entender tu negocio, transformarlo y escalarlo';
const PROCESS = 'Trabajamos en cinco pasos: entendemos tu negocio, diseñamos la solución, la construimos por etapas que puedes probar, la conectamos con tus sistemas y equipo, y seguimos mejorando con datos';

// which service a topic belongs to
const TOPICS = [
  ['torre', /\b(web|p[aá]gina|sitio|landing|tienda (en l[ií]nea|online|virtual|digital)|\w*commerce|carrito|wordpress|shopify|dominio|vender (en l[ií]nea|online|por internet)|venta online|marketplace)\b/i],
  ['aldea', /\b(app|aplicaci[oó]n|software|sistema|plataforma|automatiz|integra|erp|crm|inventario|facturaci[oó]n|base de datos|programa|desarroll|inteligencia artificial|\bia\b|chatbot|bot|excel|a mano|manual)\b/i],
  ['molino', /\b(anuncio|publicidad|ads|google|meta|facebook ads|campa[ñn]a|leads?|clientes nuevos|vender m[aá]s|ventas|conversi[oó]n|seo|sem|pauta|tr[aá]fico)\b/i],
  ['bosque', /\b(redes|instagram|tiktok|facebook|linkedin|contenido|posts?|publicaciones|seguidores|comunidad|community|influenc)\b/i],
  ['volcan', /\b(logo|logotipo|marca|branding|identidad|nombre|naming|posicionamiento|rebranding)\b/i],
  ['lago', /\b(cat[aá]logo|brochure|folleto|papeler[ií]a|presentaci[oó]n|tarjetas|empaque|etiqueta|dise[ñn]o gr[aá]fico|impres)\b/i],
  ['helada', /\b(video|v[ií]deo|foto|fotograf|rodaje|reels?|animaci[oó]n|motion|filmaci[oó]n|comercial|spot)\b/i],
  ['ruinas', /\b(datos|dashboard|tablero|kpis?|m[eé]tricas|indicadores|reportes?|anal[ií]tica|power ?bi)\b/i],
];
const INDUSTRIES = [
  [/restaurante|caf[eé]|cafeter[ií]a|comida|panader[ií]a|bar\b|pizzer[ií]a|cocina/i, 'tu restaurante'],
  [/tienda|almac[eé]n|boutique|ropa|moda|zapato|retail|minimarket|supermercado/i, 'tu tienda'],
  [/cl[ií]nica|consultorio|salud|m[eé]dic|odont|dental|veterin|farmacia|hospital/i, 'tu clínica'],
  [/inmobiliaria|finca ra[ií]z|bienes ra[ií]ces|arriendo|propiedades/i, 'tu inmobiliaria'],
  [/colegio|universidad|academia|escuela|educaci[oó]n|cursos|instituto/i, 'tu institución educativa'],
  [/hotel|hostal|turismo|viajes|agencia de viajes/i, 'tu hotel'],
  [/ferreter[ií]a|distribuidora|mayorista|importadora|proveedor/i, 'tu distribuidora'],
  [/belleza|spa|peluquer[ií]a|est[eé]tica|barber[ií]a|u[ñn]as|maquillaje/i, 'tu negocio de belleza'],
  [/abogad|consultor[ií]a|contador|contable|asesor[ií]a|firma/i, 'tu firma'],
  [/f[aá]brica|manufactura|industria|planta|producci[oó]n industrial/i, 'tu empresa industrial'],
  [/transporte|log[ií]stica|env[ií]os|mensajer[ií]a|domicilios/i, 'tu empresa de logística'],
  [/gimnasio|gym|fitness|entrenamiento|deporte/i, 'tu gimnasio'],
  [/constructora|construcci[oó]n|arquitect/i, 'tu constructora'],
  [/startup|emprendimiento|emprend/i, 'tu emprendimiento'],
];
const has = (re, t) => re.test(t);
const choose = (mem, key, options) => {           // vary phrasing, never the same twice in a row
  const last = mem.lastPick?.[key]; const pool = options.length > 1 ? options.filter(o => o !== last) : options;
  const o = pool[Math.floor(Math.random() * pool.length)]; (mem.lastPick ??= {})[key] = o; return o;
};
const list = (a) => a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1];


// what the visitor wants to sell, e.g. "vender muebles" → "muebles"
const STOP = /\s+(en|por|a|para|con|de forma|online|en l[ií]nea|y|que|desde|al|del)\b.*$/i;
function productOf(t) {
  const m = t.match(/\bvend(?:er|o|emos|en|a)\s+(?:mis |nuestros |nuestras |los |las |unos |unas |el |la )?([a-záéíóúñü ]{3,40})/i);
  if (!m) return null;
  const p = m[1].replace(STOP, '').trim();
  return p && !/^(m[aá]s|mejor|bien|online|en l[ií]nea|por internet)$/.test(p) ? p : null;
}
// filters that make sense for common catalogues
const FILTERS = [
  [/mueble|sof[aá]|sala|comedor|colch[oó]n|decoraci/i, 'ambiente, material, medidas y color'],
  [/ropa|camis|vestido|zapat|calzado|moda|tenis/i, 'talla, color, estilo y temporada'],
  [/comida|postre|torta|pastel|caf[eé]|men[uú]|almuerzo/i, 'categoría del menú, horario y zona de domicilio'],
  [/joya|accesorio|reloj|bolso/i, 'material, estilo y rango de precio'],
  [/repuesto|herramienta|ferreter|tornill|pieza/i, 'referencia, marca y compatibilidad'],
  [/cosm[eé]tic|maquillaje|belleza|crema|perfume/i, 'tipo de piel, marca y presentación'],
  [/libro|curso|clase/i, 'tema, nivel y formato'],
];
function sellPitch(id, product) {
  const f = FILTERS.find(([re]) => re.test(product))?.[1] ?? 'categoría, características y precio';
  switch (id) {
    case 'torre': return `¡Me encanta! Para vender ${product} en línea haríamos una tienda con catálogo por categorías, fotos grandes, filtros por ${f}, carrito, pagos en línea y cálculo de envío, conectada con tu inventario. ¿Hoy vendes en tienda física, por redes o es tu primer canal?`;
    case 'molino': return `Para vender ${product} armaríamos campañas en Google y Meta dirigidas a quien ya está buscando ${product}, con una landing pensada para convertir, y mediríamos cuánto te cuesta cada venta. ¿Ya tienes tienda en línea a donde llevar ese tráfico?`;
    case 'aldea': return `Para vender ${product} podemos conectar la tienda, el inventario y los pedidos en una sola plataforma, para que no tengas que actualizar nada a mano. ¿Hoy cómo llevas el inventario?`;
    case 'bosque': return `Para vender ${product} por redes crearíamos contenido que muestre el producto en uso, catálogo en Instagram y una comunidad que pregunte y comparta. ¿Qué red usas más hoy?`;
    case 'helada': return `Para vender ${product} haríamos fotografía de producto y videos cortos en formato vertical para redes y horizontal para la web. ¿Tienes ya fotos de tu catálogo?`;
    case 'volcan': return `Antes de vender ${product}, vale la pena definir qué hace única a tu marca frente a la competencia. ¿Tu marca ya tiene nombre y logo?`;
    case 'lago': return `Para vender ${product} diseñaríamos un catálogo y piezas comerciales coherentes con tu marca, en digital e impreso. ¿Ya tienes catálogo?`;
    case 'ruinas': return `Para vender ${product} definiríamos los indicadores clave (ventas, conversión, ticket promedio, productos más vendidos) en un tablero que se actualice solo. ¿Dónde registras hoy tus ventas?`;
    default: return `¡Buena idea! Para vender ${product} en línea te sirve el stand de Plataformas web (Camila), y para atraer compradores la de Marketing (Mateo). ¿Ya tienes tienda en línea?`;
  }
}

export function think(id, raw, mem = {}) {
  const text = raw.trim(), t = text.toLowerCase();
  const me = SVC[id], here = me ?? null;
  mem.turns = (mem.turns ?? 0) + 1;
  const ind = INDUSTRIES.find(([re]) => re.test(t)); if (ind) mem.business = ind[1];
  const topic = TOPICS.find(([, re]) => re.test(t))?.[0];
  const business = mem.business;

  // small talk
  if (/^(hola|buenas|buenos d[ií]as|buenas tardes|buenas noches|hey|qu[eé] (m[aá]s|tal)|saludos)\b/.test(t) && text.length < 30) {
    mem.awaiting = 'business';
    return choose(mem, 'hi', [
      `¡Hola! Qué bueno tenerte por aquí. ${here ? `Te cuento rápido: en ${me.name} ${me.what}.` : COMPANY + '.'} ¿A qué se dedica tu empresa?`,
      `¡Hola! ${here ? `Soy ${me.agent}, de ${me.name}.` : 'Soy Ana, de la recepción de O R-K.'} Cuéntame de tu negocio y te digo cómo te podemos ayudar.`,
    ]);
  }
  if (/\b(gracias|muy amable|genial|perfecto|excelente|buen[ií]simo)\b/.test(t) && text.length < 40) return choose(mem, 'thx', ['¡Con mucho gusto! Si quieres seguir, pregúntame lo que necesites o escríbenos en "Conversemos" para hablar con el equipo.', '¡A ti! Aquí estoy para lo que necesites.']);
  if (/\b(chao|adi[oó]s|hasta luego|nos vemos|bye)\b/.test(t)) return '¡Hasta pronto! Recorre los otros stands cuando quieras, cada uno es un servicio de O R-K.';
  if (/\b(qui[eé]n eres|c[oó]mo te llamas|eres (un )?(robot|bot|ia|humano))\b/.test(t)) return here ? `Soy ${me.agent}, del equipo de atención de ${me.name} en este mundo virtual de O R-K. Te explico el servicio y te conecto con el equipo real cuando quieras.` : 'Soy Ana, de la recepción virtual de O R-K. Te oriento para que llegues al stand del servicio que necesitas.';

  // business questions
  if (/precio|cu[aá]nto (cuesta|vale|cobran|sale)|costo|tarifa|presupuesto|cotiza|valor/.test(t)) return choose(mem, 'price', [
    `Cada proyecto se cotiza según su alcance, por eso no manejo precios fijos. ${business ? `Si nos cuentas qué necesita ${business}` : 'Si nos cuentas qué necesitas'} en el formulario "Conversemos", el equipo te prepara una propuesta a la medida.`,
    'Depende de lo que necesites: no es lo mismo una landing que una plataforma completa. Lo mejor es contarle tu caso al equipo en "Conversemos" y te enviamos una propuesta clara.',
  ]);
  if (/cu[aá]nto (tiempo|se )?(tarda|demora|tardan|demoran|toma)|cu[aá]nto tiempo|plazo|en cu[aá]nto|semanas|meses|qu[eé] tan r[aá]pido/.test(t)) return 'Depende del alcance. Trabajamos por etapas, con entregas que puedes probar desde el principio, y el calendario lo definimos contigo en el diagnóstico.';
  if (/proceso|c[oó]mo trabajan|metodolog|m[eé]todo|pasos|\buts\b|c[oó]mo es/.test(t)) return PROCESS + '.';
  if (/contact|hablar con (alguien|una persona|el equipo)|whatsapp|correo|email|llamar|reuni[oó]n|asesor|agendar/.test(t)) return 'Claro. Escríbele al equipo desde el formulario "Conversemos" del sitio de O R-K y te responde una persona. Si me cuentas tu caso aquí, también te oriento antes.';
  if (/clientes|casos|portafolio|ejemplos|trabajos|proyectos (que|anteriores)|referencias/.test(t)) return 'Puedes ver proyectos reales en la sección "Trabajo" del sitio de O R-K. Si me cuentas tu caso, te digo qué tipo de solución se parece más a lo que necesitas.';
  if (/qu[eé] es o ?r-?k|qui[eé]nes son|a qu[eé] se dedican/.test(t)) return COMPANY + '. Cada stand de este pabellón es uno de nuestros servicios.';

  // the visitor told us what they want to sell: answer concretely about that product
  const product = productOf(t);
  if (product) { mem.product = product; mem.awaiting = 'need'; const pitchId = id === 'centro' ? 'centro' : (topic && topic !== id ? topic : id);
    const pitch = sellPitch(pitchId, product);
    return pitchId !== id && id !== 'centro' ? `${pitch} Eso lo ve el equipo de ${SVC[pitchId].name}: habla con ${SVC[pitchId].agent} en su stand.` : pitch; }
  // short answer to the agent's own question: acknowledge it in context before anything else
  if (mem.awaiting === 'need' && here && text.split(/\s+/).length <= 8 && !product) {
    mem.awaiting = null;
    const what = mem.product ? `vender ${mem.product}` : (mem.business ? `${mem.business}` : 'tu negocio');
    const extra = topic && topic !== id ? ` Y para la parte de ${SVC[topic].name.toLowerCase()}, habla también con ${SVC[topic].agent} en su stand.` : '';
    return `Perfecto, gracias por contarme. Con eso el equipo puede proponerte ${me.items[1] ?? me.items[0]} para ${what}, integrado con lo que ya usas.${extra} El siguiente paso es contarle tu caso al equipo en "Conversemos".`;
  }
  // the visitor's need belongs to another island
  if (topic && topic !== id) {
    const o = SVC[topic];
    const fit = business ? ` ${o.fit(business)}.` : '';
    return id === 'centro'
      ? `Para eso te ayuda el equipo de ${o.name}: ${o.what}.${fit} Ve a su stand y habla con ${o.agent} en el mostrador.`
      : `Eso lo trabaja el equipo de ${o.name}: ${o.what}.${fit} Te recomiendo visitar su stand y hablar con ${o.agent}. ${here ? `Si además necesitas ${me.name.toLowerCase()}, aquí te ayudo.` : ''}`.trim();
  }
  // the visitor told us what their business is
  const soundsLikeBusiness = /\b(empresa|negocio|emprendimiento|marca|vendo|vendemos|tengo|somos|trabajo|me dedico|nos dedicamos|hacemos|ofrezco|ofrecemos|fabrico|producimos)\b/.test(t);
  if (ind || (mem.awaiting === 'business' && soundsLikeBusiness)) {
    mem.awaiting = null; const b = business ?? 'tu negocio';
    if (!here) return `¡Qué bien! Para ${b} te pueden servir varios stands: Plataformas web si necesitas presencia en línea, Marketing para atraer clientes y Tecnología para ordenar la operación. ¿Qué te preocupa más hoy?`;
    mem.awaiting = 'need';
    return `¡Buenísimo! ${me.fit(b)}. ${me.ask}`;
  }
  // a topic of this same island, or "what do you do"
  if (topic === id || /qu[eé] (hacen|ofrecen|servicios)|en qu[eé] me (ayudan|pueden)|ayuda|necesito|quiero|me interesa/.test(t)) {
    if (!here) { mem.awaiting = 'business'; return `${COMPANY}. Cada stand es un servicio: tecnología, marketing, comunidad, diseño, plataformas web, analítica, audiovisual y branding. ¿Qué necesita tu negocio?`; }
    mem.awaiting = 'business';
    return choose(mem, 'what', [
      `En ${me.name} ${me.what}. Por ejemplo: ${list(me.items)}. ${business ? me.fit(business) + '.' : '¿A qué se dedica tu empresa?'}`,
      `Te ayudamos con ${list(me.items)}. ${business ? me.fit(business) + '.' : 'Cuéntame de tu negocio y te doy una idea concreta.'}`,
    ]);
  }
  // yes / ok after an offer
  if (/^(s[ií]|claro|dale|ok|okay|listo|de una|por supuesto|me gustar[ií]a)(?=$|[\s,.!])/.test(t)) return 'Perfecto. El siguiente paso es contarle tu caso al equipo en el formulario "Conversemos" del sitio. Mientras, pregúntame lo que quieras de este servicio.';
  if (/^(no|nada|todav[ií]a no|a[uú]n no)(?=$|[\s,.!])/.test(t)) return here ? `Sin problema. ${me.ask}` : 'Sin problema. Recorre los stands: en cada uno alguien del equipo te explica su servicio.';
  // answering the agent's last question

  // still unclear: ask a useful question instead of repeating
  mem.awaiting = 'business';
  return choose(mem, 'clarify', [
    `Quiero ayudarte bien: ¿a qué se dedica tu empresa y qué te gustaría mejorar?`,
    here ? `No estoy seguro de haberte entendido. En ${me.name} ${me.what}. ¿Me cuentas un poco de tu negocio?` : 'No estoy segura de haberte entendido. ¿Buscas una web, más clientes, ordenar tu operación o tu marca?',
    here ? `${me.ask} Así te doy una recomendación concreta.` : '¿Qué te gustaría lograr con tu negocio este año? Te digo qué stand visitar.',
  ]);
}
