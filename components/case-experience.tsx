"use client";

import { useEffect, useRef } from "react";
import type { ProjectClip, WheelProject } from "@/components/project-wheel";
import "./case-experience.css";

/** `src` overrides /assets/pieces/<id>.jpg; `wide` shows the piece full width at its own proportions (no square crop). */
export type CaseData = { desc: string; scope: string[]; pieces: { id: string; label: string; src?: string; wide?: boolean }[] };

type Shot = { key: string; kind: "video" | "image"; src: string; label?: string; clip?: ProjectClip };

export function caseTags(meta: string) {
  return meta.split("/").map((tag) => tag.trim()).filter(Boolean);
}

export function leadClip(clips: ProjectClip[]) {
  return clips.find((clip) => !clip.src.includes("intro") && clip.kind !== "image") ?? clips[0];
}

/**
 * Full-screen project page (Lusion style): the card opens into a full-bleed hero,
 * then intro + services, a gallery that reveals as you scroll, and a "next project"
 * block that grows to full screen and carries you into the next brand.
 */
export default function CaseExperience({
  project, data, logo, index, total, next, morph, onClose, onNext,
}: {
  project: WheelProject;
  data?: CaseData;
  logo: string;
  index: number;
  total: number;
  next: WheelProject;
  morph: boolean;
  onClose: () => void;
  onNext: (media: HTMLElement | null) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const nextSection = useRef<HTMLElement>(null);
  const nextMedia = useRef<HTMLElement>(null);
  const advanced = useRef(false);

  const clips = (project.motion ?? []).filter((clip, i, all) => all.findIndex((c) => c.src === clip.src) === i);
  const lead = leadClip(clips);
  const allShots: Shot[] = [
    ...clips.filter((clip) => clip !== lead).map((clip) => ({ key: clip.src, kind: (clip.kind === "image" ? "image" : "video") as Shot["kind"], src: clip.src, clip })),
    ...(data?.pieces ?? []).map((piece) => {
      const src = piece.src ?? `/assets/pieces/${piece.id}.jpg`;
      return { key: piece.id, kind: "image" as const, src, label: piece.label, clip: piece.wide ? { src, duration: 0, kind: "image" as const } : undefined };
    }),
  ];
  // Films run full width (16:9); the square brand pieces go in a 3-up grid so nothing gets cropped.
  const wide = (shot: Shot) => shot.kind === "video" || !!shot.clip;
  const shots = [...allShots.filter(wide), ...allShots.filter((shot) => !wide(shot))];

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [onClose]);

  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Reveal blocks + play videos only while visible.
    const reveal = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        if (entry.isIntersecting) el.classList.add("isIn");
        el.querySelectorAll("video").forEach((video) => {
          if (entry.isIntersecting && !reduced) void video.play().catch(() => {});
          else if (!entry.isIntersecting) video.pause();
        });
      }
    }, { root, threshold: .15 });
    root.querySelectorAll(".caseXReveal").forEach((el) => reveal.observe(el));

    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = root.clientHeight;
      const top = root.scrollTop;
      root.style.setProperty("--hero-p", Math.min(1, top / vh).toFixed(4));

      root.querySelectorAll<HTMLElement>(".caseXShot.isIn").forEach((shot) => {
        const rect = shot.getBoundingClientRect();
        const offset = (rect.top + rect.height / 2 - vh / 2) / (vh / 2 + rect.height / 2);
        shot.style.setProperty("--para", Math.max(-1, Math.min(1, offset)).toFixed(3));
      });

      const section = nextSection.current;
      if (section) {
        const travel = Math.max(1, section.offsetHeight - vh);
        const p = Math.min(1, Math.max(0, (top - section.offsetTop) / travel));
        const eased = p * p * (3 - 2 * p);
        section.style.setProperty("--np", eased.toFixed(4));
        if (p >= .995 && !advanced.current) {
          advanced.current = true;
          onNext(nextMedia.current);
        }
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    root.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      reveal.disconnect();
      cancelAnimationFrame(frame);
      root.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [onNext]);

  const renderMedia = (shot: { kind: "video" | "image"; src: string; clip?: ProjectClip }, eager = false) =>
    shot.kind === "image"
      ? <img src={shot.src} alt="" loading={eager ? "eager" : "lazy"} decoding="async" />
      : <video src={shot.src} muted loop playsInline autoPlay={eager} preload={eager ? "auto" : "metadata"}
          style={{ objectFit: shot.clip?.fit, objectPosition: shot.clip?.position, background: shot.clip?.bg }}
          onLoadedMetadata={(event) => { if (shot.clip?.startAt) event.currentTarget.currentTime = shot.clip.startAt; }} />;

  const title = project.title;
  const number = String(index + 1).padStart(2, "0");

  return (
    <div className={`caseX${morph ? " isMorph" : ""}`} ref={scroller} role="dialog" aria-modal="true" aria-labelledby="caseX-title">
      <header className="caseXBar">
        <button type="button" className="caseXBack" onClick={onClose} autoFocus><span aria-hidden="true">←</span> Volver</button>
        <span className="caseXCount">{number} / {String(total).padStart(2, "0")}</span>
        <a className="caseXLive" href={project.url} target="_blank" rel="noreferrer">Ver en vivo <span aria-hidden="true">↗</span></a>
      </header>

      <section className="caseXHero">
        <figure className="caseXHeroMedia" style={{ viewTransitionName: morph ? "work-case-media" : undefined }}>
          {lead ? renderMedia({ kind: lead.kind === "image" ? "image" : "video", src: lead.src, clip: lead }, true) : <img src={project.media} alt="" />}
        </figure>
        <div className="caseXHeroShade" aria-hidden="true" />
        <div className="caseXHeroCopy">
          <span className="caseXKicker">{caseTags(project.meta).join("  •  ")}</span>
          <h2 id="caseX-title" aria-label={title}>
            {Array.from(title).map((char, i) => (
              <span className="caseXChar" aria-hidden="true" style={{ "--i": i } as React.CSSProperties} key={`${char}-${i}`}>{char === " " ? " " : char}</span>
            ))}
          </h2>
          <span className="caseXScroll" aria-hidden="true">Desplázate para explorar <b>↓</b></span>
        </div>
      </section>

      <section className="caseXIntro">
        <div className="caseXIntroMain caseXReveal">
          <span className="caseXMark" role="img" aria-label={`Logo ${title}`} style={{ maskImage: `url(${logo})`, WebkitMaskImage: `url(${logo})` } as React.CSSProperties} />
          <p className="caseXDesc">{data?.desc}</p>
        </div>
        <aside className="caseXFacts caseXReveal">
          <div><h3>Servicios</h3><ul>{(data?.scope ?? caseTags(project.meta)).map((item) => <li key={item}>{item}</li>)}</ul></div>
          <div><h3>Cliente</h3><p>{title}</p></div>
          <div><h3>Año</h3><p>{project.year}</p></div>
          <a className="caseXLaunch" href={project.url} target="_blank" rel="noreferrer"><i aria-hidden="true" />Ver proyecto en vivo</a>
        </aside>
      </section>

      <section className={`caseXGallery${shots.filter((shot) => !wide(shot)).length % 3 !== 0 && shots.filter((shot) => !wide(shot)).length % 2 === 0 ? " isPairs" : ""}`} aria-label={`Piezas de ${title}`}>
        {shots.map((shot, i) => (
          <figure className={`caseXShot caseXReveal ${shot.kind === "video" ? "isWide" : shot.clip ? "isWide isStill" : "isTile"}`} key={shot.key}>
            <div className="caseXShotFrame">{renderMedia(shot)}</div>
            {shot.label && <figcaption><span>{String(i + 1).padStart(2, "0")}</span>{shot.label}</figcaption>}
          </figure>
        ))}
      </section>

      <section className="caseXNext" ref={nextSection}>
        <div className="caseXNextPin">
          <button type="button" className="caseXNextHit" onClick={() => { if (!advanced.current) { advanced.current = true; onNext(nextMedia.current); } }} aria-label={`Siguiente proyecto: ${next.title}`}>
            <span className="caseXNextMedia" ref={nextMedia}><img src={next.media} alt="" loading="lazy" /></span>
          </button>
          <div className="caseXNextCopy" aria-hidden="true">
            <span>Siguiente proyecto</span>
            <strong>{next.title}</strong>
          </div>
          <div className="caseXNextBar" aria-hidden="true"><i /></div>
          <span className="caseXNextHint" aria-hidden="true">Sigue bajando</span>
        </div>
      </section>
    </div>
  );
}
