import type { Metadata } from "next";
import "../development/development.css";
import DeckRail from "@/components/deck-rail";
import CapabilityWork from "@/components/capability-work";

export const metadata: Metadata = {
  title: "Servicios — O R-K",
  description: "Technology & Development, Marketing & Performance, Community & Content, Corporate Design y Strategy & Organization: las capabilities de O R-K.",
};

type Capability = {
  number: string;
  title: [string, string];
  lead: string;
  body: string;
  tags: string[];
  image?: string;
  work?: string[];
  tone: "ink" | "violet" | "paper";
};

const capabilities: Capability[] = [
  {
    number: "01",
    title: ["Technology &", "Development."],
    lead: "Tecnología que transforma negocios y potencia su crecimiento.",
    body: "Diseñamos y desarrollamos plataformas, aplicaciones, herramientas digitales y sitios web que impulsan la transformación empresarial. Creamos soluciones a la medida para optimizar procesos, integrar operaciones y generar capacidades que permitan innovar y escalar con eficiencia.",
    tags: ["Plataformas", "Aplicaciones", "Herramientas digitales", "Sitios web"],
    image: "/assets/ork-service-platform-v3.png",
    work: ["fruit-of-adam"],
    tone: "ink",
  },
  {
    number: "02",
    title: ["Marketing &", "Performance."],
    lead: "Marketing digital estratégico que impulsa resultados de negocio.",
    body: "Diseñamos e implementamos estrategias integrales de marketing digital junto con la estrategia de marca, campañas en Google Ads y Meta y el seguimiento de KPIs, para atraer, convertir, fidelizar y escalar el crecimiento de la empresa.",
    tags: ["Estrategia de marca", "Google Ads y Meta", "Embudos de conversión", "KPIs y analítica"],
    image: "/assets/ork-service-campaign-v2.png",
    work: ["claro", "oppo"],
    tone: "violet",
  },
  {
    number: "03",
    title: ["Community &", "Content."],
    lead: "Contenido y comunidades que conectan, inspiran y potencian tu marca.",
    body: "Diseñamos y ejecutamos estrategias de social media y comunicación digital, con contenido relevante, creativo y de alto impacto, alineado a los objetivos de la marca, para construir comunidad, fortalecer el engagement y generar resultados medibles.",
    tags: ["Estrategia de contenidos", "Producción audiovisual", "Gestión de comunidades", "Engagement y KPIs"],
    image: "/assets/service-campaign-editorial.jpg",
    work: ["cali", "oppo"],
    tone: "ink",
  },
  {
    number: "04",
    title: ["Corporate", "Design."],
    lead: "Diseño y desarrollo de marca que comunica, diferencia y genera valor.",
    body: "Creamos la identidad visual y todo el ecosistema de comunicación de tu marca: diseño corporativo, piezas impresas y digitales, catálogos, brochures y material comercial, con una visión estratégica y coherente que fortalece el posicionamiento.",
    tags: ["Branding e identidad", "Diseño de piezas", "Catálogos y brochures", "Medios digitales"],
    image: "/assets/ork-service-identity-v2.png",
    work: ["tarrito-rojo", "monterojo"],
    tone: "paper",
  },
];

const uts = [
  ["U", "Understand", "Entender"],
  ["T", "Transform", "Transformar"],
  ["S", "Scale", "Escalar"],
];

const index = ["Technology & Development", "Marketing & Performance", "Community & Content", "Corporate Design", "Strategy & Organization"];

const process = [
  ["Entender", "Escuchamos y diagnosticamos el negocio antes de proponer nada."],
  ["Diseñar", "Definimos la solución, el alcance y cómo vamos a medirla."],
  ["Construir", "Desarrollamos por etapas, con entregas que puedes probar."],
  ["Conectar", "Integramos con tus sistemas, tus datos y tu equipo."],
  ["Evolucionar", "Medimos, ajustamos y seguimos mejorando contigo."],
];

export default function ServicesPage() {
  return (
    <main className="developmentPage deckPage">
      <nav className="devNav" aria-label="Navegación principal">
        <a className="devLogo" href="/" aria-label="O R-K inicio">
          <img src="/assets/brand/ork-logo-papel.svg" alt="O R-K" />
        </a>
        <div className="devLinks">
          <a href="/#trabajo">Trabajo</a>
          <a href="/#servicios">Método UTS</a>
          <a href="/#nosotros">Nosotros</a>
          <a className="isActive" href="/servicios" aria-current="page">Servicios</a>
          <a href="/#contacto">Conversemos</a>
        </div>
      </nav>

      <DeckRail>
      {/* 01 · Portada */}
      <section className="deckSlide deckCover" aria-labelledby="deck-title">
        <img className="deckCoverImage" src="/assets/ork-editorial-hero-v2.png" alt="" />
        <div className="deckCoverVeil" aria-hidden="true" />
        <div className="deckCoverCopy">
          <span className="deckLabel">Presentación de capabilities</span>
          <h1 id="deck-title" className="deckTrazo">Business<br/>innovation &amp;<br/>technology.</h1>
          <span className="deckMeta">O R-K · Bogotá · 2026</span>
        </div>
        <a className="deckScroll" href="#capabilities" aria-label="Ver capabilities">↓</a>
      </section>

      {/* 02 · Índice */}
      <section className="deckSlide deckIndex" id="capabilities" aria-labelledby="index-title">
        <span className="deckLabel">Business innovation &amp; technology</span>
        <h2 id="index-title">Nuestras<br/>capabilities.</h2>
        <ol>
          {index.map((item, i) => (
            <li key={item}><a href={`#capability-0${i + 1}`}><b>0{i + 1}</b><span>{item}</span></a></li>
          ))}
        </ol>
      </section>

      {/* 03–06 · Capabilities */}
      {capabilities.map((cap) => (
        <section className={`deckSlide deckCap tone-${cap.tone}`} id={`capability-${cap.number}`} key={cap.number} aria-labelledby={`cap-${cap.number}`}>
          <div className="deckCapCopy">
            <span className="deckLabel">Capability {cap.number}</span>
            <h2 id={`cap-${cap.number}`} className="deckTrazo">{cap.title[0]}<br/>{cap.title[1]}</h2>
            <p className="deckLead">{cap.lead}</p>
            <p className="deckBody">{cap.body}</p>
            <ul className="deckTags">{cap.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul>
            {cap.work && <CapabilityWork title={`${cap.title[0]} ${cap.title[1]}`} items={cap.work} />}
          </div>
          {cap.image && <div className="deckCapImage"><img src={cap.image} alt="" loading="lazy" /></div>}
        </section>
      ))}

      {/* 07 · Strategy & Organization */}
      <section className="deckSlide deckStrategy" id="capability-05" aria-labelledby="cap-05">
        <div className="deckStrategyTop">
          <div>
            <span className="deckLabel">Capability 05</span>
            <h2 id="cap-05" className="deckTrazo">Strategy &amp;<br/>organization.</h2>
          </div>
          <div>
            <p className="deckLead">Alineamos estrategia, estructura y equipos para que tu empresa opere con mayor eficiencia y esté lista para escalar.</p>
            <p className="deckBody">Partimos de lo que tu empresa ya hace bien para potenciar sus fortalezas e identificar oportunidades de mejora. Con nuestro método UTS analizamos el rumbo corporativo, la estructura interna, los roles y los canales de comunicación, y alineamos a los equipos para una operación más eficiente, ordenada y orientada a resultados.</p>
          </div>
        </div>
        <div className="deckUts">
          <span className="deckLabel">Método UTS by O R-K</span>
          <ol>{uts.map(([letter, en, es]) => <li key={letter}><b>{letter}</b><span><strong>{en}</strong>{es}</span></li>)}</ol>
        </div>
      </section>

      <section className="deckSlide devMethod" aria-labelledby="method-title">
        <div className="devMethodTop">
          <div>
            <span className="devEyebrow">Cómo trabajamos</span>
            <h2 id="method-title">De una idea<br/><em>a algo real.</em></h2>
          </div>
          <blockquote>
            <p>La tecnología no es el punto de partida. Tu negocio y lo que quieres lograr, sí.</p>
            <cite>Un solo equipo contigo · Cinco pasos</cite>
          </blockquote>
        </div>
        <ol className="devMethodSteps">
          {process.map(([step, text], index) => (
            <li key={step} style={{ "--step": index } as React.CSSProperties}>
              <span>0{index + 1}</span>
              <h3>{step}.</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </section>


      {/* Cierre */}
      <section className="deckSlide deckClose" id="contacto" aria-label="Contacto">
        <img src="/assets/brand/ork-logo-papel.svg" alt="O R-K" />
        <span className="deckClaim">Business innovation &amp; technology</span>
        <i aria-hidden="true" />
        <a href="/formulario">Conversemos <span aria-hidden="true">→</span></a>
      </section>
      </DeckRail>
    </main>
  );
}
