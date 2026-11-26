"use client";

import { useLang } from "@/lib/i18n";
import "./pavilion-banner.css";

/** Full-bleed 1920×300 invitation to the 3D Pabellón O R-K. */
export default function PavilionBanner() {
  const lang = useLang();
  const en = lang === "en";
  return (
    <a id="pabellon" className="pavBanner" href="/experiencias/or-k/mundo.html" aria-label={en ? "Enter the O R-K Pavilion, a 3D experience" : "Entrar al Pabellón O R-K, experiencia 3D"}>
      <img
        className="pavBannerBg"
        src="/assets/pabellon-banner-1920.jpg"
        srcSet="/assets/pabellon-banner-1920.jpg 1920w, /assets/pabellon-banner-3840.jpg 3840w"
        sizes="100vw"
        alt=""
        loading="lazy"
        decoding="async"
      />
      <span className="pavBannerShade" aria-hidden="true" />
      <span className="pavBannerMotes" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ "--m": i } as React.CSSProperties} />)}</span>
      <span className="pavBannerCopy">
        <span className="pavBannerLive"><b aria-hidden="true" />{en ? "Open now · 3D experience" : "Abierto ahora · Experiencia 3D"}</span>
        <strong>{en ? <>Step into the <em>O R-K Pavilion</em></> : <>Entra al <em>Pabellón O R-K</em></>}</strong>
        <span className="pavBannerSub">{en ? "Walk our services in 3D and talk to the team, by text or voice." : "Recorre nuestros servicios en 3D y habla con el equipo, por texto o por voz."}</span>
      </span>
      <span className="pavBannerCta">{en ? "Enter" : "Entrar"} <span aria-hidden="true">→</span></span>
    </a>
  );
}
