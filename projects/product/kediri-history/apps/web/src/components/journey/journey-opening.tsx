"use client";

import {
  type CSSProperties,
  type ReactElement,
  useEffect,
  useState,
} from "react";

export const JOURNEY_OPENING_TITLE =
  "Kediri: Perjalanan Sejarah yang Terus Hidup";
export const JOURNEY_OPENING_DESCRIPTION =
  "Ikuti perjalanan Kediri dari catatan awal, masa kerajaan, dan perubahan kota hingga hari ini.";
export const JOURNEY_OPENING_CUE = "Gulir untuk memulai";

const JOURNEY_OPENING_TITLE_ID = "journey-opening-title";
const titleCharacters = Array.from(JOURNEY_OPENING_TITLE);

/**
 * Pembuka Journey adalah baseline semantik yang lengkap, dengan typing sebagai
 * lapisan presentasi opsional. State enhancement baru dipasang setelah
 * hydration supaya HTML tanpa JavaScript tetap menampilkan naskah penuh.
 */
export function JourneyOpening(): ReactElement {
  const [motionEnhanced, setMotionEnhanced] = useState(false);

  useEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setMotionEnhanced(true);
    }
  }, []);

  return (
    <section
      className={`journey-opening${motionEnhanced ? " journey-opening--enhanced" : ""}`}
      data-journey-opening="true"
      aria-labelledby={JOURNEY_OPENING_TITLE_ID}
    >
      <div className="journey-opening-frame">
        <h1
          className="journey-opening-title"
          id={JOURNEY_OPENING_TITLE_ID}
          aria-label={JOURNEY_OPENING_TITLE}
        >
          <span className="journey-opening-copy">{JOURNEY_OPENING_TITLE}</span>
          <span className="journey-opening-typing" aria-hidden="true">
            {titleCharacters.map((character, index) => (
              <span
                className={`journey-opening-character${character === " " ? " journey-opening-character--space" : ""}`}
                // biome-ignore lint/suspicious/noArrayIndexKey: daftar karakter statis dari konstanta modul — posisinya identitasnya, tidak pernah di-reorder.
                key={`${index}-${character}`}
                style={
                  {
                    "--journey-opening-character-index": index,
                  } as CSSProperties
                }
              >
                {character}
              </span>
            ))}
          </span>
        </h1>

        <p className="journey-opening-description">
          {JOURNEY_OPENING_DESCRIPTION}
        </p>
        <p className="journey-opening-cue">{JOURNEY_OPENING_CUE}</p>
      </div>
    </section>
  );
}
