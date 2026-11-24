"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { WheelProject } from "@/components/project-wheel";
import "./work-grid.css";
import CaseExperience, { type CaseData, caseTags, leadClip } from "./case-experience";

type WorkProject = WheelProject & { preview?: string };

const cases: Record<string, CaseData> = {
  "4U Studio": {
    desc: "Academia de música y producción en Bogotá. Construimos su marca, el sitio web de la academia y las piezas audiovisuales para comunicar «Play your talent».",
    scope: ["Estrategia de marca", "Identidad visual", "Sitio web", "Producción audiovisual"],
    pieces: [{ id: "4u-web", label: "Web academia" }, { id: "4u-clip", label: "Clases en vivo" }, { id: "4u-clip2", label: "Play your talent" }],
  },
  "L'Origine": {
    desc: "Fórmula capilar tricoactivadora. Dirigimos la imagen del producto, diseñamos su tienda web y produjimos los films para redes.",
    scope: ["Identidad de marca", "Dirección visual", "E-commerce", "Films para redes"],
    pieces: [{ id: "lor-film2", label: "Producto" }, { id: "lor-film", label: "Tienda web" }],
  },
  "Kliniu": {
    desc: "Kliniu vende dispensadores e insumos de higiene a hogares y empresas. Diseñamos una tienda que permite comprar por unidad, en packs o en combos, con la foca Kliniu como personaje de marca y Puntos K como programa de fidelización.",
    scope: ["Identidad de marca", "Diseño de personaje", "E-commerce", "Fidelización"],
    pieces: [
      { id: "kliniu-identidad", label: "Identidad de marca", src: "/assets/portfolio/kliniu-identidad.webp", wide: true },
      { id: "kliniu-la-foca", label: "La foca de Kliniu", src: "/assets/portfolio/kliniu-la-foca.webp", wide: true },
      { id: "kliniu-home", label: "Tienda digital", src: "/assets/portfolio/kliniu-home.webp", wide: true },
    ],
  },
  "GEU": {
    desc: "Diseñamos una plataforma para las seis unidades del Grupo Empresarial Universal. Cada marca tiene su propio catálogo e identidad y comparte el carrito y las cuentas de cliente. Gus, un castor ingeniero, conecta las seis experiencias.",
    scope: ["Arquitectura de marca", "Plataforma multimarca", "Diseño de personaje", "Herramientas interactivas"],
    pieces: [
      { id: "geu-sistema-de-marca", label: "Sistema de marca", src: "/assets/portfolio/geu-sistema-de-marca.webp", wide: true },
      { id: "geu-home", label: "Ecosistema web", src: "/assets/portfolio/geu-home.webp", wide: true },
      { id: "geu-gus-mascota", label: "Gus, la mascota", src: "/assets/portfolio/geu-gus-mascota.webp", wide: true },
    ],
  },
  "Totalpars": {
    desc: "Totalpars es un marketplace B2B de repuestos para buses, camiones y maquinaria pesada. El catálogo usa un bus en rayos X para explorar sus sistemas y ofrece búsqueda por imagen y un asistente que orienta desde el síntoma.",
    scope: ["Identidad visual", "Marketplace B2B", "Diseño de búsqueda", "Diseño de personaje"],
    pieces: [
      { id: "totalpars-identidad", label: "Identidad visual", src: "/assets/portfolio/totalpars-identidad.webp", wide: true },
      { id: "totalpars-home", label: "Tienda de repuestos", src: "/assets/portfolio/totalpars-home.webp", wide: true },
      { id: "totalpars-bus-rayos-x", label: "Búsqueda por sistema del bus", src: "/assets/portfolio/totalpars-bus-rayos-x.webp", wide: true },
    ],
  },
  "Drokex": {
    desc: "Drokex conecta a proveedores latinoamericanos con compradores internacionales. Los proveedores publican su catálogo y los compradores los encuentran por país o categoría para negociar directamente. Drokex World y el agente 3D forman parte de la experiencia.",
    scope: ["Identidad de marca", "Catálogo B2B", "Diseño de personaje", "Experiencia 3D"],
    pieces: [
      { id: "drokex-identidad", label: "Identidad de marca", src: "/assets/portfolio/drokex-identidad.webp", wide: true },
      { id: "drokex-personaje", label: "Personaje 3D", src: "/assets/portfolio/drokex-personaje.webp", wide: true },
      { id: "drokex-drokex-world", label: "Drokex World", src: "/assets/portfolio/drokex-drokex-world.webp", wide: true },
    ],
  },
};

const logos: Record<string, string> = {
  "4U Studio": "4u-logo", "L'Origine": "lor-logo", "Kliniu": "kli-logo", "GEU": "geu-logo", "Totalpars": "tp-logo", "Drokex": "dx-logo",
};

function playPreview(video: HTMLVideoElement | null) {
  if (!video) return;
  video.muted = true;
  void video.play().catch(() => {});
}

function slugify(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function WorkGrid({ projects }: { projects: WorkProject[] }) {
  const [open, setOpen] = useState<WheelProject | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const list = useRef<HTMLUListElement>(null);
  const [morph, setMorph] = useState(false);
  const previewIntent = open ? null : hovered ?? focused;

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: no-preference)");
    const timer = window.setTimeout(
      () => setPreviewing(motion.matches ? previewIntent : null),
      previewIntent ? 140 : 520,
    );
    const onMotionChange = () => {
      window.clearTimeout(timer);
      setPreviewing(null);
    };

    motion.addEventListener("change", onMotionChange);
    return () => {
      window.clearTimeout(timer);
      motion.removeEventListener("change", onMotionChange);
    };
  }, [previewIntent]);

  // Lusion-style entrance: cards rise in, the image zooms back inside its frame, then a soft parallax while scrolling.
  useEffect(() => {
    const root = list.current;
    if (!root) return;
    const head = root.closest("section")?.querySelector<HTMLElement>(".workHead");
    const items = Array.from(root.querySelectorAll<HTMLElement>(".workCase"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      items.forEach((item) => item.classList.add("isIn"));
      head?.classList.add("isIn");
      return;
    }
    const visible = new Set<HTMLElement>();
    const reveal = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const item = entry.target as HTMLElement;
        if (entry.isIntersecting) {
          item.classList.add("isIn");
          visible.add(item);
        } else {
          visible.delete(item);
        }
      }
      schedule();
    }, { threshold: .12, rootMargin: "0px 0px -8% 0px" });
    items.forEach((item) => reveal.observe(item));
    const headReveal = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { head?.classList.add("isIn"); headReveal.disconnect(); }
    }, { threshold: .3 });
    if (head) headReveal.observe(head);

    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      visible.forEach((item) => {
        const media = item.querySelector<HTMLElement>(".workCaseMedia");
        if (!media) return;
        const rect = media.getBoundingClientRect();
        const offset = (rect.top + rect.height / 2 - vh / 2) / (vh / 2 + rect.height / 2);
        media.style.setProperty("--para", Math.max(-1, Math.min(1, offset)).toFixed(3));
      });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      reveal.disconnect();
      headReveal.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [projects]);

  const openRef = useRef(open);
  useEffect(() => { openRef.current = open; }, [open]);

  const canMorph = () => typeof document !== "undefined" && "startViewTransition" in document
    && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const buttonFor = useCallback((title: string) =>
    list.current?.querySelector<HTMLButtonElement>(`.workCaseButton[data-title="${CSS.escape(title)}"]`) ?? null, []);

  // Runs a React update inside a view transition (shared element "work-case-media").
  const morphTo = useCallback((update: () => void, after?: () => void) => {
    if (!canMorph()) {
      update();
      after?.();
      return;
    }
    const root = document.documentElement;
    root.dataset.caseTransition = "";
    const transition = document.startViewTransition(() => flushSync(update));
    const done = () => { delete root.dataset.caseTransition; after?.(); };
    void transition.finished.then(done, done);
  }, []);

  // Card → full-screen project page.
  const openCase = (project: WheelProject, button: HTMLButtonElement) => {
    setHovered(null);
    const media = button.querySelector<HTMLElement>(".workCaseMedia");
    const useMorph = !!media && canMorph();
    if (media && useMorph) media.style.viewTransitionName = "work-case-media";
    history.pushState({ orkCase: project.title }, "", `#caso-${slugify(project.title)}`);
    morphTo(() => {
      if (media) media.style.viewTransitionName = "";
      setMorph(useMorph);
      setOpen(project);
    });
  };

  // Project page → back into its card.
  const closeCase = useCallback(() => {
    const current = openRef.current;
    if (!current) return;
    const button = buttonFor(current.title);
    const media = button?.querySelector<HTMLElement>(".workCaseMedia");
    if (!button || !media || !canMorph()) {
      setOpen(null);
      button?.focus({ preventScroll: true });
      return;
    }
    const rect = media.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      window.scrollTo({ top: window.scrollY + rect.top - (window.innerHeight - rect.height) / 2, behavior: "instant" as ScrollBehavior });
    }
    morphTo(() => {
      setOpen(null);
      media.style.viewTransitionName = "work-case-media";
    }, () => {
      media.style.viewTransitionName = "";
      button.focus({ preventScroll: true });
    });
  }, [buttonFor, morphTo]);

  const close = useCallback(() => {
    if ((history.state as { orkCase?: string } | null)?.orkCase) history.back();
    else closeCase();
  }, [closeCase]);

  // Next-project teaser → next project's hero.
  const goNext = useCallback((teaser: HTMLElement | null) => {
    const current = openRef.current;
    if (!current) return;
    const index = projects.findIndex((project) => project.title === current.title);
    const next = projects[(index + 1) % projects.length];
    history.replaceState({ orkCase: next.title }, "", `#caso-${slugify(next.title)}`);
    if (!teaser || !canMorph()) {
      setOpen(next);
      return;
    }
    const hero = document.querySelector<HTMLElement>(".caseXHeroMedia");
    if (hero) hero.style.viewTransitionName = "none";
    teaser.style.viewTransitionName = "work-case-media";
    morphTo(() => {
      setMorph(true);
      setOpen(next);
    });
  }, [projects, morphTo]);

  // Browser back closes the project; deep links (#caso-...) open it directly.
  useEffect(() => {
    const onPop = () => {
      if (openRef.current && !(history.state as { orkCase?: string } | null)?.orkCase) closeCase();
    };
    window.addEventListener("popstate", onPop);
    const fromHash = window.location.hash.startsWith("#caso-")
      ? projects.find((project) => `#caso-${slugify(project.title)}` === window.location.hash)
      : undefined;
    if (fromHash) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
      history.pushState({ orkCase: fromHash.title }, "", `#caso-${slugify(fromHash.title)}`);
      setMorph(false);
      setOpen(fromHash);
    }
    return () => window.removeEventListener("popstate", onPop);
  }, [projects, closeCase]);

  const openIndex = open ? projects.findIndex((project) => project.title === open.title) : -1;

  return (
    <>
      <ul className="workGrid" role="list" ref={list}>
        {projects.map((project, index) => {
          const clips = project.motion ?? [];
          const clip = clips.find(({ src }) => src === project.preview) ?? leadClip(clips);
          const showPreview = !open && previewing === project.title;

          return (
            <li className={`workCase workCase-${index}`} style={{ "--col": index % 2 } as React.CSSProperties} key={project.title}>
              <button
                type="button"
                className="workCaseButton"
                data-title={project.title}
                aria-label={`Ver lo que hicimos con ${project.title}`}
                aria-haspopup="dialog"
                onPointerEnter={(event) => {
                  if (event.pointerType === "mouse") setHovered(project.title);
                }}
                onPointerLeave={() => setHovered(null)}
                onFocus={(event) => {
                  if (event.currentTarget.matches(":focus-visible")) setFocused(project.title);
                }}
                onBlur={() => setFocused(null)}
                onClick={(event) => openCase(project, event.currentTarget)}
              >
                <span className="workCaseMedia" data-preview={previewIntent === project.title ? "" : undefined}>
                  <img src={project.media} alt="" loading="lazy" decoding="async" />
                  {showPreview && clip && clip.kind !== "image" && (
                    <video
                      ref={playPreview}
                      src={clip.src}
                      muted
                      loop
                      playsInline
                      preload="none"
                      aria-hidden="true"
                      style={{ objectPosition: clip.position, objectFit: clip.fit, background: clip.bg }}
                      onLoadedMetadata={(event) => {
                        if (clip.startAt) event.currentTarget.currentTime = clip.startAt;
                      }}
                      onPlaying={(event) => event.currentTarget.classList.add("isPlaying")}
                    />
                  )}
                </span>
                <span className="workCaseInfo">
                  <span className="workCaseMeta">{caseTags(project.meta).join("  •  ")}{project.year ? `  •  ${project.year}` : ""}</span>
                  <span className="workCaseTitle"><span className="workCaseTitleText">{project.title}</span><span className="workCaseTitleArrow" aria-hidden="true">↗</span></span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {open && openIndex >= 0 && (
        <CaseExperience
          key={open.title}
          project={open}
          data={cases[open.title]}
          logo={`/assets/logos/${(logos[open.title] ?? "").replace("-logo", "")}.png`}
          index={openIndex}
          total={projects.length}
          next={projects[(openIndex + 1) % projects.length]}
          morph={morph}
          onClose={close}
          onNext={goNext}
        />
      )}
    </>
  );
}
