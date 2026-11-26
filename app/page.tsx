"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import UtsSphere from "@/components/uts-sphere";
import RegionalPresence from "@/components/regional-presence";
import HomeShowreel from "@/components/home-showreel";
import WorkGrid from "@/components/work-grid";
import SiteMotion from "@/components/site-motion";
import UtsMotion from "@/components/uts-motion";
import LanguageSwitch from "@/components/language-switch";
import FilmType, { beatAt } from "@/components/film-type";
import { tr, useLang } from "@/lib/i18n";

const services: {title:string;axis:string;desc:string;media:string;motion?:string;focus:string[]}[] = [
  {title:"Understand",axis:"Eje Z · Profundidad",desc:"Entendemos cómo funciona realmente el negocio: estrategia, estructura, procesos, personas, cultura, tecnología, datos, marca, ventas y oportunidades.",media:"/assets/services-orca-understand-v2.jpg",focus:["Estrategia","Estructura","Procesos","Personas","Cultura","Datos"]},
  {title:"Transform",axis:"Eje X · Transversalidad",desc:"Convertimos el diagnóstico en capacidades: sistemas, automatizaciones, integraciones, plataformas, datos, herramientas internas e inteligencia artificial.",media:"/assets/services-orca-transform-v2.jpg",focus:["Sistemas","Automatizaciones","Integraciones","Plataformas","Herramientas internas","Inteligencia artificial"]},
  {title:"Scale",axis:"Eje Y · Verticalidad",desc:"Convertimos la transformación en crecimiento: creatividad, marketing, performance, ventas, CRM, e-commerce, canales y analítica.",media:"/assets/services-orca-scale-v2.jpg",focus:["Creatividad","Marketing","Performance","Ventas y CRM","E-commerce","Analítica"]},
];
const utsStory = [
  {number:"02",kicker:"Tu empresa es una sola",title:"Todo está",accent:"conectado.",lead:"Por eso la miramos completa, no por partes.",items:[["Z · Understand","Miramos hacia adentro para entender qué está pasando de verdad."],["X · Transform","Conectamos y mejoramos lo que necesita cambiar."],["Y · Scale","Llevamos las nuevas capacidades a un nivel más alto."]]},
  {number:"04",kicker:"01 · Understand",title:"Entender antes",accent:"de cambiar.",lead:"Nos sentamos contigo, hacemos las preguntas correctas y conocemos la empresa que existe hoy.",media:"/assets/sphere-growth-ork-final.mp4",items:[["Personas","Quiénes hacen que las cosas pasen y qué necesitan."],["Estructura","Cómo se organizan, deciden y trabajan juntos."],["Operación","Qué fluye, qué se frena y dónde hay oportunidades."]],quote:"Una transformación sólida empieza por entender la realidad."},
  {number:"07",kicker:"02 · Transform",title:"Transformar la claridad",accent:"en capacidad.",lead:"Convertimos lo que entendimos en soluciones que ayudan a tu equipo a trabajar mejor.",media:"/assets/sphere-business-technology-ork-v2-motion.mp4",quote:"La tecnología entra cuando sabemos qué problema debe resolver."},
  {number:"10",kicker:"03 · Scale",title:"Ahora sí,",accent:"a crecer.",lead:"Alineamos a toda la organización para convertir las nuevas capacidades en resultados.",media:"/assets/sphere-business-transformation-ork-final.mp4",quote:"No se trata solo de vender más. Se trata de estar listo para crecer bien."},
  {number:"15",kicker:"Understand · Transform · Scale",title:"¿Hasta dónde quieres llevar tu",accent:"empresa?",lead:"Si entiendes tu realidad, puedes transformarla. Y cuando estás preparado, puedes crecer sin perder el control.",flow:["Entender","Transformar","Crecer"],quote:"Primero entendemos contigo. Después transformamos juntos. Y entonces, escalamos lo que funciona.",cta:true},
];
const huellaClips = [
  {id:"oracle",brand:"Oracle"},
  {id:"oea",brand:"OEA"},
  {id:"policia",brand:"Policía Nacional"},
  {id:"san-jorge",brand:"San Jorge"},
  {id:"avianca",brand:"Avianca"},
  {id:"rappi",brand:"Rappi"},
  {id:"metlife",brand:"MetLife"},
  {id:"transmilenio",brand:"TransMilenio"},
];
function CollageClip({clip}:{clip:{id:string;brand:string}}){
  return <figure className={`collageTile tileClip clip-${clip.id}`}>
    <video data-lazy-motion muted loop playsInline preload="none" poster={`/assets/huella/${clip.id}.jpg`}><source src={`/assets/huella/${clip.id}.mp4`} type="video/mp4"/></video>
    <figcaption><span>Comercial TV</span>{clip.brand}</figcaption>
  </figure>;
}
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
  {title:"Pabellón O R-K",url:"/experiencias/or-k/mundo.html",meta:"Producto propio / Experiencia 3D",year:"2026",kind:"image",media:"/assets/portfolio/pabellon-or-k-cover.jpg"},
  {title:"Kliniu",url:"https://kliniucolombia.com",meta:"Naming / Identidad de marca",year:"2026",kind:"image",media:"/assets/portfolio/kliniu-cover.webp"},
  {title:"GEU",url:"https://geu-navy.vercel.app/",meta:"Identidad corporativa / Sistema visual",year:"2026",kind:"image",media:"/assets/portfolio/geu-cover.webp"},
  {title:"Totalpars",url:"https://unipars-tech.vercel.app",meta:"Identidad corporativa / Diseño de marca",year:"2026",kind:"image",media:"/assets/portfolio/totalpars-cover.webp"},
  {title:"Drokex",url:"https://drokex.com",meta:"Identidad de marca / Plataforma digital",year:"2026",kind:"image",media:"/assets/portfolio/drokex-cover.webp"},
  {title:"4U Studio",url:"https://4ustudioacademy.com",meta:"Estrategia de marca / Identidad visual",year:"2026",kind:"image",media:"/assets/covers/4u.jpg",preview:"/assets/project-4u-clip-01.mp4",motion:[
    {src:"/assets/project-4u-web-film.mp4",duration:4000},
    {src:"/assets/project-4u-clip-01.mp4",duration:3000},
    {src:"/assets/project-4u-clip-02.mp4",duration:3000},
  ]},
  {title:"L'Origine",url:"https://www.lorigine.com.co",meta:"Identidad de marca / Dirección visual",year:"2026",kind:"image",media:"/assets/covers/lor.jpg",motion:[
    {src:"/assets/project-lorigine-film.mp4",duration:10000},
  ]},
];

const teamMembers = [
  {name:"Juan Andrés Bernal Méndez",role:"Business Director",photo:"/assets/team-01.png",bio:"Estratega de negocios y arquitecto de transformación empresarial con más de 18 años de experiencia en estrategia, operaciones, innovación, tecnología y desarrollo comercial en Latinoamérica.\n\nComo Founding Partner de O R-K, integra personas, procesos, tecnología e inteligencia artificial para construir organizaciones más conectadas, eficientes y preparadas para crecer. Es creador de ORCA Sphere™, un modelo que entiende las empresas como sistemas interdependientes, permitiendo alinear estrategia, operación y capacidades para generar resultados medibles y sostenibles."},
  {name:"Maureen Blandón Zavala",role:"Financial Director",photo:"/assets/team-02.png",bio:"Empresaria nicaragüense e ingeniera industrial con más de 15 años de experiencia en el desarrollo y consolidación de marcas y proyectos empresariales en distintos países de Latinoamérica. Su trayectoria se ha enfocado en la optimización de procesos, la gestión organizacional, logística y financiera, así como en el fortalecimiento de estructuras empresariales con proyección regional."},
  {name:"Andrés Carrillo Ávila",role:"Executive Director",photo:"/assets/team-03.png",bio:"Empresario colombiano con más de 25 años de trayectoria en la creación y desarrollo de marcas, proyectos empresariales y oportunidades comerciales en distintos países de Latinoamérica. Su experiencia se ha construido principalmente a partir de iniciativas propias, liderando negocios desde su concepción con inversión y riesgo empresarial directo, combinando visión empresarial, creatividad y estrategias de marketing para el desarrollo y posicionamiento de proyectos."},
  {name:"Luis Urdaneta",role:"Commercial Director",photo:"/assets/team-04.png",bio:"Empresario colombiano con más de 30 años de experiencia en comunicación estratégica, desarrollo de marca y marketing. Es fundador de la reconocida agencia Audiovisual Huella Digital en Colombia, desde donde ha liderado proyectos para importantes compañías y organizaciones como Grupo Bolívar, MetLife, Alpina, Mercedes-Benz, Homecenter, DHL, Tetra Pak, Oracle, Avianca, PepsiCo, entre otras marcas de alto reconocimiento."},
  {name:"Brandon Bustos",role:"Technology & Creativity Director",photo:"/assets/team-05.jpg",bio:"Diseñador Gráfico Publicitario e Ingeniero de Software con más de 10 años de experiencia en medios digitales, creatividad y tecnología.\n\nSu trayectoria integra dirección creativa, branding, estrategia digital, desarrollo web, aplicaciones móviles, UI/UX, automatización e inteligencia artificial, liderando proyectos desde la conceptualización hasta su implementación.\n\nSu enfoque conecta creatividad, negocio y tecnología para desarrollar ideas que no solo generan impacto visual, sino que se convierten en productos, plataformas y experiencias con valor real."},
];

export default function Home() {
  const lang = useLang();
  const [filmBeat, setFilmBeat] = useState(-1);
  const [filmPlaying, setFilmPlaying] = useState(false);
  const heroVideo = useRef<HTMLVideoElement>(null);
  const [filmMode, setFilmMode] = useState(false);
  const [showLoader, setShowLoader] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [howProgress, setHowProgress] = useState(0);
  const [activeUtsAxis,setActiveUtsAxis] = useState<"X"|"Y"|"Z"|null>(null);
  const home = useRef<HTMLElement>(null);
  const cursor = useRef<HTMLDivElement>(null);
  const scrollProgress = useRef<HTMLDivElement>(null);
  const howRail = useRef<HTMLDivElement>(null);
  const howTarget = useRef<number | null>(null);
  const howWheelLocked = useRef(false);
  const audioContext = useRef<AudioContext | null>(null);
  const audioGain = useRef<GainNode | null>(null);
  const audioOscillators = useRef<OscillatorNode[]>([]);
  useEffect(() => {
    setFilmMode(new URLSearchParams(window.location.search).has("film"));
  }, []);
  useEffect(() => {
    if (showLoader) return;
    const video = heroVideo.current;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pauseForPreference = () => {
      if (preference.matches) video?.pause();
    };
    if (!preference.matches && video) void video.play().catch(() => {});
    preference.addEventListener("change", pauseForPreference);
    return () => preference.removeEventListener("change", pauseForPreference);
  }, [showLoader]);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        window.location.hash ||
        window.sessionStorage.getItem("ork-intro-seen")) {
      setShowLoader(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setShowLoader(false);
      window.sessionStorage.setItem("ork-intro-seen", "1");
    }, 1000);
    return () => window.clearTimeout(timer);
  }, []);
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
    const indicator = scrollProgress.current;
    if (!indicator) return;
    let frame: number | null = null;
    const update = () => {
      frame = null;
      const distance = document.documentElement.scrollHeight - window.innerHeight;
      indicator.style.transform = `scaleX(${distance > 0 ? window.scrollY / distance : 0})`;
    };
    const schedule = () => {
      if (frame === null) frame = window.requestAnimationFrame(update);
    };
    const resize = new ResizeObserver(schedule);
    if (home.current) resize.observe(home.current);
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      resize.disconnect();
      if (frame !== null) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
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
    const videos = home.current?.querySelectorAll<HTMLVideoElement>("video[data-lazy-motion]");
    if (!videos) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const visible = new Set<HTMLVideoElement>();
    const update = (video: HTMLVideoElement) => {
      if (visible.has(video) && !document.hidden && !reducedMotion.matches) {
        void video.play().catch(() => {});
      } else {
        video.pause();
      }
    };
    const sync = () => videos.forEach(update);
    const threshold = 0.18;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const video = entry.target as HTMLVideoElement;
        if (entry.intersectionRatio >= threshold) visible.add(video);
        else visible.delete(video);
        update(video);
      }
    }, { threshold });
    videos.forEach((video) => observer.observe(video));
    document.addEventListener("visibilitychange", sync);
    reducedMotion.addEventListener("change", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      reducedMotion.removeEventListener("change", sync);
      videos.forEach((video) => video.pause());
    };
  }, [filmMode]);
  useEffect(() => {
    const responsiveMode=window.matchMedia("(hover: none) and (prefers-reduced-motion: no-preference)").matches;
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
    howTarget.current=[1,2,3][index];
    setHowOpen(true);
  };
  return <main ref={home} className={`editorialIdentity${filmMode ? " isFilmMode" : ""}${showLoader ? " isLoading" : ""}`}>
    {showLoader&&<div className="orkLoader" role="status" aria-label="Cargando O R-K"><div className="loaderMark"><img src="/assets/brand/ork-logo-papel.svg" alt=""/></div><div className="loaderTrack"><i/></div><p>Ideas tomando forma</p></div>}
    <div ref={cursor} className="cursor homeCursor" aria-hidden="true"><span className="cursorLabel" /></div>
    <SiteMotion />
    <div ref={scrollProgress} className="scrollProgress" aria-hidden="true" />
    <div className="siteGrain" aria-hidden="true" />
    <button className={`soundToggle${soundEnabled?" isOn":""}`} type="button" onClick={toggleSound} aria-pressed={soundEnabled} aria-label={soundEnabled?"Desactivar ambiente sonoro":"Activar ambiente sonoro"}><span>{soundEnabled?"Sonido activo":"Sonido inactivo"}</span><i>{Array.from({length:4}).map((_,index)=><b key={index}/>)}</i></button>
    <nav>
      <a className="logo brandLogo" href="#inicio" aria-label="O R-K inicio"><img src="/assets/brand/ork-logo-tinta.svg" alt="O R-K"/></a>
      <button className="navHow" type="button" onClick={()=>setHowOpen(true)}><span>Explora UTS Method</span><b>↗</b></button>
      <div className="navlinks"><a href="#trabajo">Trabajo</a><a href="#servicios">Método UTS</a><a href="#nosotros" onClick={(event)=>{event.preventDefault();setTeamOpen(true);}}>Nosotros</a><a href="/servicios">Servicios</a><a href="#contacto">Conversemos</a></div>
      <LanguageSwitch />
      <a className="navLogin" href="/work/login">Iniciar sesión <span aria-hidden="true">↗</span></a>
    </nav>

    {howOpen&&<div className="howOverlay" role="dialog" aria-modal="true" aria-label="Cómo funciona O R-K">
      <header className="howHeader"><img src="/assets/brand/ork-logo-papel.svg" alt="O R-K"/><span>Understand · Transform · Scale</span><button type="button" onClick={()=>setHowOpen(false)} aria-label="Cerrar">Cerrar <b>×</b></button></header>
      <div className="howProgress"><i style={{transform:`scaleX(${howProgress})`}}/></div>
      <div className="howRail" ref={howRail} onScroll={(event)=>{const el=event.currentTarget;setHowProgress(el.scrollLeft/(el.scrollWidth-el.clientWidth));}} onWheel={moveHowWithWheel}>
        <section className="howIntroPanel">
          <video className="howCoverMotion" muted loop playsInline preload="metadata" poster="/assets/ork-home-whale-poster.png"><source src="/assets/ork-home-whale.mp4" type="video/mp4"/></video><div className="howCoverVeil"/>
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
          <div className="utsStoryContent"><span className="utsStoryNo">{String(index+2).padStart(2,"0")} / {String(utsStory.length+1).padStart(2,"0")}</span><p className="utsStoryKicker">{slide.kicker}</p><h2>{slide.title} <em>{slide.accent}</em></h2><p className="utsStoryLead">{slide.lead}</p>
            {slide.items&&<div className={`utsStoryGrid${slide.number==="02"?" isAxes":""}`}>{slide.items.map(([title,text],itemIndex)=>{const axis=title.charAt(0) as "X"|"Y"|"Z";return <article key={title} tabIndex={slide.number==="02"?0:undefined} onPointerEnter={()=>slide.number==="02"&&setActiveUtsAxis(axis)} onPointerLeave={()=>slide.number==="02"&&setActiveUtsAxis(null)} onFocus={()=>slide.number==="02"&&setActiveUtsAxis(axis)} onBlur={()=>slide.number==="02"&&setActiveUtsAxis(null)}>{slide.number==="02"&&<span>0{itemIndex+1}</span>}<strong>{title}</strong><p>{text}</p></article>})}</div>}
            {slide.flow&&<div className="utsStoryFlow">{slide.flow.map((step,stepIndex)=><div key={step}><strong>{step}</strong>{stepIndex<slide.flow!.length-1&&<b>→</b>}</div>)}</div>}
            {slide.quote&&<blockquote>{slide.quote}</blockquote>}
            {slide.cta&&<a className="utsStoryCta" href="/formulario">Conversemos sobre tu empresa <b>↗</b></a>}
          </div>
          <button className="howNext" type="button" onClick={()=>{const rail=howRail.current;if(!rail)return;rail.scrollLeft=index===utsStory.length-1?0:rail.scrollLeft+rail.clientWidth;}} aria-label={index===utsStory.length-1?"Volver al inicio":"Siguiente escena"}>{index===utsStory.length-1?"↺":"→"}</button>
        </section>)}
      </div>
    </div>}

    {teamOpen&&<div className="teamOverlay" role="dialog" aria-modal="true" aria-label="Conoce nuestro equipo">
      <header className="teamHeader"><img src="/assets/brand/ork-logo-papel.svg" alt="O R-K"/><span>Nosotros / El equipo</span><button type="button" onClick={()=>setTeamOpen(false)} aria-label="Cerrar">Cerrar <b>×</b></button></header>
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

    <div className="homeOpening" id="inicio">
    <section className="hero" onPointerMove={(event)=>{
      if (event.pointerType !== "mouse") return;
      const bounds = event.currentTarget.getBoundingClientRect();
      event.currentTarget.style.setProperty("--hero-x", `${((event.clientX - bounds.left) / bounds.width - .5) * 2}`);
      event.currentTarget.style.setProperty("--hero-y", `${((event.clientY - bounds.top) / bounds.height - .5) * 2}`);
    }} onPointerLeave={(event)=>{
      event.currentTarget.style.setProperty("--hero-x", "0");
      event.currentTarget.style.setProperty("--hero-y", "0");
    }}>
      <div className="heroMedia tone-0 openingScreen" aria-hidden="true">
        <video
          className="orkHomeFilm"
          ref={heroVideo}
          muted
          loop
          playsInline
          preload="auto"
          poster="/assets/ork-hero-film-poster.jpg"
          onPlay={(event) => {
            setFilmPlaying(true);
            setFilmBeat(beatAt(event.currentTarget.currentTime));
          }}
          onPause={() => setFilmPlaying(false)}
          onTimeUpdate={(event) => setFilmBeat(beatAt(event.currentTarget.currentTime))}
        >
          <source src="/assets/ork-hero-film.mp4?v=5s" type="video/mp4"/>
        </video>
        <div className="heroShade" />
        <FilmType index={filmBeat} lang={lang} />
      </div>
      <div className="studioHeroCopy">
        <h1 aria-label="No somos espectadores del cambio.">
          <span aria-hidden="true"><span>No somos</span></span>
          <span aria-hidden="true"><span>espectadores</span></span>
          <span aria-hidden="true"><span>del cambio.</span></span>
        </h1>
        <a className="studioHeroCta" href="/formulario">Conversemos <span aria-hidden="true">→</span></a>
      </div>
      <button type="button" className="heroFilmControl" onClick={() => {
        const video = heroVideo.current;
        if (!video) return;
        if (video.paused) void video.play().catch(() => {});
        else video.pause();
      }}>
        {lang === "en" ? (filmPlaying ? "Pause video" : "Play video") : (filmPlaying ? "Pausar video" : "Reproducir video")}
      </button>
      <div className="marquee"><div>ESTRATEGIA · DISEÑO · TECNOLOGÍA · CULTURA · ESTRATEGIA · DISEÑO · TECNOLOGÍA · CULTURA ·</div></div>
    </section>
    </div>

    <section className="services" id="servicios">
      <div className="utsStage">
      <span className="sectionNo">01 / UTS METHOD</span>
      <UtsMotion />
      <div className="serviceBrief utsBrief"><h2 aria-label={tr("Una lógica para trabajar sobre el negocio completo.",lang)}>{tr("Una lógica para trabajar sobre el negocio completo.",lang).split(" ").map((word,wi)=><Fragment key={`${word}-${wi}`}>{wi>0&&" "}<span className="utsWord" aria-hidden="true"><span style={{"--w":wi} as React.CSSProperties}>{word}</span></span></Fragment>)}</h2><div><span>UTS by O R-K</span></div></div>
      <div className="serviceCards">{services.map((service,i)=><article className="serviceCard" role="button" tabIndex={0} aria-label={`Abrir faceta ${service.title}`} style={{"--card-delay":`${i * .13}s`} as React.CSSProperties} key={service.title} onClick={()=>openHowAt(i)} onKeyDown={(event)=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();openHowAt(i);}}} onPointerEnter={(event)=>{if(window.matchMedia("(hover:hover) and (prefers-reduced-motion: no-preference)").matches){const video=event.currentTarget.querySelector("video");if(video) void video.play().catch(()=>{});}}} onPointerLeave={(event)=>{if(window.matchMedia("(hover:hover)").matches){const video=event.currentTarget.querySelector("video");if(video){video.pause();video.currentTime=0;}}}}><div className="serviceSticky"><span className="serviceNumber">0{i+1}</span><div className="serviceMedia"><img src={service.media} alt="" loading="lazy" decoding="async"/>{service.motion&&<video className="serviceHoverVideo" muted loop playsInline preload="none" poster={service.media}><source src={service.motion} type="video/mp4"/></video>}</div><span className="serviceLabel">{service.axis}</span><h3><span className="rollText" aria-label={tr(service.title,lang)}>{Array.from(tr(service.title,lang)).map((char,ci)=><span className="rollChar" aria-hidden="true" data-char={char} style={{"--i":ci} as React.CSSProperties} key={ci}>{char}</span>)}</span><b>↗</b></h3><p>{service.desc}</p><div className="serviceFocus"><span>Qué trabajamos</span><ul>{service.focus.map((item)=><li key={item}>{item}</li>)}</ul></div><span className="serviceCta"><i aria-hidden="true"/>Ver la fase</span></div></article>)}</div>
      </div>
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

    <HomeShowreel />

    <section className="brandStreet" aria-label="La marca en la calle">
      <div className="brandCollage">
        <figure className="collageTile tileMural">
          <video data-lazy-motion muted loop playsInline preload="none" poster="/assets/ork-brand-mural-poster.jpg"><source src="/assets/ork-brand-mural.mp4" type="video/mp4"/></video>
          <figcaption><span>O R-K · Mural</span>Boring is expensive.</figcaption>
        </figure>
        {huellaClips.slice(0,2).map((clip)=><CollageClip clip={clip} key={clip.id}/>)}
        {huellaClips.slice(2,4).map((clip)=><CollageClip clip={clip} key={clip.id}/>)}
        <figure className="collageTile tilePoster">
          <video data-lazy-motion muted loop playsInline preload="none" poster="/assets/ork-brand-mupi-poster.jpg"><source src="/assets/ork-brand-poster-rain.mp4" type="video/mp4"/></video>
          <figcaption><span>O R-K · Mupi</span>Make brands useful.</figcaption>
        </figure>
        {huellaClips.slice(4,6).map((clip)=><CollageClip clip={clip} key={clip.id}/>)}
        {huellaClips.slice(6,8).map((clip)=><CollageClip clip={clip} key={clip.id}/>)}
        <div className="collageTile tileNote">
          <span className="brandStreetLabel">Producción audiovisual</span>
          <p>Comerciales para televisión y digital de marcas que se ven todos los días.</p>
        </div>
      </div>
    </section>

    <section className="work" id="trabajo">
      <header className="workHead"><span className="sectionNo">03 / Trabajo seleccionado</span><h2 aria-label="Ideas en acción."><span className="lineMask" aria-hidden="true"><span>Ideas en</span></span><span className="lineMask" aria-hidden="true"><i>acción.</i></span></h2><p className="workLead">Una selección de marcas, plataformas y experiencias que construimos con equipos que quieren crecer.</p></header>
      <WorkGrid projects={projects}/>
    </section>

    <section className="streetPosters" id="posters" aria-label="Pósters de O R-K en la calle">
      <img
        src="/assets/brand/ork-posters-street.webp"
        srcSet="/assets/brand/ork-posters-street-960.webp 960w, /assets/brand/ork-posters-street.webp 2400w"
        sizes="100vw"
        width={2400}
        height={1340}
        loading="lazy"
        decoding="async"
        alt="Tres pósters de O R-K sobre un muro de concreto: Make brands useful. Boring is expensive. Something is about to surface."
      />
    </section>

    <RegionalPresence />

    <section className="contact" id="contacto" onPointerMove={(event)=>{
      const bounds = event.currentTarget.getBoundingClientRect();
      event.currentTarget.style.setProperty("--glow-x", `${event.clientX - bounds.left}px`);
      event.currentTarget.style.setProperty("--glow-y", `${event.clientY - bounds.top}px`);
    }}><video className="contactBg" data-lazy-motion muted loop playsInline preload="none" poster="/assets/ork-brand-mupi-poster.jpg" aria-hidden="true"><source src="/assets/ork-brand-poster-rain.mp4" type="video/mp4"/></video><div className="contactVeil" aria-hidden="true"/><p>¿Tienes algo en mente?</p><h2 aria-label="Hagámoslo inevitable."><span className="contactWord contactWordTop" aria-hidden="true">{Array.from(lang==="en"?"LET'S MAKE IT":"HAGÁMOSLO").map((char,index)=><span data-char={char} style={{"--char-index":index} as React.CSSProperties} key={`${char}-${index}`}>{char}</span>)}</span><span className="contactWord contactWordImpact" aria-hidden="true">{Array.from("INEVITABLE.").map((char,index)=><span data-char={char} style={{"--char-index":index} as React.CSSProperties} key={`${char}-${index}`}>{char}</span>)}</span></h2><div className="contactMeta"><span>Un proyecto nuevo<br/>Una colaboración<br/>Una idea sin resolver</span><a className="contactLaunch" href="/formulario">Descubre si tu empresa está preparada <span>↗</span></a></div></section>
    <footer><a className="logo brandLogo brandLogoFooter" href="#inicio" aria-label="O R-K inicio"><img src="/assets/brand/ork-logo-papel.svg" alt="O R-K"/></a><p>Business innovation & technology.</p><div className="footerMeta"><p>© 2026 O R-K</p></div></footer>
  </main>;
}
