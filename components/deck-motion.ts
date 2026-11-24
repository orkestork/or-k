import { createLiquidMedia, type LiquidMedia } from "./liquid-media";

/**
 * Motion layer for the /servicios deck (horizontal rail of full-screen slides):
 *  - every slide gets --pos (signed distance from centre, in slides) and --apos (absolute),
 *    used by CSS for the card-like shrink / rounded corners / image parallax while sliding
 *  - the centred slide gets .isActive so its content rises in, staggered (--r per element)
 *  - capability images become liquid WebGL cards: violet duotone while moving,
 *    real colour once the slide lands, ripples from the cursor, edges that wobble with rail speed
 */
const REVEAL = [
  ".deckLabel", "h1", "h2", ".deckMeta", ".deckLead", ".deckBody", ".deckTags li", ".capWorkBtn",
  ".deckIndex li", ".deckUts li", ".devMethodTop blockquote", ".devMethodSteps li", ".devEyebrow",
  ".deckClose > img", ".deckClose > .deckClaim", ".deckClose > a",
].join(",");

type Card = { slide: HTMLElement; host: HTMLElement; canvas: HTMLCanvasElement; liquid: LiquidMedia; rect: [number, number, number, number] };
const PAD = 40;

export function startDeckMotion(rail: HTMLElement) {
  const slides = Array.from(rail.children) as HTMLElement[];
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  rail.classList.add("deckFx");

  // Stagger order inside each slide.
  slides.forEach((slide) => {
    slide.querySelectorAll<HTMLElement>(REVEAL).forEach((el, i) => {
      el.classList.add("deckReveal");
      el.style.setProperty("--r", String(i));
    });
  });

  if (reduced) {
    slides.forEach((slide) => slide.classList.add("isActive"));
    return () => rail.classList.remove("deckFx");
  }

  // Liquid capability images (desktop with a mouse).
  const cards: Card[] = [];
  const desktop = window.matchMedia("(min-width: 901px) and (hover: hover)").matches;
  if (desktop) {
    slides.forEach((slide, i) => {
      const host = slide.querySelector<HTMLElement>(".deckCapImage");
      const image = host?.querySelector<HTMLImageElement>("img");
      if (!host || !image) return;
      image.loading = "eager";
      const canvas = document.createElement("canvas");
      canvas.className = "deckLiquid";
      canvas.setAttribute("aria-hidden", "true");
      host.appendChild(canvas);
      try {
        const liquid = createLiquidMedia({ canvas, image, pad: PAD, seed: i * .41 });
        cards.push({ slide, host, canvas, liquid, rect: [0, 0, 1, 1] });
      } catch {
        canvas.remove();
      }
    });
    if (cards.length) rail.classList.add("deckGL");
  }

  const cleanups: Array<() => void> = [];
  for (const card of cards) {
    const local = (event: PointerEvent) => {
      const r = card.canvas.getBoundingClientRect();
      const [x0, y0, x1, y1] = card.rect;
      return [(event.clientX - r.left - x0) / (x1 - x0), 1 - (event.clientY - r.top - y0) / (y1 - y0)] as const;
    };
    const enter = (event: PointerEvent) => card.liquid.setHover(true, ...local(event));
    const move = (event: PointerEvent) => card.liquid.setMouse(...local(event));
    const leave = () => card.liquid.setHover(false);
    card.host.addEventListener("pointerenter", enter);
    card.host.addEventListener("pointermove", move, { passive: true });
    card.host.addEventListener("pointerleave", leave);
    cleanups.push(() => {
      card.host.removeEventListener("pointerenter", enter);
      card.host.removeEventListener("pointermove", move);
      card.host.removeEventListener("pointerleave", leave);
    });
  }

  const resize = () => cards.forEach((card) => card.liquid.resize());
  const observer = new ResizeObserver(resize);
  cards.forEach((card) => observer.observe(card.host));

  let frame = 0;
  let last = performance.now();
  let lastLeft = rail.scrollLeft;
  let speed = 0;
  let activeIndex = -1;
  const loop = (now: number) => {
    frame = requestAnimationFrame(loop);
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    const width = Math.max(1, rail.clientWidth);
    const left = rail.scrollLeft;
    speed += ((left - lastLeft) - speed) * .3;
    lastLeft = left;

    const current = Math.round(left / width);
    slides.forEach((slide, i) => {
      const pos = i - left / width;
      if (Math.abs(pos) > 1.5) return;
      slide.style.setProperty("--pos", pos.toFixed(4));
      slide.style.setProperty("--apos", Math.min(1, Math.abs(pos)).toFixed(4));
    });
    if (current !== activeIndex) {
      // Keep only the landed slide active so its reveal replays each time you arrive.
      slides.forEach((slide, i) => slide.classList.toggle("isActive", i === current));
      activeIndex = current;
    }

    for (const card of cards) {
      const i = slides.indexOf(card.slide);
      const pos = i - left / width;
      if (Math.abs(pos) > 1.2) continue;
      const w = card.canvas.clientWidth;
      const h = card.canvas.clientHeight;
      // Rounded card, bleeding off the right edge, lagging a little behind its slide.
      const lag = pos * w * .18;
      card.rect = [PAD + lag, PAD, w + 60 + lag, h - PAD];
      card.liquid.setRect(card.rect[0], card.rect[1], card.rect[2], card.rect[3], 26);
      card.liquid.setReveal(Math.max(0, 1 - Math.abs(pos) * 2.4));
      card.liquid.frame(dt, speed * .25);
    }
  };
  frame = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    cleanups.forEach((fn) => fn());
    cards.forEach((card) => { card.liquid.dispose(); card.canvas.remove(); });
    rail.classList.remove("deckFx", "deckGL");
  };
}
