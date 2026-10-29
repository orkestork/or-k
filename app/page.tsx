"use client";

import { useEffect, useRef, useState } from "react";
import UtsSphere from "@/components/uts-sphere";

const services = [
  {title:"Understand",axis:"Eje Z · Profundidad",desc:"Entendemos cómo funciona realmente el negocio: estrategia, estructura, procesos, personas, cultura, tecnología, datos, marca, ventas y oportunidades.",media:"/assets/sphere-growth-ork-final.png",motion:"/assets/sphere-growth-ork-final.mp4"},
  {title:"Transform",axis:"Eje X · Transversalidad",desc:"Convertimos el diagnóstico en capacidades: sistemas, automatizaciones, integraciones, plataformas, datos, herramientas internas e inteligencia artificial.",media:"/assets/sphere-business-technology-ork-v2.png",motion:"/assets/sphere-business-technology-ork-v2-motion.mp4"},
  {title:"Scale",axis:"Eje Y · Verticalidad",desc:"Convertimos la transformación en crecimiento: creatividad, marketing, performance, ventas, CRM, e-commerce, canales y analítica.",media:"/assets/sphere-business-transformation-ork-final.png",motion:"/assets/sphere-business-transformation-ork-final.mp4"},
];
const serviceDetails = [
  {
    number:"01", title:"Understand", axis:"Eje Z · Profundidad", statement:"Primero entendemos el negocio.",
    intro:"Entramos al núcleo de la organización para comprender cómo funciona realmente, dónde están las fricciones y qué oportunidades pueden moverla hacia adelante.",
    media:"/assets/sphere-growth-ork-final.png", motion:"/assets/sphere-growth-ork-final.mp4",
    offers:[
      ["Estrategia y modelo de negocio","Objetivos, prioridades, propuesta de valor y oportunidades."],
      ["Estructura y operación","Áreas, roles, procesos, decisiones y desempeño."],
      ["Personas y cultura","Capacidades, formas de trabajo y cultura organizacional."],
      ["Tecnología y datos","Ecosistema actual, información, brechas y posibilidades."],
      ["Marca, clientes y ventas","Posicionamiento, experiencia, canales y dinámica comercial."],
    ]
  },
  {
    number:"02", title:"Transform", axis:"Eje X · Transversalidad", statement:"Convertimos claridad en capacidad.",
    intro:"Traducimos el diagnóstico en sistemas, productos y nuevas capacidades que conectan el negocio de extremo a extremo y lo preparan para avanzar.",
    media:"/assets/sphere-business-technology-ork-v2.png", motion:"/assets/sphere-business-technology-ork-v2-motion.mp4",
    offers:[
      ["Sistemas empresariales","ERP, CRM y herramientas alineadas con la operación."],
      ["Automatización e integración","Procesos conectados y menos trabajo manual."],
      ["Productos y plataformas","Soluciones digitales para operar, servir y crear valor."],
      ["Datos e inteligencia","Información convertida en visibilidad y mejores decisiones."],
      ["IA aplicada","Agentes y capacidades inteligentes sobre retos reales."],
    ]
  },
  {
    number:"03", title:"Scale", axis:"Eje Y · Verticalidad", statement:"Convertimos capacidad en crecimiento.",
    intro:"Activamos la transformación en el mercado para generar demanda, fortalecer las relaciones con clientes y escalar resultados de manera medible.",
    media:"/assets/sphere-business-transformation-ork-final.png", motion:"/assets/sphere-business-transformation-ork-final.mp4",
    offers:[
      ["Marca y creatividad","Sistemas de marca, campañas, contenido y dirección creativa."],
      ["Marketing y performance","Adquisición, demanda, conversión y optimización continua."],
      ["Ventas y CRM","Procesos comerciales, activación y relaciones con clientes."],
      ["E-commerce y canales","Experiencias y canales digitales de comercialización."],
      ["Analítica y expansión","Medición, nuevos mercados y modelos para crecer."],
    ]
  },
];
const utsStory = [
  {number:"02",kicker:"Tu empresa es una sola",title:"Todo está",accent:"conectado.",lead:"Por eso la miramos completa, no por partes.",items:[["Z · Understand","Miramos hacia adentro para entender qué está pasando de verdad."],["X · Transform","Conectamos y mejoramos lo que necesita cambiar."],["Y · Scale","Llevamos las nuevas capacidades a un nivel más alto."]]},
  {number:"03",kicker:"El momento de tu empresa",title:"¿En qué momento",accent:"estás?",lead:"No todas las empresas necesitan lo mismo. Primero descubrimos cuál es tu siguiente paso.",items:[["Growth","Necesitas ordenar la casa y fortalecer las bases."],["UTS Executive","Estás listo para transformar el negocio con nosotros."],["Enterprise","Quieres optimizar lo que ya funciona y seguir creciendo."]]},
  {number:"04",kicker:"01 · Understand",title:"Entender antes",accent:"de cambiar.",lead:"Nos sentamos contigo, hacemos las preguntas correctas y conocemos la empresa que existe hoy.",media:"/assets/sphere-growth-ork-final.mp4",items:[["Personas","Quiénes hacen que las cosas pasen y qué necesitan."],["Estructura","Cómo se organizan, deciden y trabajan juntos."],["Operación","Qué fluye, qué se frena y dónde hay oportunidades."]],quote:"Una transformación sólida empieza por entender la realidad."},
  {number:"05",kicker:"Understand · En acción",title:"Ponemos la casa",accent:"en orden.",lead:"Mientras entendemos, empezamos a dar claridad.",items:[["Estructura y liderazgo","Áreas · Roles · Responsabilidades"],["Equipo y cultura","Talento · Capacidades · Forma de trabajar"],["Procesos y comunicación","Flujos · Acuerdos · Conversaciones"],["Marca e identidad","Imagen · Mensaje · Coherencia"],["Operación y comercial","Procesos · Canales · Oportunidades"],["Tecnología actual","Herramientas · Integraciones · Uso real"]],tag:"Conversaciones que revelan lo importante"},
  {number:"06",kicker:"Lo que nos deja Understand",title:"Claridad para saber",accent:"qué sigue.",lead:"Juntos decidimos qué conservar, qué mejorar y qué vale la pena transformar.",flow:["Una realidad compartida","Prioridades claras","Un camino posible"]},
  {number:"07",kicker:"02 · Transform",title:"Transformar la claridad",accent:"en capacidad.",lead:"Convertimos lo que entendimos en soluciones que ayudan a tu equipo a trabajar mejor.",media:"/assets/sphere-business-technology-ork-v2-motion.mp4",quote:"La tecnología entra cuando sabemos qué problema debe resolver."},
  {number:"08",kicker:"Transform · En acción",title:"Hacemos que todo",accent:"se conecte.",lead:"Menos islas, menos trabajo repetido y más información útil para decidir.",items:[["Comercial","CRM · E-commerce · Canales"],["Producción","Procesos · Planeación · Control"],["Logística","Inventarios · Despachos · Trazabilidad"],["Abastecimiento","Compras · Importaciones · Proveedores"],["Administración y finanzas","Información · Costos · Control"],["Gerencia","Datos · Indicadores · Decisiones"]],tag:"Plataformas · Integraciones · IA · Automatización · Datos"},
  {number:"09",kicker:"Lo que nos deja Transform",title:"",accent:"Preparada.",lead:"La operación se conecta, la información aparece y el equipo recupera tiempo para avanzar.",flow:["Todo conectado","Más capacidad para crecer"],quote:"Primero ordenamos. Después automatizamos."},
  {number:"10",kicker:"03 · Scale",title:"Ahora sí,",accent:"a crecer.",lead:"Alineamos a toda la organización para convertir las nuevas capacidades en resultados.",media:"/assets/sphere-business-transformation-ork-final.mp4",quote:"No se trata solo de vender más. Se trata de estar listo para crecer bien."},
  {number:"11",kicker:"Scale · En acción",title:"Crecemos como",accent:"un solo equipo.",lead:"Personas, procesos, tecnología, datos y operación avanzan hacia el mismo lugar.",flow:["Ponemos en marcha","Medimos","Aprendemos","Mejoramos","Expandimos"],quote:"Acompañamos la transformación hasta verla funcionar."},
  {number:"12",kicker:"Lo que nos deja Scale",title:"Tu empresa, en un",accent:"nuevo momento.",lead:"Más capacidad, más control y un crecimiento que se puede sostener.",flow:["Una nueva realidad","↻ Volver a entender"],quote:"Cuando una empresa crece, cambia. Y vale la pena volver a escucharla."},
  {number:"13",kicker:"UTS sigue en movimiento",title:"Evolucionar es",accent:"volver a mirar.",lead:"UTS no es una intervención de una sola vez. Es una forma de aprender y avanzar continuamente.",flow:["Understand · Mirar la realidad","Transform · Crear capacidades","Scale · Llevarlas más lejos","↻ Volver a entender"]},
  {number:"14",kicker:"El método se queda contigo",title:"Nosotros acompañamos.",accent:"Tu equipo lo hace suyo.",lead:"Podemos liderarlo contigo y transferirlo para que siga vivo dentro de la organización.",items:[["Medir","Entender lo que está pasando con evidencia."],["Revisar","Escuchar de nuevo y encontrar prioridades."],["Transformar","Crear las capacidades que hacen falta."],["Evolucionar","Convertir UTS en una práctica del equipo."]],quote:"El mejor método es el que tu empresa puede seguir usando, incluso cuando nosotros ya no estamos."},
  {number:"15",kicker:"Understand · Transform · Scale",title:"¿Hasta dónde quieres llevar tu",accent:"empresa?",lead:"Si entiendes tu realidad, puedes transformarla. Y cuando estás preparado, puedes crecer sin perder el control.",flow:["Entender","Transformar","Crecer"],quote:"Primero entendemos contigo. Después transformamos juntos. Y entonces, escalamos lo que funciona.",cta:true},
];
const heroClips = [
  "/assets/ork-home-whale.mp4",
];
const sectors = [
  "TECNOLOGÍA",
  "MODA",
  "CULTURA",
  "RETAIL",
  "ENTRETENIMIENTO",
  "FINTECH",
  "EDUCACIÓN",
  "SALUD",
  "HOSPITALIDAD",
  "MOVILIDAD",
  "CONSUMO",
  "STARTUPS",
];
const projects = [
  {title:"4U Studio",url:"https://4ustudioacademy.com",meta:"Estrategia de marca / Identidad visual",year:"2026",kind:"image",media:"/assets/project-4u-studio.jpg",motion:[
    {src:"/assets/project-4u-web-film.mp4",duration:4000},
    {src:"/assets/project-4u-clip-01.mp4",duration:3000},
    {src:"/assets/project-4u-clip-02.mp4",duration:3000},
  ]},
  {title:"L'Origine",url:"https://www.lorigine.com.co",meta:"Identidad de marca / Dirección visual",year:"2026",kind:"image",media:"/assets/project-lorigine.jpg",motion:[
    {src:"/assets/project-lorigine-film.mp4",duration:10000},
  ]},
  {title:"Kliniu",url:"https://kliniucolombia.com",meta:"Naming / Identidad de marca",year:"2026",kind:"image",media:"/assets/project-kliniu.jpg",motion:[
    {src:"/assets/project-kliniu-film.mp4",duration:2000,startAt:0},
    {src:"/assets/project-kliniu-products.jpg",duration:3000,kind:"image" as const},
    {src:"/assets/project-kliniu-film.mp4",duration:2000,startAt:5},
    {src:"/assets/project-kliniu-film.mp4",duration:3000,startAt:7},
  ]},
  {title:"GEU",url:"https://geu-navy.vercel.app/",meta:"Identidad corporativa / Sistema visual",year:"2026",kind:"image",media:"/assets/project-ggeu.jpg"},
  {title:"Totalpars",url:"https://unipars-tech.vercel.app",meta:"Identidad corporativa / Diseño de marca",year:"2026",kind:"image",media:"/assets/project-totalpars.jpg"},
  {title:"Drokex",url:"https://drokex.com",meta:"Identidad de marca / Plataforma digital",year:"2026",kind:"image",media:"/assets/project-drokex.jpg"},
];

const teamMembers = [
  {name:"Juan Andrés Bernal Méndez",role:"Business Director",photo:"/assets/team-01.png",bio:"Estratega de negocios y arquitecto de transformación empresarial con más de 18 años de experiencia en estrategia, operaciones, innovación, tecnología y desarrollo comercial en Latinoamérica.\n\nComo Founding Partner de OR-K, integra personas, procesos, tecnología e inteligencia artificial para construir organizaciones más conectadas, eficientes y preparadas para crecer. Es creador de ORCA Sphere™, un modelo que entiende las empresas como sistemas interdependientes, permitiendo alinear estrategia, operación y capacidades para generar resultados medibles y sostenibles."},
  {name:"Maureen Blandón Zavala",role:"Financial Director",photo:"/assets/team-02.png",bio:"Empresaria nicaragüense e ingeniera industrial con más de 15 años de experiencia en el desarrollo y consolidación de marcas y proyectos empresariales en distintos países de Latinoamérica. Su trayectoria se ha enfocado en la optimización de procesos, la gestión organizacional, logística y financiera, así como en el fortalecimiento de estructuras empresariales con proyección regional."},
  {name:"Andrés Carrillo Ávila",role:"Executive Director",photo:"/assets/team-03.png",bio:"Empresario colombiano con más de 25 años de trayectoria en la creación y desarrollo de marcas, proyectos empresariales y oportunidades comerciales en distintos países de Latinoamérica. Su experiencia se ha construido principalmente a partir de iniciativas propias, liderando negocios desde su concepción con inversión y riesgo empresarial directo, combinando visión empresarial, creatividad y estrategias de marketing para el desarrollo y posicionamiento de proyectos."},
  {name:"Luis Urdaneta",role:"Commercial Director",photo:"/assets/team-04.png",bio:"Empresario colombiano con más de 30 años de experiencia en comunicación estratégica, desarrollo de marca y marketing. Es fundador de la reconocida agencia Audiovisual Huella Digital en Colombia, desde donde ha liderado proyectos para importantes compañías y organizaciones como Grupo Bolívar, MetLife, Alpina, Mercedes-Benz, Homecenter, DHL, Tetra Pak, Oracle, Avianca, PepsiCo, entre otras marcas de alto reconocimiento."},
  {name:"Brandon Bustos",role:"Technology & Creativity Director",photo:"/assets/team-05.jpg",bio:"Diseñador Gráfico Publicitario e Ingeniero de Software con más de 10 años de experiencia en medios digitales, creatividad y tecnología.\n\nSu trayectoria integra dirección creativa, branding, estrategia digital, desarrollo web, aplicaciones móviles, UI/UX, automatización e inteligencia artificial, liderando proyectos desde la conceptualización hasta su implementación.\n\nSu enfoque conecta creatividad, negocio y tecnología para desarrollar ideas que no solo generan impacto visual, sino que se convierten en productos, plataformas y experiencias con valor real."},
];

function ProjectMotion({poster,title,clips}:{poster:string;title:string;clips:{src:string;duration:number;kind?:"image"|"video";startAt?:number}[]}){
  const [activeClip,setActiveClip]=useState(-1);
  const videoRefs=useRef<(HTMLVideoElement|null)[]>([]);
  useEffect(()=>{
    if(activeClip<0){videoRefs.current.forEach((video)=>{if(video){video.pause();video.currentTime=0;}});return;}
    const video=videoRefs.current[activeClip];
    if(video){video.currentTime=clips[activeClip].startAt??0;void video.play().catch(()=>{});}
    const timer=window.setTimeout(()=>setActiveClip((activeClip+1)%clips.length),clips[activeClip].duration);
    return ()=>{window.clearTimeout(timer);if(video){video.pause();video.currentTime=0;}};
  },[activeClip,clips.length]);
  return <div className="visual projectImage projectMotion" onPointerEnter={()=>setActiveClip(0)} onPointerLeave={()=>setActiveClip(-1)}>
    <img src={poster} alt={`Proyecto ${title}`} draggable="false" loading="lazy" decoding="async"/>
    {clips.map((clip,index)=>clip.kind==="image"
      ? <img className={`projectMotionStill ${activeClip===index?"isActive":""}`} src={clip.src} alt="" aria-hidden="true" draggable="false" key={`${clip.src}-${index}`}/>
      : <video ref={(node)=>{videoRefs.current[index]=node;}} className={activeClip===index?"isActive":""} muted playsInline preload="metadata" key={`${clip.src}-${index}`}><source src={clip.src} type="video/mp4"/></video>)}
    <span className="projectMotionHint">10s · Hover film</span>
  </div>;
}

export default function Home() {
  const [heroClip, setHeroClip] = useState(0);
  const [heroTransition, setHeroTransition] = useState(false);
  const [cursor, setCursor] = useState({ x: -100, y: -100 });
  const [scrollProgress, setScrollProgress] = useState(0);
  const [filmMode, setFilmMode] = useState(false);
  const [manifestoOrganized, setManifestoOrganized] = useState(false);
  const [showLoader, setShowLoader] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [howProgress, setHowProgress] = useState(0);
  const [activeUtsAxis,setActiveUtsAxis] = useState<"X"|"Y"|"Z"|null>(null);
  const projectRail = useRef<HTMLDivElement>(null);
  const howRail = useRef<HTMLDivElement>(null);
  const howTarget = useRef<number | null>(null);
  const howWheelLocked = useRef(false);
  const projectDrag = useRef({ active: false, moved: false, startX: 0, scrollLeft: 0, url: "" });
  const heroTransitionTimers = useRef<number[]>([]);
  const audioContext = useRef<AudioContext | null>(null);
  const audioGain = useRef<GainNode | null>(null);
  const audioOscillators = useRef<OscillatorNode[]>([]);
  useEffect(() => {
    const move = (e: MouseEvent) => setCursor({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);
  useEffect(() => {
    setFilmMode(new URLSearchParams(window.location.search).has("film"));
  }, []);
  useEffect(() => {
    if (window.sessionStorage.getItem("ork-intro-seen")) {
      setShowLoader(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setShowLoader(false);
      window.sessionStorage.setItem("ork-intro-seen", "1");
    }, 3100);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    const sources = heroClips.slice(1);
    const preloaders = sources.map((source) => {
      const video = document.createElement("video");
      video.preload = "auto";
      video.muted = true;
      video.src = source;
      video.load();
      return video;
    });
    return () => preloaders.forEach((video) => {
      video.removeAttribute("src");
      video.load();
    });
  }, []);
  useEffect(() => () => heroTransitionTimers.current.forEach(window.clearTimeout), []);
  useEffect(() => () => {
    audioOscillators.current.forEach((oscillator)=>{try{oscillator.stop();}catch{}});
    if (audioContext.current) void audioContext.current.close();
  }, []);
  useEffect(() => {
    if(!howOpen) return;
    const previous=document.body.style.overflow;
    const previousHtml=document.documentElement.style.overflow;
    document.body.style.overflow="hidden";
    document.documentElement.style.overflow="hidden";
    const close=(event:KeyboardEvent)=>{if(event.key==="Escape") setHowOpen(false);};
    window.addEventListener("keydown",close);
    return ()=>{document.body.style.overflow=previous;document.documentElement.style.overflow=previousHtml;window.removeEventListener("keydown",close);};
  },[howOpen]);
  useEffect(() => {
    if(!teamOpen) return;
    const previous=document.body.style.overflow;
    const previousHtml=document.documentElement.style.overflow;
    document.body.style.overflow="hidden";
    document.documentElement.style.overflow="hidden";
    const close=(event:KeyboardEvent)=>{if(event.key==="Escape") setTeamOpen(false);};
    window.addEventListener("keydown",close);
    return ()=>{document.body.style.overflow=previous;document.documentElement.style.overflow=previousHtml;window.removeEventListener("keydown",close);};
  },[teamOpen]);
  useEffect(()=>{
    if(!howOpen||howTarget.current===null) return;
    const rail=howRail.current;
    if(!rail) return;
    const panel=howTarget.current+1;
    const previous=rail.style.scrollBehavior;
    rail.style.scrollBehavior="auto";
    rail.scrollLeft=panel*rail.clientWidth;
    setHowProgress((panel*rail.clientWidth)/(rail.scrollWidth-rail.clientWidth));
    howTarget.current=null;
    window.requestAnimationFrame(()=>{rail.style.scrollBehavior=previous;});
  },[howOpen]);
  useEffect(()=>{
    if(!howOpen) return;
    const rail=howRail.current;
    if(!rail) return;
    const videos=Array.from(rail.querySelectorAll<HTMLVideoElement>("video"));
    const observer=new IntersectionObserver((entries)=>entries.forEach((entry)=>{
      const video=entry.target as HTMLVideoElement;
      if(entry.isIntersecting) void video.play().catch(()=>{});
      else{video.pause();video.currentTime=0;}
    }),{root:rail,rootMargin:"0px 15%",threshold:.28});
    videos.forEach((video)=>observer.observe(video));
    const panels=Array.from(rail.querySelectorAll<HTMLElement>(".howServicePanel"));
    const panelObserver=new IntersectionObserver((entries)=>entries.forEach((entry)=>{
      entry.target.classList.toggle("isActive",entry.isIntersecting);
    }),{root:rail,threshold:.52});
    panels.forEach((panel)=>panelObserver.observe(panel));
    return ()=>{observer.disconnect();panelObserver.disconnect();};
  },[howOpen]);
  useEffect(() => {
    const update = () => {
      const distance = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(distance > 0 ? window.scrollY / distance : 0);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  useEffect(() => {
    const section = document.querySelector(".services");
    if (!section) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        section.classList.add("isVisible");
        observer.disconnect();
      }
    }, { threshold: 0.12 });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const section = document.querySelector(".intro");
    if (!section) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        section.classList.add("isVisible");
        observer.disconnect();
      }
    }, { threshold: 0.22 });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const section = document.querySelector(".contact");
    if (!section) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        section.classList.add("isVisible");
        observer.disconnect();
      }
    }, { threshold: 0.28 });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const videos = Array.from(document.querySelectorAll<HTMLVideoElement>("video[data-lazy-motion]"));
    const observer = new IntersectionObserver((entries)=>{
      entries.forEach((entry)=>{
        const video=entry.target as HTMLVideoElement;
        const projectVisual=video.closest(".projectImage");
        if(entry.isIntersecting){projectVisual?.classList.add("isInMotion");void video.play().catch(()=>{});}
        else{projectVisual?.classList.remove("isInMotion");video.pause();video.currentTime=0;}
      });
    },{rootMargin:"120px 0px",threshold:.18});
    videos.forEach((video)=>observer.observe(video));
    return ()=>observer.disconnect();
  }, []);
  useEffect(() => {
    const responsiveMode=window.matchMedia("(max-width: 900px)").matches;
    if(!responsiveMode) return;
    const cards=Array.from(document.querySelectorAll<HTMLElement>(".serviceCard"));
    const observer=new IntersectionObserver((entries)=>{
      entries.forEach((entry)=>{
        const card=entry.target as HTMLElement;
        const video=card.querySelector("video");
        if(entry.isIntersecting){
          card.classList.add("isTouchPlaying");
          if(video) void video.play().catch(()=>{});
        }else{
          card.classList.remove("isTouchPlaying");
          if(video){video.pause();video.currentTime=0;}
        }
      });
    },{rootMargin:"5% 0px 5%",threshold:.28});
    cards.forEach((card)=>observer.observe(card));
    return ()=>observer.disconnect();
  }, []);
  const toggleSound = async () => {
    if(!audioContext.current){
      const context=new AudioContext();
      const gain=context.createGain();
      gain.gain.value=0;
      gain.connect(context.destination);
      const filter=context.createBiquadFilter();
      filter.type="lowpass";
      filter.frequency.value=180;
      filter.Q.value=.7;
      filter.connect(gain);
      const oscillators=[55,82.5].map((frequency,index)=>{
        const oscillator=context.createOscillator();
        const voiceGain=context.createGain();
        oscillator.type=index===0?"sine":"triangle";
        oscillator.frequency.value=frequency;
        voiceGain.gain.value=index===0?.72:.18;
        oscillator.connect(voiceGain);
        voiceGain.connect(filter);
        oscillator.start();
        return oscillator;
      });
      audioContext.current=context;
      audioGain.current=gain;
      audioOscillators.current=oscillators;
    }
    const context=audioContext.current;
    const gain=audioGain.current;
    if(!context||!gain) return;
    await context.resume();
    const next=!soundEnabled;
    gain.gain.cancelScheduledValues(context.currentTime);
    gain.gain.setValueAtTime(gain.gain.value,context.currentTime);
    gain.gain.linearRampToValueAtTime(next ? .018 : 0,context.currentTime+.7);
    setSoundEnabled(next);
  };
  const startProjectDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const rail = projectRail.current;
    if (!rail || e.pointerType !== "mouse") return;
    const link=(e.target as HTMLElement).closest<HTMLAnchorElement>(".projectTarget");
    projectDrag.current = { active: true, moved: false, startX: e.clientX, scrollLeft: rail.scrollLeft, url: link?.href??"" };
    rail.setPointerCapture(e.pointerId);
  };
  const moveProjectDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const rail = projectRail.current;
    if (!rail || !projectDrag.current.active) return;
    const distance=e.clientX-projectDrag.current.startX;
    if(Math.abs(distance)<7&&!projectDrag.current.moved) return;
    if(!projectDrag.current.moved){
      projectDrag.current.moved=true;
      rail.classList.add("isDragging");
    }
    rail.scrollLeft = projectDrag.current.scrollLeft - distance * 1.35;
  };
  const stopProjectDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const rail = projectRail.current;
    if (!rail) return;
    projectDrag.current.active = false;
    if (rail.hasPointerCapture(e.pointerId)) rail.releasePointerCapture(e.pointerId);
    rail.classList.remove("isDragging");
    window.setTimeout(()=>{projectDrag.current.moved=false;},0);
  };
  const moveProjects = (direction:-1|1) => {
    const rail=projectRail.current;
    if(!rail) return;
    const cards=rail.querySelectorAll<HTMLElement>(".project");
    const step=cards.length>1?cards[1].offsetLeft-cards[0].offsetLeft:rail.clientWidth*.5;
    rail.scrollBy({left:direction*step,behavior:"smooth"});
  };
  const moveHowWithWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const rail=event.currentTarget;
    const delta=Math.abs(event.deltaY)>=Math.abs(event.deltaX)?event.deltaY:event.deltaX;
    if(Math.abs(delta)<8||howWheelLocked.current) return;
    const current=Math.round(rail.scrollLeft/rail.clientWidth);
    const next=Math.max(0,Math.min(utsStory.length,current+(delta>0?1:-1)));
    if(next===current) return;
    howWheelLocked.current=true;
    rail.scrollTo({left:next*rail.clientWidth,behavior:"smooth"});
    window.setTimeout(()=>{howWheelLocked.current=false;},650);
  };
  const openHowAt = (index:number) => {
    howTarget.current=[2,5,8][index];
    setHowOpen(true);
  };
  const advanceHero = () => {
    if (heroTransition || filmMode) return;
    setHeroTransition(true);
    heroTransitionTimers.current.forEach(window.clearTimeout);
    heroTransitionTimers.current = [
      window.setTimeout(() => setHeroClip((current) => (current + 1) % heroClips.length), 430),
      window.setTimeout(() => setHeroTransition(false), 950),
    ];
  };
  return <main className={`editorialIdentity${filmMode ? " isFilmMode" : ""}`}>
    {showLoader&&<div className="orkLoader" role="status" aria-label="Cargando O R-K"><div className="loaderMark"><img src="/assets/ork-logo-white.png" alt=""/></div><div className="loaderTrack"><i/></div><p>Ideas tomando forma</p></div>}
    <div className="cursor" style={{ transform: `translate(${cursor.x}px,${cursor.y}px)` }} />
    <div className="scrollProgress" style={{transform:`scaleX(${scrollProgress})`}} aria-hidden="true" />
    <div className="siteGrain" aria-hidden="true" />
    <button className={`soundToggle${soundEnabled?" isOn":""}`} type="button" onClick={toggleSound} aria-pressed={soundEnabled} aria-label={soundEnabled?"Desactivar ambiente sonoro":"Activar ambiente sonoro"}><span>{soundEnabled?"Sonido activo":"Sonido inactivo"}</span><i>{Array.from({length:4}).map((_,index)=><b key={index}/>)}</i></button>
    <nav>
      <a className="logo brandLogo" href="#inicio" aria-label="O R-K inicio"><img src="/assets/ork-logo-white.png" alt="O R-K"/></a>
      <button className="navHow" type="button" onClick={()=>setHowOpen(true)}><span>Explora UTS Method</span><b>↗</b></button>
      <div className="navlinks"><a href="#trabajo">Trabajo</a><a href="#servicios">Método UTS</a><a href="#nosotros" onClick={()=>setTeamOpen(true)}>Nosotros</a><a href="/development">Development</a><a href="#contacto">Hablemos</a></div>
      <a className="navLogin" href="/work/login">Iniciar sesión <span aria-hidden="true">↗</span></a>
    </nav>

    {howOpen&&<div className="howOverlay" role="dialog" aria-modal="true" aria-label="Cómo funciona O R-K">
      <header className="howHeader"><img src="/assets/ork-logo-white.png" alt="O R-K"/><span>Understand · Transform · Scale</span><button type="button" onClick={()=>setHowOpen(false)} aria-label="Cerrar">Cerrar <b>×</b></button></header>
      <div className="howProgress"><i style={{transform:`scaleX(${howProgress})`}}/></div>
      <div className="howRail" ref={howRail} onScroll={(event)=>{const el=event.currentTarget;setHowProgress(el.scrollLeft/(el.scrollWidth-el.clientWidth));}} onWheel={moveHowWithWheel}>
        <section className="howIntroPanel">
          <video className="howCoverMotion" muted loop playsInline preload="metadata" poster="/assets/sphere-cover-ork-final.png"><source src="/assets/sphere-cover-ork-final.mp4" type="video/mp4"/></video><div className="howCoverVeil"/>
          <span className="howEyebrow">Una forma de avanzar juntos / UTS by O R-K</span>
          <h2 className="utsCoverTitle"><span>UTS</span><i>Method.</i></h2>
          <div className="utsCoverSequence"><span>Understand</span><b>→</b><span>Transform</span><b>→</b><span>Scale</span></div>
          <p>UTS es nuestra manera de acompañar a una empresa desde la claridad hasta el crecimiento. Primero entendemos contigo, después transformamos lo necesario y, cuando todo está listo, escalamos lo que funciona.</p>
          <div className="howMethodRule"><b>Nuestra regla</b><span>No cambiamos lo que aún no entendemos. No hacemos crecer algo que todavía no está preparado.</span></div>
          <button type="button" onClick={()=>{const rail=howRail.current;if(rail) rail.scrollLeft=rail.clientWidth;}}>Descubre cómo funciona <b>→</b></button>
          <small>Desplázate para continuar · También puedes usar el trackpad</small>
        </section>
        {utsStory.map((slide,index)=><section className={`utsStoryPanel${slide.media?" hasMedia":""}${slide.number==="02"?" hasSphere":""}`} key={slide.number}>
          {slide.media&&<><video className="utsStoryMedia" muted loop playsInline preload="metadata"><source src={slide.media} type="video/mp4"/></video><div className="utsStoryVeil"/></>}
          {slide.number==="02"&&<><UtsSphere activeAxis={activeUtsAxis}/><span className="utsSphereHint">Arrastra para girar <b>↔</b></span></>}
          <div className="utsStoryContent"><span className="utsStoryNo">{slide.number} / 15</span><p className="utsStoryKicker">{slide.kicker}</p><h2>{slide.title} <em>{slide.accent}</em></h2><p className="utsStoryLead">{slide.lead}</p>
            {slide.items&&<div className={`utsStoryGrid${slide.number==="02"?" isAxes":""}`}>{slide.items.map(([title,text],itemIndex)=>{const axis=title.charAt(0) as "X"|"Y"|"Z";return <article key={title} tabIndex={slide.number==="02"?0:undefined} onPointerEnter={()=>slide.number==="02"&&setActiveUtsAxis(axis)} onPointerLeave={()=>slide.number==="02"&&setActiveUtsAxis(null)} onFocus={()=>slide.number==="02"&&setActiveUtsAxis(axis)} onBlur={()=>slide.number==="02"&&setActiveUtsAxis(null)}>{slide.number==="02"&&<span>0{itemIndex+1}</span>}<strong>{title}</strong><p>{text}</p></article>})}</div>}
            {slide.flow&&<div className="utsStoryFlow">{slide.flow.map((step,stepIndex)=><div key={step}><strong>{step}</strong>{stepIndex<slide.flow!.length-1&&<b>→</b>}</div>)}</div>}
            {slide.tag&&<div className="utsStoryTag">{slide.tag}</div>}
            {slide.quote&&<blockquote>{slide.quote}</blockquote>}
            {slide.cta&&<a className="utsStoryCta" href="/formulario">Conversemos sobre tu empresa <b>↗</b></a>}
          </div>
          <button className="howNext" type="button" onClick={()=>{const rail=howRail.current;if(!rail)return;rail.scrollLeft=index===utsStory.length-1?0:rail.scrollLeft+rail.clientWidth;}} aria-label={index===utsStory.length-1?"Volver al inicio":"Siguiente escena"}>{index===utsStory.length-1?"↺":"→"}</button>
        </section>)}
      </div>
    </div>}

    {teamOpen&&<div className="teamOverlay" role="dialog" aria-modal="true" aria-label="Conoce nuestro equipo">
      <header className="teamHeader"><img src="/assets/ork-logo-white.png" alt="O R-K"/><span>Nosotros / El equipo</span><button type="button" onClick={()=>setTeamOpen(false)} aria-label="Cerrar">Cerrar <b>×</b></button></header>
      <div className="teamBody">
        <h2 className="teamTitle">Personas detrás<br/><i>de la estrategia.</i></h2>
        <p className="teamIntro">Estrategia, creatividad y tecnología trabajando en la misma mesa.</p>
        <div className="teamGrid">
          {teamMembers.map((member,index)=><article className="teamCard" style={{"--card-index":index} as React.CSSProperties} key={index}>
            <div className="teamPhoto">
              <img src={member.photo} alt={member.name} decoding="async"/>
              <span className="teamPhotoGrade" aria-hidden="true"/>
              <span className="teamPhotoArrow" aria-hidden="true">↗</span>
            </div>
            <h3>{member.name}</h3>
            <span className="teamRole">{member.role}</span>
            <p>{member.bio}</p>
          </article>)}
        </div>
      </div>
    </div>}

    <section className="hero" id="inicio" onPointerMove={(event)=>{
      const bounds = event.currentTarget.getBoundingClientRect();
      event.currentTarget.style.setProperty("--hero-x", `${((event.clientX - bounds.left) / bounds.width - .5) * 2}`);
      event.currentTarget.style.setProperty("--hero-y", `${((event.clientY - bounds.top) / bounds.height - .5) * 2}`);
    }} onPointerLeave={(event)=>{
      event.currentTarget.style.setProperty("--hero-x", "0");
      event.currentTarget.style.setProperty("--hero-y", "0");
    }}>
      <div className={`heroMedia tone-${heroClip}`}>
        <video className="orkHomeFilm" autoPlay muted loop playsInline preload="auto" poster="/assets/ork-home-whale-poster.png"><source src={heroClips[0]} type="video/mp4"/></video>
      </div>
      <div className="heroShade" />
      <div className={`heroTransition ${heroTransition ? "isActive" : ""}`} aria-hidden="true"><i/><span>O R-K</span></div>
      <div className="marquee"><div>ESTRATEGIA · DISEÑO · TECNOLOGÍA · CULTURA · ESTRATEGIA · DISEÑO · TECNOLOGÍA · CULTURA ·</div></div>
    </section>

    <section className="services" id="servicios">
      <span className="sectionNo">01 / UTS METHOD</span>
      <h2 className="serviceHeading utsHeading" aria-label="Understand, Transform, Scale">
        <span className="utsStage"><small>01 · Profundidad</small><strong aria-hidden="true">{Array.from("UNDERSTAND").map((char,index)=><span data-char={char} style={{"--uts-letter":index} as React.CSSProperties} key={`${char}-${index}`}>{char}</span>)}</strong></span>
        <b aria-hidden="true">→</b>
        <span className="utsStage"><small>02 · Transversalidad</small><strong aria-hidden="true">{Array.from("TRANSFORM").map((char,index)=><span data-char={char} style={{"--uts-letter":index} as React.CSSProperties} key={`${char}-${index}`}>{char}</span>)}</strong></span>
        <b aria-hidden="true">→</b>
        <span className="utsStage utsStageScale"><small>03 · Verticalidad</small><strong aria-hidden="true">{Array.from("SCALE").map((char,index)=><span data-char={char} style={{"--uts-letter":index} as React.CSSProperties} key={`${char}-${index}`}>{char}</span>)}</strong></span>
      </h2>
      <div className="serviceBrief utsBrief"><p>Una lógica para trabajar sobre el negocio completo.</p><div><span>UTS by O R-K</span></div></div>
      <div className="serviceCards">{services.map((service,i)=><article className="serviceCard" role="button" tabIndex={0} aria-label={`Abrir faceta ${service.title}`} style={{"--card-delay":`${i * .13}s`} as React.CSSProperties} key={service.title} onClick={()=>openHowAt(i)} onKeyDown={(event)=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();openHowAt(i);}}} onPointerEnter={(event)=>{if(window.matchMedia("(hover:hover)").matches){const video=event.currentTarget.querySelector("video");if(video) void video.play().catch(()=>{});}}} onPointerLeave={(event)=>{if(window.matchMedia("(hover:hover)").matches){const video=event.currentTarget.querySelector("video");if(video){video.pause();video.currentTime=0;}}}}><span className="serviceNumber">0{i+1}</span><div className="serviceMedia"><img src={service.media} alt="" loading="lazy" decoding="async"/>{service.motion&&<video className="serviceHoverVideo" muted loop playsInline preload="none" poster={service.media}><source src={service.motion} type="video/mp4"/></video>}</div><span className="serviceLabel">{service.axis}</span><h3>{service.title}<b>↗</b></h3><p>{service.desc}</p></article>)}</div>
    </section>

    <section className={`intro${manifestoOrganized?" isOrganized":""}`} id="nosotros" tabIndex={0} aria-label="Regla del método UTS. Haz clic o continúa desplazándote para ordenar las palabras." onClick={()=>setManifestoOrganized(true)} onKeyDown={(event)=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();setManifestoOrganized(true);}}} onWheel={()=>{if(!manifestoOrganized) window.setTimeout(()=>setManifestoOrganized(true),520);}} onPointerMove={(event)=>{
      const bounds=event.currentTarget.getBoundingClientRect();
      const x=(event.clientX-bounds.left)/bounds.width-.5;
      const y=(event.clientY-bounds.top)/bounds.height-.5;
      const factors=[-18,24,-12,19,-23,14];
      factors.forEach((factor,index)=>{
        event.currentTarget.style.setProperty(`--intro-${index+1}x`,`${x*factor}px`);
        event.currentTarget.style.setProperty(`--intro-${index+1}y`,`${y*Math.abs(factor)*.35}px`);
      });
      event.currentTarget.style.setProperty("--intro-bg-x",`${x*28}px`);
    }} onPointerLeave={(event)=>{
      for(let index=1;index<=6;index++){
        event.currentTarget.style.setProperty(`--intro-${index}x`,"0px");
        event.currentTarget.style.setProperty(`--intro-${index}y`,"0px");
      }
      event.currentTarget.style.setProperty("--intro-bg-x","0px");
    }}>
      <span className="sectionNo">02 / Regla del método</span>
      <span className="manifestoHint" aria-hidden="true">{manifestoOrganized?"Composición activa":"Haz clic o desplázate para ordenar"} <i>↘</i></span>
      <p className="manifesto"><span>No transformamos</span><span>lo que no entendemos.</span><span>No escalamos</span><span><em>lo que no hemos</em> transformado.</span></p>
      <aside className="manifestoAside"><span>Creativity<br/>with direction</span><b>↘</b><p>Convertimos atención en acción y estrategia en una presencia cultural propia.</p><button className="teamLaunch" type="button" onClick={(event)=>{event.stopPropagation();setTeamOpen(true);}}><span className="teamLaunchLabel">Conoce nuestro equipo</span> <span className="teamLaunchArrow">↗</span></button><small>Bogotá · Colombia<br/>04°36&apos;N / 74°05&apos;W</small></aside>
      <div className="introFoot"><span>Desde Colombia<br/>para cualquier pantalla.</span><span className="asterisk">✳</span></div>
    </section>

    <section className="sectorRail" aria-label="Sectores en los que trabajamos">
      <span>Trabajamos con</span>
      <div className="sectorViewport">
        <div className="sectorTrack">
          {[0,1].map((group)=><div className="sectorGroup" aria-hidden={group===1} key={group}>
            {sectors.map((sector)=><span className="sectorItem" key={`${group}-${sector}`}><b>{sector}</b><i>✳</i></span>)}
          </div>)}
        </div>
      </div>
    </section>

    <section className="meetZceo" id="como-funciona" aria-label="Conoce cómo funciona O R-K">
      <span className="ghostLetter ghostLeft">z</span><span className="ghostLetter ghostRight">o</span>
      <div className="meetWord"><strong className="wordLeft">{"CREA".split("").map((letter, i)=><span data-char={letter} key={letter+i} style={{"--letter-delay":`${i * -.34}s`} as React.CSSProperties}>{letter}</span>)}</strong><div className="meetPortrait"><video data-lazy-motion muted loop playsInline preload="none" poster="/assets/ork-creative-studio-poster.png"><source src="/assets/ork-creative-studio.mp4" type="video/mp4"/></video><span>▶</span></div><strong className="wordRight">{"MOS".split("").map((letter, i)=><span data-char={letter} key={letter+i} style={{"--letter-delay":`${(i + 4) * -.34}s`} as React.CSSProperties}>{letter}</span>)}</strong></div>
      <div className="meetNote"><b>Conoce</b><p>O R-K<br/>Estrategia, innovación y tecnología<br/>en un mismo equipo.</p></div>
      <p className="meetManifesto">No somos espectadores del cambio.<br/><i>Lo diseñamos.</i></p>
    </section>

    <section className="work" id="trabajo">
      <header><span className="sectionNo">03 / Trabajo seleccionado</span><h2>Ideas en<br/><i>acción.</i></h2></header>
      <div className="projectControls" aria-label="Navegar proyectos"><button type="button" onClick={()=>moveProjects(-1)} aria-label="Proyecto anterior">←</button><button type="button" onClick={()=>moveProjects(1)} aria-label="Proyecto siguiente">→</button></div>
      <div className="projectsFrame">
        <button className="projectNav prev" type="button" tabIndex={-1} onClick={()=>moveProjects(-1)} aria-label="Proyecto anterior">←</button>
        <button className="projectNav next" type="button" tabIndex={-1} onClick={()=>moveProjects(1)} aria-label="Proyecto siguiente">→</button>
        <div className="projects" ref={projectRail} tabIndex={0} role="region" aria-label="Carrusel de proyectos, usa las flechas del teclado para navegar" onKeyDown={(event)=>{if(event.key==="ArrowRight"){event.preventDefault();moveProjects(1);}else if(event.key==="ArrowLeft"){event.preventDefault();moveProjects(-1);}}} onPointerDown={startProjectDrag} onPointerMove={moveProjectDrag} onPointerUp={stopProjectDrag} onPointerCancel={stopProjectDrag} onPointerLeave={(e)=>projectDrag.current.active&&stopProjectDrag(e)}>
          {projects.map((project, index)=><article className={`project p${index+1}`} key={project.title}>
            <a className="projectTarget" href={project.url} target="_blank" rel="noreferrer" draggable="false" aria-label={`Visitar sitio web de ${project.title}`} onDragStart={(event)=>event.preventDefault()} onClick={(event)=>{if(projectDrag.current.moved) event.preventDefault();}}>
              {project.motion?<ProjectMotion poster={project.media} title={project.title} clips={project.motion}/>:<div className="visual projectImage"><img src={project.media} alt={`Proyecto ${project.title}`} draggable="false" loading="lazy" decoding="async"/></div>}
              <div className="caption"><h3>{project.title}</h3><p>{project.meta}</p><span>{project.year} ↗</span></div>
            </a>
          </article>)}
        </div>
      </div>
      <div className="caseMethod"><p>Un caso no termina en una imagen bonita.</p><div><span>01</span><b>Contexto</b><p>Entendemos el negocio, la audiencia y la oportunidad.</p></div><div><span>02</span><b>Idea</b><p>Construimos un concepto capaz de vivir en cualquier formato.</p></div><div><span>03</span><b>Sistema</b><p>Lo convertimos en identidad, contenido y experiencia digital.</p></div></div>
    </section>

    <section className="contact" id="contacto" onPointerMove={(event)=>{
      const bounds = event.currentTarget.getBoundingClientRect();
      event.currentTarget.style.setProperty("--glow-x", `${event.clientX - bounds.left}px`);
      event.currentTarget.style.setProperty("--glow-y", `${event.clientY - bounds.top}px`);
    }}><p>¿Tienes algo en mente?</p><h2 aria-label="Hagámoslo inevitable."><span className="contactWord contactWordTop" aria-hidden="true">{Array.from("HAGÁMOSLO").map((char,index)=><span data-char={char} style={{"--char-index":index} as React.CSSProperties} key={`${char}-${index}`}>{char}</span>)}</span><span className="contactWord contactWordImpact" aria-hidden="true">{Array.from("INEVITABLE.").map((char,index)=><span data-char={char} style={{"--char-index":index} as React.CSSProperties} key={`${char}-${index}`}>{char}</span>)}</span></h2><div className="contactMeta"><span>Un proyecto nuevo<br/>Una colaboración<br/>Una idea sin resolver</span><a className="contactLaunch" href="/formulario">Descubre si tu empresa está preparada <span>↗</span></a></div></section>
    <footer><a className="logo brandLogo brandLogoFooter" href="#inicio" aria-label="O R-K inicio"><img src="/assets/ork-logo-white.png" alt="O R-K"/></a><p>Business innovation & technology.</p><div className="footerMeta"><p>© 2026 O R-K</p></div></footer>
  </main>;
}
