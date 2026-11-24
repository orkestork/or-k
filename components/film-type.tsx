"use client";

import type { Lang } from "@/lib/i18n";

/**
 * Kinetic type layered over the scroll-scrubbed hero film.
 * Times (seconds) match the cuts of public/assets/ork-hero-film.mp4.
 */
type Style = "solid" | "outline" | "accent";
/** Where the word sits (kept clear of the framed inset shots) and how its letters enter. */
type Pos = "left" | "right" | "top" | "bottom" | "top-left" | "bottom-left" | "bottom-right" | "top-right";
type Enter = "up" | "down" | "left" | "right" | "split" | "zoom";
type Beat = { from: number; to: number; es: string; en: string; style: Style; pos: Pos; enter: Enter; chapter: { es: string; en: string } };

const MANIFESTO = { es: "Manifiesto", en: "Manifesto" };
export const FILM_BEATS: Beat[] = [
  { from: 0.1, to: 1.95, es: "No", en: "We", style: "solid", pos: "left", enter: "left", chapter: MANIFESTO },
  { from: 2.2, to: 3.9, es: "somos", en: "are not", style: "outline", pos: "right", enter: "right", chapter: MANIFESTO },
  { from: 4.2, to: 5.95, es: "espectadores", en: "spectators", style: "solid", pos: "bottom-left", enter: "up", chapter: MANIFESTO },
  { from: 6.25, to: 8.0, es: "del", en: "of", style: "outline", pos: "top-left", enter: "zoom", chapter: MANIFESTO },
  { from: 8.3, to: 10.0, es: "cambio.", en: "change.", style: "accent", pos: "right", enter: "down", chapter: MANIFESTO },
  { from: 12.2, to: 14.0, es: "Entendemos.", en: "We understand.", style: "solid", pos: "bottom", enter: "split", chapter: { es: "01 · Understand", en: "01 · Understand" } },
  { from: 17.3, to: 19.0, es: "Transformamos.", en: "We transform.", style: "accent", pos: "top", enter: "right", chapter: { es: "02 · Transform", en: "02 · Transform" } },
  { from: 20.3, to: 22.0, es: "Escalamos.", en: "We scale.", style: "solid", pos: "left", enter: "left", chapter: { es: "03 · Scale", en: "03 · Scale" } },
  { from: 22.3, to: 24.0, es: "Juntos.", en: "Together.", style: "outline", pos: "bottom-right", enter: "zoom", chapter: { es: "UTS by O R-K", en: "UTS by O R-K" } },
  { from: 24.3, to: 27.9, es: "Somos el cambio.", en: "We are the change.", style: "accent", pos: "bottom", enter: "up", chapter: { es: "O R-K", en: "O R-K" } },
];

export function beatAt(time: number) {
  return FILM_BEATS.findIndex((beat) => time >= beat.from && time < beat.to);
}

export default function FilmType({ index, lang }: { index: number; lang: Lang }) {
  const beat = index >= 0 ? FILM_BEATS[index] : null;
  const english = lang === "en";
  const text = beat ? (english ? beat.en : beat.es) : "";
  const chapter = beat ? (english ? beat.chapter.en : beat.chapter.es) : "";
  return (
    <div className="filmType" aria-hidden="true" data-no-i18n>
      {beat && (
        // The key remounts the word so every beat replays its entrance.
        <div className={`filmTypeBeat is-${beat.style} pos-${beat.pos} enter-${beat.enter}${text.length > 11 ? " isLong" : ""}`}
          style={{ "--n": text.length } as React.CSSProperties} key={`${index}-${lang}`}>
          <span className="filmTypeChapter">{chapter}</span>
          <span className="filmTypeWord">
            {Array.from(text).map((char, i) => (
              <span className="filmTypeMask" key={i}>
                <span className="filmTypeChar" style={{ "--i": i } as React.CSSProperties}>{char === " " ? " " : char}</span>
              </span>
            ))}
          </span>
        </div>
      )}
    </div>
  );
}
