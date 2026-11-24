"use client";

import { useEffect } from "react";

/**
 * Site-wide motion layer:
 *  - inertial smooth wheel scrolling (native scroll position, so sticky/anchors keep working)
 *  - a lerped cursor that grows over interactive elements and shows "Ver" over media
 *  - magnetic buttons
 *  - subtle 3D tilt on cards
 * Everything is skipped for touch devices and prefers-reduced-motion.
 */
const MAGNETIC = ".utsBrief > div > span, .studioHeroCta, .navLogin, .navHow, .contactLaunch, .projectControls button, .soundToggle";
const TILT = ".work .project .visual";
const MEDIA = ".project .visual, .collageTile, .serviceMedia, video";
const INTERACTIVE = "a, button, [role=button], input, select, textarea, label";
const PREVENT_SMOOTH = ".howOverlay, .teamOverlay, .caseX, [data-smooth-prevent]";

function canScrollInside(start: Element | null, deltaY: number) {
  for (let el = start; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
    const style = getComputedStyle(el);
    if (!/(auto|scroll)/.test(style.overflowY)) continue;
    if (el.scrollHeight <= el.clientHeight + 1) continue;
    if (deltaY < 0 && el.scrollTop > 0) return true;
    if (deltaY > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
  }
  return false;
}

export default function SiteMotion({ cursorSelector = ".homeCursor" }: { cursorSelector?: string }) {
  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;

    const cleanups: Array<() => void> = [];
    const html = document.documentElement;

    /* ---------- Smooth wheel scroll ---------- */
    let target = window.scrollY;
    let current = window.scrollY;
    let scrolling = false;
    let scrollFrame = 0;
    const previousBehavior = html.style.scrollBehavior;
    const maxScroll = () => html.scrollHeight - window.innerHeight;
    const scrollTick = () => {
      current += (target - current) * 0.095;
      if (Math.abs(target - current) < 0.4) current = target;
      window.scrollTo({ top: current, behavior: "instant" as ScrollBehavior });
      if (current !== target) scrollFrame = requestAnimationFrame(scrollTick);
      else { scrolling = false; html.style.scrollBehavior = previousBehavior; }
    };
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.defaultPrevented) return;
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      const el = event.target instanceof Element ? event.target : null;
      if (el?.closest(PREVENT_SMOOTH) || canScrollInside(el, event.deltaY)) return;
      if (getComputedStyle(document.body).overflow === "hidden" || getComputedStyle(html).overflow === "hidden") return;
      event.preventDefault();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1);
      if (!scrolling) { current = window.scrollY; target = current; html.style.scrollBehavior = "auto"; }
      target = Math.max(0, Math.min(maxScroll(), target + delta));
      if (!scrolling) { scrolling = true; scrollFrame = requestAnimationFrame(scrollTick); }
    };
    // Keyboard, scrollbar or anchor scrolling: drop our animation and follow the native position.
    const onNativeScroll = () => { if (!scrolling) { target = current = window.scrollY; } };
    const cancelSmooth = () => { if (scrolling) { cancelAnimationFrame(scrollFrame); scrolling = false; html.style.scrollBehavior = previousBehavior; target = current = window.scrollY; } };
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("scroll", onNativeScroll, { passive: true });
    window.addEventListener("keydown", cancelSmooth);
    window.addEventListener("pointerdown", cancelSmooth);
    cleanups.push(() => {
      cancelAnimationFrame(scrollFrame);
      html.style.scrollBehavior = previousBehavior;
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onNativeScroll);
      window.removeEventListener("keydown", cancelSmooth);
      window.removeEventListener("pointerdown", cancelSmooth);
    });

    /* ---------- Cursor, magnetic buttons, tilt ---------- */
    const cursor = document.querySelector<HTMLElement>(cursorSelector);
    const mouse = { x: -100, y: -100 };
    const pos = { x: -100, y: -100 };
    let scale = 1;
    let scaleTarget = 1;
    let magnet: HTMLElement | null = null;
    let tilt: HTMLElement | null = null;
    let label = "";
    let cursorFrame = 0;

    const resetMagnet = () => { if (magnet) { magnet.style.transform = ""; magnet = null; } };
    const resetTilt = () => { if (tilt) { tilt.style.transform = ""; tilt = null; } };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      mouse.x = event.clientX;
      mouse.y = event.clientY;
      const el = event.target instanceof Element ? event.target : null;

      const nextMagnet = el?.closest<HTMLElement>(MAGNETIC) ?? null;
      if (nextMagnet !== magnet) resetMagnet();
      magnet = nextMagnet;
      if (magnet) {
        const r = magnet.getBoundingClientRect();
        const dx = event.clientX - (r.left + r.width / 2);
        const dy = event.clientY - (r.top + r.height / 2);
        magnet.style.transition = "transform .35s cubic-bezier(.16,1,.3,1)";
        magnet.style.transform = `translate3d(${dx * 0.28}px, ${dy * 0.38}px, 0)`;
      }

      const nextTilt = el?.closest<HTMLElement>(TILT) ?? null;
      if (nextTilt !== tilt) resetTilt();
      tilt = nextTilt;
      if (tilt) {
        const r = tilt.getBoundingClientRect();
        const px = (event.clientX - r.left) / r.width - 0.5;
        const py = (event.clientY - r.top) / r.height - 0.5;
        tilt.style.transition = "transform .5s cubic-bezier(.16,1,.3,1)";
        tilt.style.transform = `perspective(900px) rotateX(${(-py * 6).toFixed(2)}deg) rotateY(${(px * 8).toFixed(2)}deg) translateZ(0)`;
      }

      const isMedia = !!el?.closest(".workCaseMedia") || (!!el?.closest(MEDIA) && !el?.closest(INTERACTIVE + ", .serviceCard"));
      const isInteractive = !!el?.closest(INTERACTIVE + ", .serviceCard");
      scaleTarget = isMedia ? 5.2 : isInteractive ? 3 : 1;
      const nextLabel = isMedia ? "Ver" : "";
      if (cursor && nextLabel !== label) {
        label = nextLabel;
        const labelEl = cursor.querySelector(".cursorLabel");
        if (labelEl) labelEl.textContent = label;
        cursor.classList.toggle("isMedia", isMedia);
      }
      cursor?.classList.toggle("isActive", isInteractive);
    };
    const onLeave = () => { mouse.x = mouse.y = -100; resetMagnet(); resetTilt(); };
    const cursorTick = () => {
      pos.x += (mouse.x - pos.x) * 0.2;
      pos.y += (mouse.y - pos.y) * 0.2;
      scale += (scaleTarget - scale) * 0.16;
      if (cursor) cursor.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) scale(${scale.toFixed(3)})`;
      cursorFrame = requestAnimationFrame(cursorTick);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    cursorFrame = requestAnimationFrame(cursorTick);
    cleanups.push(() => {
      cancelAnimationFrame(cursorFrame);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      resetMagnet();
      resetTilt();
    });

    return () => cleanups.forEach((fn) => fn());
  }, [cursorSelector]);

  return null;
}
