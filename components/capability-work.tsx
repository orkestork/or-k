"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import "./work-grid.css";

/**
 * Botón "Ver trabajos" de cada capability en /servicios. Abre un pop-up con
 * proyectos del portafolio del equipo (Behance de Brandon Bustos).
 */
export type PortfolioItem = { id: string; title: string; kind: string; desc: string; url: string };

export const portfolio: Record<string, PortfolioItem> = {
  "fruit-of-adam": { id: "fruit-of-adam", title: "Fruit of Adam", kind: "Dirección de arte · Landing page", desc: "Propuesta de landing page para un perfume: montaje, fotografía de producto y maqueta web.", url: "https://www.behance.net/gallery/180833063/Landing-page" },
  claro: { id: "claro", title: "Claro Colombia", kind: "Campaña · Comercial Q4", desc: "Campaña comercial de temporada: key visual y piezas para digital y punto de venta.", url: "https://www.behance.net/gallery/240989995/Claro-Colombia" },
  oppo: { id: "oppo", title: "OPPO", kind: "Campaña · Producto", desc: "Campaña de producto para smartphone: concepto visual y piezas para redes.", url: "https://www.behance.net/gallery/241034265/OPPO" },
  cali: { id: "cali", title: "Alcaldía de Cali", kind: "Campaña · Ciudad", desc: "«Cali, si no creés date un borondo»: identidad gráfica, ilustración y aplicaciones de la campaña.", url: "https://www.behance.net/gallery/241030103/Alcaldia-de-Cali-Colombia" },
  "tarrito-rojo": { id: "tarrito-rojo", title: "Tarrito Rojo", kind: "Rebranding", desc: "Rebranding para conectar la marca con nuevas generaciones: identidad, empaque y campaña.", url: "https://www.behance.net/gallery/242708905/Rebranding-Tarrito-Rojo" },
  monterojo: { id: "monterojo", title: "Monterojo", kind: "Marca · Empaque", desc: "Marca y empaque de papas gourmet colombianas: identidad, línea de sabores y fotografía de producto.", url: "https://www.behance.net/gallery/191891757/Marca-MONTEROJO" },
};

export default function CapabilityWork({ title, items }: { title: string; items: string[] }) {
  const [open, setOpen] = useState(false);
  const list = items.map((id) => portfolio[id]).filter(Boolean);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { event.stopPropagation(); setOpen(false); } };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);

  if (!list.length) return null;
  return (
    <>
      <button type="button" className="capWorkBtn" onClick={() => setOpen(true)}>
        Ver trabajos <span aria-hidden="true">↗</span>
      </button>
      {open && createPortal(
        <div className="caseOverlay" role="dialog" aria-modal="true" aria-label={`Trabajos de ${title}`} onClick={() => setOpen(false)}>
          <article className="casePanel capWorkPanel" onClick={(event) => event.stopPropagation()}>
            <button className="caseClose" type="button" autoFocus onClick={() => setOpen(false)} aria-label="Cerrar">Cerrar <b>×</b></button>
            <div className="caseIntro">
              <span className="caseLabel">Trabajos del equipo</span>
              <h3>{title}</h3>
              <p className="caseDesc">Selección del portafolio de Brandon Bustos, Technology &amp; Creativity Director de O R-K.</p>
            </div>
            <div className="capWorkList">
              {list.map((item) => (
                <a className="capWorkItem" href={item.url} target="_blank" rel="noreferrer" key={item.id}>
                  <img src={`/assets/equipo/${item.id}.jpg`} alt={item.title} loading="lazy" />
                  <span className="caseLabel">{item.kind}</span>
                  <h4>{item.title} <b aria-hidden="true">↗</b></h4>
                  <p>{item.desc}</p>
                </a>
              ))}
            </div>
          </article>
        </div>,
        document.body,
      )}
    </>
  );
}
