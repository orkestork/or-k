import type { Metadata } from "next";
import "../development/development.css";
import { serviceDetails } from "@/lib/services";

export const metadata: Metadata = {
  title: "Servicios — O R-K",
  description: "Estrategia, transformación empresarial, marca, marketing, desarrollo, datos e inteligencia artificial para entender, transformar y escalar tu negocio.",
};

const capabilities = [
  { number: "01", title: "Productos digitales", items: "Apps · Web Apps · SaaS · Experiencias digitales", image: "/assets/development-digital-products.png" },
  { number: "02", title: "Plataformas para tu empresa", items: "Sistemas internos · Portales · Operación · Marketplaces", image: "/assets/development-enterprise-platforms.png" },
  { number: "03", title: "Todo conectado", items: "ERP · CRM · APIs · Integraciones · Automatización · Datos", image: "/assets/development-connected-solutions.png" },
  { number: "04", title: "IA que sí te sirve", items: "Agentes · Asistentes · Procesos inteligentes · Soluciones con IA", image: "/assets/development-ai-solutions.png" },
];

const process = ["Entender", "Diseñar", "Construir", "Conectar", "Evolucionar"];

export default function ServicesPage() {
  return (
    <main className="developmentPage">
      <nav className="devNav" aria-label="Navegación principal">
        <a className="devLogo" href="/" aria-label="O R-K inicio">
          <img src="/assets/ork-logo-white.png" alt="O R-K" />
        </a>
        <div className="devLinks">
          <a href="/#trabajo">Trabajo</a>
          <a href="/#servicios">Método UTS</a>
          <a href="/#nosotros">Nosotros</a>
          <a className="isActive" href="/servicios" aria-current="page">Servicios</a>
          <a href="/#contacto">Hablemos</a>
        </div>
      </nav>

      <section className="devHero">
        <div className="devHeroMedia" aria-hidden="true"><video autoPlay muted loop playsInline preload="metadata" poster="/assets/development-orca-hero-v3.png"><source src="/assets/development-orca-hero-loop.mp4" type="video/mp4" /></video></div>
        <div className="devHeroIndex" aria-hidden="true"><span>01</span><i /><small>DE LA IDEA A LA REALIDAD</small></div>
        <div className="devHeroCopy">
          <span className="devEyebrow">Servicios / Understand · Transform · Scale</span>
          <h1>¿Qué necesita<br/>tu negocio para<br/><em>avanzar?</em></h1>
          <div className="devHeroIntro">
            <p>Puede ser una idea nueva, un proceso que ya no da más o una oportunidad que vale la pena aprovechar. Empezamos por escucharte.</p>
            <p>Unimos estrategia, personas, operación, marca, creatividad y tecnología para entender tu empresa, transformar sus capacidades y acompañar su crecimiento.</p>
          </div>
          <div className="devHeroTags" aria-label="Capacidades principales"><span>Estrategia</span><span>Diseño</span><span>Marca</span><span>Marketing</span><span>Tecnología e IA</span></div>
        </div>
        <a className="devScroll" href="#catalogo">Explorar <b>↓</b></a>
      </section>

      <section className="serviceCatalog" id="catalogo" aria-labelledby="catalog-title">
        <span className="devEyebrow">01 / Nuestros servicios</span>
        <h2 id="catalog-title">Todo lo que necesitas<br/><em>para avanzar.</em></h2>
        <p className="serviceCatalogIntro">Tres formas de acompañarte. Cada servicio responde a un reto de tu negocio y se conecta con los demás para generar resultados.</p>
        <nav className="serviceJumpLinks" aria-label="Áreas de servicio">
          {serviceDetails.map(group => <a key={group.number} href={`#${group.title.toLowerCase()}`}>{group.number} / {group.title} <span aria-hidden="true">↓</span></a>)}
        </nav>
        {serviceDetails.map(group => (
          <section className="serviceGroup" id={group.title.toLowerCase()} key={group.number} aria-labelledby={`title-${group.number}`}>
            <div className="serviceGroupHeading">
              <div className="serviceArt">
                <img src={`/assets/services-orca-${group.title.toLowerCase()}-v1.png`} alt={`Orca de OR-K · ${group.title}`} width={1536} height={1024} loading="lazy" />
                <span className="serviceArtNumber" aria-hidden="true">{group.number}</span>
                <span className="serviceArtLabel" aria-hidden="true">OR-K / {group.title}</span>
              </div>
              <span className="devEyebrow">{group.number} / {group.title}</span>
              <h3 id={`title-${group.number}`}>{group.statement}</h3>
              <p>{group.intro}</p>
            </div>
            <div className="serviceOfferList">
              {group.offers.map(([title, description], index) => (
                <article key={title}>
                  <span className="serviceOfferNumber">{group.number}.{index + 1}</span>
                  <div><h4>{title}</h4><p>{description}</p></div>
                  <a href="/formulario" aria-label={`Hablemos de ${title}`}><span aria-hidden="true">↗</span></a>
                </article>
              ))}
            </div>
          </section>
        ))}
      </section>

      <section className="devCapabilities" id="what-we-build">
        <header>
          <div><span className="devEyebrow">02 / Desarrollo y tecnología</span><p>Desde una herramienta puntual hasta un ecosistema completo. La solución se adapta a tu negocio, no tu negocio a la tecnología.</p></div>
          <h2><span className="devTypeSlice" data-text="¿Qué quieres">¿Qué quieres</span><br/><em className="devTypeSlice isPink" data-text="construir?">construir?</em></h2>
        </header>
        <div className="devCapabilityGrid">
          {capabilities.map((capability) => (
            <article key={capability.number}>
              <div className="devCapabilityPhoto"><img src={capability.image} alt="" loading="lazy" /><i /></div>
              <span>{capability.number}</span>
              <h3>{capability.title}</h3>
              <p>{capability.items}</p>
              <b>↗</b>
            </article>
          ))}
        </div>
      </section>

      <section className="devProcess">
        <div className="devProcessHead"><span className="devEyebrow">03 / Así lo hacemos</span><span>Un solo equipo contigo<br/>Cinco pasos para avanzar</span></div>
        <h2><span className="devTypeSlice" data-text="De una idea">De una idea</span><br/><em className="devTypeSlice isPink" data-text="a algo real.">a algo real.</em></h2>
        <div className="devProcessFlow">
          {process.map((step, index) => (
            <div key={step}>
              <small>0{index + 1}</small>
              <strong>{step}</strong>
              {index < process.length - 1 && <b>→</b>}
            </div>
          ))}
        </div>
        <p className="devPrinciple"><span className="devTypeSlice" data-text="La tecnología no es el punto de partida.">La tecnología no es el punto de partida.</span><br/><em className="devTypeSlice isLight" data-text="Tu negocio y lo que quieres lograr, sí.">Tu negocio y lo que quieres lograr, sí.</em></p>
      </section>

      <section className="devCta" id="contacto">
        <span className="devEyebrow">04 / ¿Construimos juntos?</span>
        <p>¿Tienes un reto, una idea o una oportunidad dando vueltas?</p>
        <h2><span className="devTypeSlice" data-text="Hablemos de lo">Hablemos de lo</span><br/><em className="devTypeSlice isPink" data-text="que viene.">que viene.</em></h2>
        <a href="/formulario">Cuéntanos tu idea <b>→</b></a>
      </section>
    </main>
  );
}
