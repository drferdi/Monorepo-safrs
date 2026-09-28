import {
  motion,
  useReducedMotion,
  useSpring,
  useTransform,
  useVelocity,
  type MotionValue,
} from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';

/*
 * Motion adapted from lab.xevrion.dev (github.com/xevrion/ui-lab, MIT, Yash Bavadiya), picked
 * for the Tatalaksana page (Chief, 2026-09-29): the pen check of "Scribble checkbox", the wheels of
 * "Odometer", and the fill of "Hold to delete". Timings are the reference's unless noted.
 */

// ---- Pen check ("Scribble checkbox"): a hand-drawn tick, a new stroke per text. ----

const PEN = 'cubic-bezier(0.65,0,0.35,1)';
const CHECK_MS = 200;
const FADE_MS = 180;

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

/** A tick in a small box; `checked` draws it with one pen stroke, unchecking fades it. */
export function PenCheck({
  checked,
  seedText,
  delayMs = 0,
  tone = 'accent',
}: {
  checked: boolean;
  seedText: string;
  delayMs?: number;
  tone?: 'accent' | 'danger' | 'warning';
}) {
  const reduceMotion = useReducedMotion();
  const stroke = checkPath(hash(seedText));
  const style = checked
    ? {
        strokeDashoffset: 0,
        opacity: 1,
        transition: reduceMotion ? `opacity ${FADE_MS}ms ease-out` : `stroke-dashoffset ${CHECK_MS}ms ${PEN} ${delayMs}ms`,
      }
    : {
        strokeDashoffset: 1.04,
        opacity: 0,
        transition: `opacity ${FADE_MS}ms ease-out, stroke-dashoffset 0ms linear ${FADE_MS}ms`,
      };
  return (
    <span className={`dx-pen-check dx-pen-check--${tone}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d={stroke.d}
          pathLength={1}
          stroke="currentColor"
          strokeWidth={stroke.width}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="1 2"
          style={style}
        />
      </svg>
    </span>
  );
}

// ---- Rolling number ("Odometer"): each digit is a wheel that rolls the way the count moved. ----

const GLYPHS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function Glyph({ digit, position }: { digit: number; position: MotionValue<number> }) {
  // Every glyph stays within five slots of the position, so ten nodes loop forever.
  const transform = useTransform(position, (p) => `translateY(${(((((digit - p) % 10) + 15) % 10) - 5) * 100}%)`);
  return (
    <motion.span className="dx-roll-glyph" style={{ transform }}>
      {digit}
    </motion.span>
  );
}

function Wheel({ turns }: { turns: number }) {
  const reduceMotion = useReducedMotion();
  const position = useSpring(turns, { visualDuration: 0.35, bounce: 0.15 });
  const velocity = useVelocity(position);
  const filter = useTransform(velocity, (v) => {
    const blur = Math.min(Math.max((Math.abs(v) - 4) / 16, 0), 1) * 1.5;
    return blur > 0 ? `blur(${blur}px)` : 'none';
  });
  useEffect(() => {
    if (reduceMotion) position.jump(turns);
    else position.set(turns);
  }, [turns, reduceMotion, position]);
  return (
    <span className="dx-roll-wheel" aria-hidden="true">
      <motion.span className="dx-roll-strip" style={{ filter: reduceMotion ? 'none' : filter }}>
        {GLYPHS.map((digit) => (
          <Glyph key={digit} digit={digit} position={position} />
        ))}
      </motion.span>
    </span>
  );
}

/** A count whose digits roll to each new value; the number itself is read from the text. */
export function RollingNumber({ value }: { value: number }) {
  const digits = Math.max(1, String(Math.max(0, value)).length);
  return (
    <span className="dx-roll">
      <span className="sr-only">{value}</span>
      {Array.from({ length: digits }, (_, i) => {
        const place = 10 ** (digits - 1 - i);
        return <Wheel key={place} turns={Math.floor(value / place)} />;
      })}
    </span>
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
