"use client";

import { useEffect, useRef, useState } from "react";
import "./home-showreel.css";
import { createReelWave, type ReelInsets } from "./reel-wave";

// Huella Digital "VIDEO HOME". If the original file is dropped at HUELLA_FILE it is used directly
// (keeps the WebGL liquid wave); otherwise the YouTube upload plays (CSS expansion, no shader).
const HUELLA_FILE = "/assets/huella/home.mp4";
const HUELLA_YT = "Dr3d51jiRuE";
const reelPath = HUELLA_FILE;
const posterPath = "/assets/ork-showreel-poster.jpg";
const ytPreview = `https://www.youtube-nocookie.com/embed/${HUELLA_YT}?autoplay=1&mute=1&controls=0&loop=1&playlist=${HUELLA_YT}&start=1&end=19&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1`;
const ytFull = `https://www.youtube-nocookie.com/embed/${HUELLA_YT}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;

export default function HomeShowreel() {
  const stage = useRef<HTMLDivElement>(null);
  const preview = useRef<HTMLVideoElement>(null);
  const launch = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const player = useRef<HTMLVideoElement>(null);
  const activeTransition = useRef<ViewTransition | null>(null);
  const previousOverflow = useRef<string | null>(null);
  const syncPreview = useRef(() => {});
  const section = useRef<HTMLElement>(null);
  const ring = useRef<SVGCircleElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const target = useRef(0);
  const glActive = useRef(false);
  const [source, setSource] = useState<"pending" | "file" | "youtube">("pending");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Use the local Huella file when it exists, otherwise fall back to YouTube.
  useEffect(() => {
    let alive = true;
    fetch(HUELLA_FILE, { method: "HEAD" })
      .then((response) => {
        const isVideo = response.ok && (response.headers.get("content-type") ?? "").startsWith("video");
        if (alive) setSource(isVideo ? "file" : "youtube");
      })
      .catch(() => { if (alive) setSource("youtube"); });
    return () => { alive = false; };
  }, []);

  // Lusion-style reveal: the reel starts as a tinted card and opens to full screen while the section is pinned.
  useEffect(() => {
    const root = section.current;
    if (!root) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const update = () => {
      frame = 0;
      if (motion.matches) {
        root.style.setProperty("--reel-e", "1");
        return;
      }
      const rect = root.getBoundingClientRect();
      const travel = Math.max(1, rect.height - window.innerHeight);
      const progress = Math.min(1, Math.max(0, -rect.top / travel));
      const t = Math.min(1, Math.max(0, (progress - .08) / .62));
      const eased = t * t * (3 - 2 * t);
      target.current = eased;
      if (!glActive.current) root.style.setProperty("--reel-e", eased.toFixed(4));
      // Ring draws itself in as the section approaches, then flies out with the expansion.
      const enter = Math.min(1, Math.max(0, 1 - rect.top / window.innerHeight));
      if (ring.current) ring.current.style.strokeDashoffset = String(289 * (1 - enter * .78));
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    motion.addEventListener("change", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      motion.removeEventListener("change", schedule);
    };
  }, []);

  // WebGL liquid-wave renderer (falls back to the CSS clip-path version if unavailable).
  useEffect(() => {
    const root = section.current;
    const surface = canvas.current;
    const video = preview.current;
    if (source !== "file" || !root || !surface || !video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const insets = (): ReelInsets => window.innerWidth <= 680
      ? { top: .34, right: .05, bottom: .30, left: .05 }
      : { top: .40, right: .48, bottom: .09, left: .045 };
    let wave: ReturnType<typeof createReelWave>;
    try {
      wave = createReelWave({
        canvas: surface,
        video,
        poster: posterPath,
        getInsets: insets,
        getTarget: () => target.current,
        onFrame: (value) => root.style.setProperty("--reel-e", value.toFixed(4)),
      });
    } catch {
      return;
    }
    glActive.current = true;
    root.classList.add("isGL");
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) wave.start(); else wave.stop();
    }, { rootMargin: "20% 0px" });
    observer.observe(root);
    return () => {
      observer.disconnect();
      wave.dispose();
      glActive.current = false;
      root.classList.remove("isGL");
    };
  }, [source]);

  useEffect(() => {
    const element = stage.current;
    const video = preview.current;
    if (source !== "file" || !element || !video) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let onScreen = false;
    const sync = () => {
      if (onScreen && !motion.matches && !document.hidden && !dialog.current?.open) {
        void video.play().catch(() => {});
      } else {
        video.pause();
      }
    };
    syncPreview.current = sync;

    const observer = new IntersectionObserver(([entry]) => {
      onScreen = entry.intersectionRatio >= .24;
      sync();
    }, { threshold: .24 });
    observer.observe(element);
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", sync);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      motion.removeEventListener("change", sync);
      video.pause();
      syncPreview.current = () => {};
    };
  }, [source]);

  useEffect(() => () => {
    activeTransition.current?.skipTransition();
    document.documentElement.removeAttribute("data-reel-transition");
    if (previousOverflow.current !== null) {
      document.documentElement.style.overflowY = previousOverflow.current;
      previousOverflow.current = null;
    }
  }, []);

  const changeScreen = (update: () => void) => {
    if (activeTransition.current) return;
    if (!document.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      update();
      return;
    }

    const root = document.documentElement;
    root.setAttribute("data-reel-transition", "");
    const transition = document.startViewTransition(update);
    activeTransition.current = transition;
    const settle = () => {
      if (activeTransition.current !== transition) return;
      activeTransition.current = null;
      root.removeAttribute("data-reel-transition");
    };
    void transition.finished.then(settle, settle);
  };

  const open = () => {
    const overlay = dialog.current;
    const video = player.current;
    if (!overlay || overlay.open) return;

    changeScreen(() => {
      if (!overlay.isConnected) return;
      overlay.showModal();
      setDialogOpen(true);
      previousOverflow.current = document.documentElement.style.overflowY;
      document.documentElement.style.overflowY = "hidden";
      syncPreview.current();
      if (video) {
        video.currentTime = 0;
        void video.play().catch(() => {});
      }
    });
  };

  const close = () => {
    const overlay = dialog.current;
    if (!overlay?.open) return;

    changeScreen(() => {
      player.current?.pause();
      overlay.close();
      setDialogOpen(false);
      if (previousOverflow.current !== null) {
        document.documentElement.style.overflowY = previousOverflow.current;
        previousOverflow.current = null;
      }
      syncPreview.current();
      launch.current?.focus({ preventScroll: true });
    });
  };

  return (
    <section id="reel" ref={section} className="homeShowreel" aria-label="Reel de O R-K">
      <div className="homeReelPin">
      <canvas ref={canvas} className="homeReelCanvas" aria-hidden="true" />
      <svg className="homeReelRing" viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="homeReelRingGradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#BDA5FF"/><stop offset=".55" stopColor="#7C3CFF"/><stop offset="1" stopColor="#4B1F8C"/></linearGradient></defs><circle ref={ring} cx="50" cy="50" r="46" /></svg>
      <div className="homeReelStage" ref={stage}>
        <div className="homeReelScreen">
          {source === "file" && <video ref={preview} src={reelPath} poster={posterPath} preload="none" muted loop playsInline aria-hidden="true" />}
          {source === "youtube" && (
            <div className="homeReelYT" aria-hidden="true">
              <iframe src={ytPreview} title="Huella Digital" allow="autoplay; encrypted-media; picture-in-picture" tabIndex={-1} />
            </div>
          )}
          <span className="homeReelTint" aria-hidden="true" />
          <button ref={launch} className="homeReelLaunch" type="button" aria-haspopup="dialog" onClick={open}>
            <span className="homeReelLaunchLabel"><i aria-hidden="true" />Ver el reel</span>
          </button>
        </div>
      </div>
      </div>
      <p className="homeReelCredit"><a href="https://www.magnific.com/">Designed by Magnific</a></p>
      <dialog
        ref={dialog}
        className="homeReelOverlay"
        aria-label="Reel de O R-K"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
      >
        <button className="homeReelClose" type="button" autoFocus onClick={close}>Cerrar reel <span aria-hidden="true">×</span></button>
        <div className="homeReelPlayback">
          {source === "file" && <video ref={player} src={reelPath} poster={posterPath} preload="none" playsInline controls aria-label="Reel de O R-K" />}
          {source === "youtube" && dialogOpen && (
            <iframe className="homeReelYTFull" src={ytFull} title="Reel Huella Digital" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen />
          )}
        </div>
      </dialog>
    </section>
  );
}
