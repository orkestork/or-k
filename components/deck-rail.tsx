"use client";

import { Children, useCallback, useEffect, useRef, useState } from "react";
import { startDeckMotion } from "./deck-motion";
import "./deck-motion.css";

/**
 * Presentación horizontal tipo PPT: cada hijo es una lámina a pantalla completa.
 * Rueda vertical, trackpad, flechas del teclado y botones avanzan lámina por lámina.
 */
export default function DeckRail({ children }: { children: React.ReactNode }) {
  const rail = useRef<HTMLDivElement>(null);
  const locked = useRef(false);
  const [current, setCurrent] = useState(0);
  const total = Children.count(children);

  const goTo = useCallback((index: number) => {
    const el = rail.current;
    if (!el) return;
    const target = Math.max(0, Math.min(total - 1, index));
    el.scrollTo({ left: target * el.clientWidth, behavior: "smooth" });
  }, [total]);

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    return startDeckMotion(el);
  }, []);

  useEffect(() => {
    const el = rail.current;
    if (!el) return;

    const onScroll = () => setCurrent(Math.round(el.scrollLeft / el.clientWidth));

    const onWheel = (event: WheelEvent) => {
      // Un gesto horizontal del trackpad ya mueve el carril con scroll-snap.
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      // Si la lámina actual tiene scroll vertical propio y aún no llega al borde, se respeta.
      const slide = el.children[Math.round(el.scrollLeft / el.clientWidth)] as HTMLElement | undefined;
      if (slide && slide.scrollHeight > slide.clientHeight + 2) {
        const atTop = slide.scrollTop <= 0;
        const atBottom = slide.scrollTop + slide.clientHeight >= slide.scrollHeight - 2;
        if ((event.deltaY < 0 && !atTop) || (event.deltaY > 0 && !atBottom)) return;
      }
      event.preventDefault();
      if (locked.current || Math.abs(event.deltaY) < 8) return;
      locked.current = true;
      const index = Math.round(el.scrollLeft / el.clientWidth);
      goTo(index + (event.deltaY > 0 ? 1 : -1));
      window.setTimeout(() => { locked.current = false; }, 750);
    };

    const onKey = (event: KeyboardEvent) => {
      if (document.querySelector(".caseOverlay")) return; // con un pop-up abierto, el teclado no mueve las láminas
      const index = Math.round(el.scrollLeft / el.clientWidth);
      if (["ArrowRight", "PageDown", " "].includes(event.key)) { event.preventDefault(); goTo(index + 1); }
      if (["ArrowLeft", "PageUp"].includes(event.key)) { event.preventDefault(); goTo(index - 1); }
      if (event.key === "Home") { event.preventDefault(); goTo(0); }
      if (event.key === "End") { event.preventDefault(); goTo(total - 1); }
    };

    // Los enlaces internos (#capability-03…) mueven el carril en lugar de la página.
    const onClick = (event: MouseEvent) => {
      const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
      if (!link) return;
      const target = el.querySelector<HTMLElement>(link.getAttribute("href")!);
      if (!target) return;
      event.preventDefault();
      const slides = Array.from(el.children);
      const slide = slides.find((child) => child === target || child.contains(target));
      if (slide) goTo(slides.indexOf(slide));
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("click", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [goTo, total]);

  return (
    <div className="deckShell">
      <div className="deckRail" ref={rail} tabIndex={0} aria-roledescription="presentación" aria-label="Capabilities de O R-K">
        {children}
      </div>
      <div className="deckControls" aria-label="Controles de la presentación">
        <span className="deckCounter" aria-live="polite">
          <b>{String(current + 1).padStart(2, "0")}</b> / {String(total).padStart(2, "0")}
        </span>
        <div className="deckProgress" aria-hidden="true"><i style={{ transform: `scaleX(${(current + 1) / total})` }} /></div>
        <button type="button" onClick={() => goTo(current - 1)} disabled={current === 0} aria-label="Lámina anterior">←</button>
        <button type="button" onClick={() => goTo(current + 1)} disabled={current === total - 1} aria-label="Lámina siguiente">→</button>
      </div>
    </div>
  );
}
