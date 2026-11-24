"use client";

import { useEffect, useRef } from "react";
import { createLiquidMedia, type LiquidMedia } from "./liquid-media";
import "./uts-motion.css";

const PAD = 48; // canvas overscan (flow mode) so the wavy edges can bulge outside the card

type Surface = {
  card: HTMLElement;
  media: HTMLElement;
  host: HTMLElement;
  canvas: HTMLCanvasElement;
  liquid: LiquidMedia;
  side: "left" | "right";
  rect: [number, number, number, number];
  grow: number;
};

const ease = (t: number) => t * t * (3 - 2 * t);
const range = (v: number, a: number, b: number) => Math.max(0, Math.min(1, (v - a) / (b - a)));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * UTS Method.
 * Desktop ("scenes"): each phase gets its own pinned moment. The image starts as a
 * zig-zag card (right → left → right), grows to almost full screen with the liquid
 * wave and turns from violet duotone to real colour, then shrinks and leaves while
 * the next phase takes over.
 * Mobile ("flow"): simple zig-zag column with a line that draws with the scroll.
 */
export default function UtsMotion() {
  const anchor = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const path = useRef<SVGPathElement>(null);

  useEffect(() => {
    const section = anchor.current?.closest("section");
    const stage = anchor.current?.parentElement;
    if (!section || !stage) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sceneMode = !reduced && window.matchMedia("(min-width: 901px) and (min-height: 620px)").matches;
    section.classList.add("utsFx", sceneMode ? "utsScenes" : "utsFlow");
    const cards = Array.from(section.querySelectorAll<HTMLElement>(".serviceCard"));
    const brief = section.querySelector<HTMLElement>(".utsBrief");
    const row = section.querySelector<HTMLElement>(".serviceCards");
    cards.forEach((card, i) => {
      card.style.setProperty("--k", String(i));
      card.dataset.side = i % 2 === 0 ? "right" : "left";
    });

    if (reduced) {
      cards.forEach((card) => card.classList.add("isIn"));
      brief?.classList.add("isIn");
    }
    const reveal = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("isIn");
          reveal.unobserve(entry.target);
        }
      }
    }, { threshold: sceneMode ? .05 : .25, rootMargin: "0px 0px -10% 0px" });
    if (!reduced) {
      cards.forEach((card) => reveal.observe(card));
      if (brief) reveal.observe(brief);
    }

    /* ---------- Flow mode: connecting line ---------- */
    let samples: number[] = [];
    const drawPath = () => {
      const p = path.current;
      const s = svg.current;
      if (sceneMode || !p || !s || !row) return;
      const box = stage.getBoundingClientRect();
      const w = stage.clientWidth;
      const h = stage.scrollHeight;
      s.setAttribute("viewBox", `0 0 ${w} ${h}`);
      s.style.height = `${h}px`;
      const start = brief ? brief.getBoundingClientRect().bottom - box.top + 30 : 0;
      let d = `M ${w / 2} ${start}`;
      let prev = { x: w / 2, y: start };
      cards.forEach((card) => {
        const media = card.querySelector<HTMLElement>(".serviceMedia") ?? card;
        const x0 = card.offsetLeft + media.offsetLeft;
        const y0 = card.offsetTop + media.offsetTop + (row.offsetTop || 0);
        const mw = media.offsetWidth;
        const mh = media.offsetHeight;
        const right = card.dataset.side === "right";
        const tx = right ? x0 : x0 + mw;
        const ty = y0 + mh * .5;
        const midY = (prev.y + ty) / 2;
        d += ` C ${prev.x} ${midY}, ${tx} ${midY}, ${tx} ${ty}`;
        prev = { x: right ? x0 + mw : x0, y: ty };
        d += ` L ${prev.x} ${prev.y}`;
      });
      p.setAttribute("d", d);
      const total = p.getTotalLength();
      samples = Array.from({ length: 401 }, (_, i) => p.getPointAtLength((total * i) / 400).y);
    };

    /* ---------- Liquid surfaces ---------- */
    const coarse = window.matchMedia("(hover: none)").matches;
    const surfaces: Surface[] = [];
    if (!reduced) {
      cards.forEach((card, i) => {
        const media = card.querySelector<HTMLElement>(".serviceMedia");
        const image = media?.querySelector<HTMLImageElement>("img");
        const host = sceneMode ? card.querySelector<HTMLElement>(".serviceSticky") : card;
        if (!media || !image || !host) return;
        const canvas = document.createElement("canvas");
        canvas.className = sceneMode ? "utsLiquid utsLiquidFull" : "utsLiquid";
        canvas.setAttribute("aria-hidden", "true");
        host.appendChild(canvas);
        try {
          const liquid = createLiquidMedia({ canvas, image, video: media.querySelector("video"), pad: sceneMode ? 0 : PAD, seed: i * .37 });
          surfaces.push({ card, media, host, canvas, liquid, side: i % 2 === 0 ? "right" : "left", rect: [0, 0, 1, 1], grow: 0 });
        } catch {
          canvas.remove();
        }
      });
    }
    if (surfaces.length) section.classList.add("utsGL");

    const place = () => {
      for (const s of surfaces) {
        if (!sceneMode) {
          // offset* ignore transforms, so the canvas stays glued to the image while the card animates.
          s.canvas.style.left = `${s.media.offsetLeft - PAD}px`;
          s.canvas.style.top = `${s.media.offsetTop - PAD}px`;
          s.canvas.style.width = `${s.media.offsetWidth + PAD * 2}px`;
          s.canvas.style.height = `${s.media.offsetHeight + PAD * 2}px`;
        }
        s.liquid.resize();
      }
      drawPath();
    };
    place();
    const resizeObserver = new ResizeObserver(place);
    resizeObserver.observe(stage);

    const pointer = (s: Surface, event: PointerEvent) => {
      if (sceneMode) {
        const host = s.host.getBoundingClientRect();
        const [x0, y0, x1, y1] = s.rect;
        return [(event.clientX - host.left - x0) / (x1 - x0), 1 - (event.clientY - host.top - y0) / (y1 - y0)] as const;
      }
      const r = s.media.getBoundingClientRect();
      return [(event.clientX - r.left) / r.width, 1 - (event.clientY - r.top) / r.height] as const;
    };
    const cleanups: Array<() => void> = [];
    for (const s of surfaces) {
      const target = sceneMode ? s.host : s.card;
      const enter = (event: PointerEvent) => { if (event.pointerType === "mouse") s.liquid.setHover(true, ...pointer(s, event)); };
      const move = (event: PointerEvent) => s.liquid.setMouse(...pointer(s, event));
      const leave = () => s.liquid.setHover(false);
      target.addEventListener("pointerenter", enter);
      target.addEventListener("pointermove", move, { passive: true });
      target.addEventListener("pointerleave", leave);
      cleanups.push(() => {
        target.removeEventListener("pointerenter", enter);
        target.removeEventListener("pointermove", move);
        target.removeEventListener("pointerleave", leave);
      });
    }

    /* ---------- Scene geometry (desktop) ---------- */
    // Lusion "project page" layout: text column on one side, the image on the other
    // bleeding off the screen edge. The image slides in from its edge, the text rises in.
    // Horizontal track: vertical scroll drives the panels sideways (see CSS .utsScenes).
    const track = row;
    const updateTrack = () => {
      if (!track) return;
      // offsetTop changes while the track is stuck, so measure from the stage's bottom edge:
      // the pin lasts exactly the spacer's height (::after, 230vh) and ends when stage.bottom == vh.
      const r = stage.getBoundingClientRect();
      const vh = window.innerHeight;
      const travel = parseFloat(getComputedStyle(stage, "::after").height) || vh * 2.3;
      const p = 1 - range(r.bottom - vh, 0, travel);
      track.style.setProperty("--x", (p * (cards.length - 1)).toFixed(4));
      track.style.setProperty("--xp", p.toFixed(4));
    };

    const scene = (s: Surface, dt: number) => {
      const vw = s.host.clientWidth;
      const vh = s.host.clientHeight;
      // Panel position: 1 = waiting at the right, 0 = centred, -1 = gone to the left.
      const pos = s.card.getBoundingClientRect().left / Math.max(1, vw);
      const enter = ease(1 - Math.min(1, Math.max(0, pos)));
      const leave = ease(Math.min(1, Math.max(0, -pos)));

      const top = Math.max(110, vh * .15);
      const bottom = vh * .88;
      const bleed = 60;
      // Inner parallax: the image lags behind its panel, then catches up.
      const lag = pos * vw * .1;
      const rect: Surface["rect"] = s.side === "right"
        ? [vw * .5 + lag, top, vw + bleed + lag, bottom]
        : [-bleed + lag, top, vw * .5 + lag, bottom];
      s.rect = rect;

      const speed = (enter - s.grow) / Math.max(dt, 1 / 120);
      s.grow = enter;
      s.liquid.setRect(rect[0], rect[1], rect[2], rect[3], 24);
      s.liquid.setReveal(ease(range(enter, .6, 1)) * (1 - leave * .6));
      s.host.style.setProperty("--e", enter.toFixed(4));
      s.host.style.setProperty("--leave", leave.toFixed(4));
      return speed;
    };

    /* ---------- Shared loop ---------- */
    let running = false;
    let frame = 0;
    let last = performance.now();
    let lastY = window.scrollY;
    let velocity = 0;
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const delta = window.scrollY - lastY;
      lastY = window.scrollY;
      velocity += (delta - velocity) * .25;
      const vh = window.innerHeight;

      if (!sceneMode) {
        if (path.current && samples.length) {
          const readY = vh * .62 - stage.getBoundingClientRect().top;
          let i = 0;
          while (i < samples.length - 1 && samples[i + 1] <= readY) i++;
          path.current.style.strokeDashoffset = String(1 - (samples[0] > readY ? 0 : i / (samples.length - 1)));
        }
        cards.forEach((card, i) => {
          const r = card.getBoundingClientRect();
          const offset = (r.top + r.height / 2 - vh / 2) / vh;
          card.style.setProperty("--drift", `${(offset * (i % 2 ? -40 : 40)).toFixed(1)}px`);
        });
      }

      if (sceneMode) updateTrack();
      for (const s of surfaces) {
        let extra = 0;
        if (sceneMode) {
          const r = s.card.getBoundingClientRect();
          if (r.bottom < -50 || r.top > vh + 50 || r.right < -50 || r.left > window.innerWidth + 50) continue; // off screen
          extra = scene(s, dt) * 4;
        } else if (coarse) {
          const m = s.media.getBoundingClientRect();
          s.liquid.setReveal(1 - Math.min(1, Math.abs(m.top + m.height / 2 - vh / 2) / (vh * .35)));
        }
        s.liquid.frame(dt, velocity + extra);
      }
    };
    const near = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running) {
        running = true;
        last = performance.now();
        lastY = window.scrollY;
        place();
        frame = requestAnimationFrame(loop);
      } else if (!entry.isIntersecting && running) {
        running = false;
        cancelAnimationFrame(frame);
      }
    }, { rootMargin: "15% 0px" });
    if (!reduced) near.observe(section);

    return () => {
      reveal.disconnect();
      near.disconnect();
      resizeObserver.disconnect();
      cancelAnimationFrame(frame);
      cleanups.forEach((fn) => fn());
      surfaces.forEach((s) => { s.liquid.dispose(); s.canvas.remove(); });
      section.classList.remove("utsFx", "utsFlow", "utsScenes", "utsGL");
    };
  }, []);

  return (
    <div className="utsPathWrap" ref={anchor} aria-hidden="true">
      <svg ref={svg} className="utsPath" preserveAspectRatio="none">
        <defs>
          <linearGradient id="utsPathGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#BDA5FF" />
            <stop offset=".5" stopColor="#7C3CFF" />
            <stop offset="1" stopColor="#4B1F8C" />
          </linearGradient>
        </defs>
        <path ref={path} pathLength={1} />
      </svg>
    </div>
  );
}
