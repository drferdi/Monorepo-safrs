import { useRef, useState, type ReactNode } from 'react';

/*
 * Adapted from lab.xevrion.dev (github.com/xevrion/ui-lab, MIT, Yash Bavadiya), picked for the
 * Tatalaksana page (Chief, 2026-09-29): the tick of "Scribble checkbox" and the fill of "Hold to
 * delete". Steady like a console (Chief, the same day): the tick is there or not, never drawn; the
 * hold fill stays, it is the only way to see how long is left to hold.
 */

// ---- Pen check ("Scribble checkbox"): a hand-drawn tick, a new shape per text. ----

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function random(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r = (n: number) => Math.round(n * 10) / 10;

function checkPath(seed: number): { d: string; width: number } {
  const rand = random(seed);
  const between = (a: number, b: number) => a + rand() * (b - a);
  const sx = between(3.5, 7);
  const sy = between(10, 14);
  const vx = sx + between(3.5, 5.5);
  const vy = between(16.5, 19.5);
  const angle = (between(48, 68) * Math.PI) / 180;
  const length = between(15, 21);
  const ex = vx + Math.cos(angle) * length;
  const ey = vy - Math.sin(angle) * length;
  const dipBow = between(-1.2, 1.4);
  const flickBow = between(-2.2, 1.6);
  const nx = Math.sin(angle);
  const ny = Math.cos(angle);
  const d =
    `M${r(sx)} ${r(sy)}` +
    `C${r(sx + 1.3 + dipBow)} ${r(sy + 2 - dipBow * 0.5)} ${r(vx - 1.8)} ${r(vy - between(0.2, 1.4))} ${r(vx)} ${r(vy)}` +
    `C${r(vx + (ex - vx) * 0.3 + nx * flickBow)} ${r(vy + (ey - vy) * 0.3 + ny * flickBow)} ${r(vx + (ex - vx) * 0.7 + nx * flickBow)} ${r(vy + (ey - vy) * 0.7 + ny * flickBow)} ${r(ex)} ${r(ey)}`;
  return { d, width: r(between(1.75, 2.3)) };
}

/** A tick in a small box, shown when `checked`. */
export function PenCheck({
  checked,
  seedText,
  tone = 'accent',
}: {
  checked: boolean;
  seedText: string;
  tone?: 'accent' | 'danger' | 'warning';
}) {
  const stroke = checkPath(hash(seedText));
  return (
    <span className={`dx-pen-check dx-pen-check--${tone}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        {checked ? (
          <path d={stroke.d} stroke="currentColor" strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round" />
        ) : null}
      </svg>
    </span>
  );
}

// ---- Selection trace: one line circling a selected card. ----

/**
 * Chief, 2026-09-29, on the green frame of a selected card: "Gunakan motion futuristic single line
 * bergerak mengitari kotak". One segment travels the card's inner edge at an even pace (pathLength
 * 100, whatever the card's size); the frame and the left bar are gone.
 */
export function SelectionTrace() {
  return (
    <svg className="dx-trace" aria-hidden="true">
      <rect pathLength={100} />
    </svg>
  );
}

// ---- Hold to confirm ("Hold to delete"): fills while held, snaps back when let go. ----

/**
 * Commits only after a hold: the fill runs over `holdMs` while pressed and snaps back in 200 ms
 * on release. The reference holds for 2 s; a prescription edit uses 900 ms (a clinic pace).
 */
export function HoldButton({
  children,
  holdMs = 900,
  onComplete,
  label,
}: {
  children: ReactNode;
  holdMs?: number;
  onComplete: () => void;
  label: string;
}) {
  const [holding, setHolding] = useState(false);
  const done = useRef(false);
  const press = () => {
    done.current = false;
    setHolding(true);
  };
  const release = () => setHolding(false);
  return (
    <button
      type="button"
      className="diagnosis-text-button dx-hold"
      aria-label={label}
      onPointerDown={(event) => {
        if (event.button === 0) press();
      }}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
          event.preventDefault();
          press();
        }
      }}
      onKeyUp={(event) => {
        if (event.key === ' ' || event.key === 'Enter') release();
      }}
    >
      <span>{children}</span>
      <span
        aria-hidden="true"
        className="dx-hold-fill"
        data-holding={holding}
        style={{ transitionDuration: holding ? `${holdMs}ms` : '200ms' }}
        onTransitionEnd={(event) => {
          if (event.propertyName !== 'clip-path' || !holding || done.current) return;
          done.current = true;
          setHolding(false);
          onComplete();
        }}
      >
        {children}
      </span>
    </button>
  );
}
