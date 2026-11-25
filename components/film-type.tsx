"use client";

import type { Lang } from "@/lib/i18n";

/**
 * Kinetic type layered over the hero film.
 * Times (seconds) match the cuts of public/assets/ork-hero-film.mp4.
 */
type Style = "solid" | "outline" | "accent";
/** Where the word sits (kept clear of the framed inset shots) and how its letters enter. */
type Pos = "left" | "right" | "top" | "bottom" | "top-left" | "bottom-left" | "bottom-right" | "top-right";
type Enter = "up" | "down" | "left" | "right" | "split" | "zoom";
type Beat = { opening?: boolean; from: number; to: number; es: string; en: string; style: Style; pos: Pos; enter: Enter; chapter: { es: string; en: string } };

export const FILM_BEATS: Beat[] = [
  { from: 0, to: 2.9, opening: true, es: "No somos\nespectadores\ndel cambio.", en: "We are not\nspectators\nof change.", style: "solid", pos: "top", enter: "up", chapter: { es: "Manifiesto", en: "Manifesto" } },
  { from: 2.9, to: 5, es: "Somos el\ncambio.", en: "We are the\nchange.", style: "accent", pos: "bottom", enter: "up", chapter: { es: "O R-K", en: "O R-K" } },
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
        <div className={`filmTypeBeat is-${beat.style} pos-${beat.pos} enter-${beat.enter}${beat.opening ? " isOpening" : ""}${text.length > 11 ? " isLong" : ""}`}
          style={{ "--n": text.length } as React.CSSProperties} key={`${index}-${lang}`}>
          <span className="filmTypeChapter">{chapter}</span>
          {text.split("\n").map((line) => (
            <span className="filmTypeWord" key={line}>
              {Array.from(line).map((char, i) => (
                <span className="filmTypeMask" key={i}>
                  <span className="filmTypeChar" style={{ "--i": i } as React.CSSProperties}>{char === " " ? " " : char}</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
