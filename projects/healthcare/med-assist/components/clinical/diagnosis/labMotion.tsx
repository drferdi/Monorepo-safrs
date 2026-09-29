import { animate, motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from 'framer-motion';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';

/*
 * Adapted from lab.xevrion.dev (github.com/xevrion/ui-lab, MIT, Yash Bavadiya), picked for the
 * Tatalaksana page (Chief, 2026-09-29): the tick of "Scribble checkbox" and the fill of "Hold to
 * delete". Steady like a console (Chief, the same day): the tick is there or not, never drawn; the
 * hold fill stays, it is the only way to see how long is left to hold.
 * "Swipe deck" (same author, MIT) carries the Edukasi points: an explicit exception Chief asked for.
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

// ---- Swipe deck: the Edukasi points, right gives, left skips (Chief, 2026-09-29). ----

const THROW_DISTANCE = 120;
const THROW_VELOCITY = 400;
const OFFSCREEN = 360;
const STEP_Y = 12;
const STEP_SCALE = 0.05;
const VISIBLE = 3;
const STEP_FORWARD = { stiffness: 320, damping: 30 };
const SNAP_BACK = { type: 'spring', stiffness: 400, damping: 28 } as const;
const THROW = { type: 'spring', stiffness: 260, damping: 36 } as const;
const DROP = { type: 'spring', stiffness: 90, damping: 18 } as const;
const SPIN = { type: 'spring', stiffness: 120, damping: 20 } as const;
const SHRINK = { duration: 0.3, ease: [0.23, 1, 0.32, 1] } as const;

type DeckItem = { key: string; text: string };
type Flight = {
  id: number;
  item: DeckItem;
  position: number;
  total: number;
  from: number;
  direction: 1 | -1;
  velocity: number;
  spin: number;
  drop: number;
};

const pad = (n: number) => String(n).padStart(2, '0');

/** 1 (right) or -1 (left) when dragged far or flicked fast enough, else 0: the card springs back. */
export function throwDirection(offset: number, velocity: number): -1 | 0 | 1 {
  if (Math.abs(offset) <= THROW_DISTANCE && Math.abs(velocity) <= THROW_VELOCITY) return 0;
  const sign = offset !== 0 ? offset : velocity;
  return sign < 0 ? -1 : 1;
}

// Pivots from below, like a card held at its bottom edge.
function tiltAt(x: number) {
  return Math.max(-1, Math.min(x / 240, 1)) * 18;
}

// Stays solid while you are deciding, then fades on the way out.
function useThrowStyle(x: MotionValue<number>) {
  const rotate = useTransform(x, tiltAt);
  const opacity = useTransform(x, [-OFFSCREEN * 0.8, -THROW_DISTANCE, THROW_DISTANCE, OFFSCREEN * 0.8], [0, 1, 1, 0]);
  return { rotate, opacity };
}

/** Keeps the order of `order` for keys still offered and appends new keys at the end. */
function reconcile(order: string[], keys: string[]): string[] {
  const offered = new Set(keys);
  const kept = order.filter((key) => offered.has(key));
  const known = new Set(kept);
  return [...kept, ...keys.filter((key) => !known.has(key))];
}

/**
 * Stays mounted until its last flying copy has landed, then renders nothing; `onExhausted` fires
 * once at that moment if focus was inside the deck, so the parent can place it somewhere sensible.
 */
export function EducationDeck({
  items,
  onGive,
  onExhausted,
}: {
  items: DeckItem[];
  onGive: (key: string) => void;
  onExhausted?: () => void;
}) {
  const reduceMotion = !!useReducedMotion();
  const [order, setOrder] = useState<string[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const nextFlight = useRef(0);
  const focusWithin = useRef(false);

  const x = useMotionValue(0);
  const { rotate, opacity } = useThrowStyle(x);
  const still = useMotionValue(0);
  const opaque = useMotionValue(1);
  const progress = useTransform(x, (v) => Math.min(Math.abs(v) / THROW_DISTANCE, 1));
  const handoff = useRef(0);

  const deck = reconcile(order, items.map((item) => item.key));
  const byKey = new Map(items.map((item) => [item.key, item]));
  const topKey = deck[0];
  const topItem = topKey === undefined ? undefined : byKey.get(topKey);

  const exhausted = deck.length === 0 && flights.length === 0;
  const onExhaustedRef = useRef(onExhausted);
  useEffect(() => {
    onExhaustedRef.current = onExhausted;
  });
  useEffect(() => {
    if (!exhausted || !focusWithin.current) return;
    focusWithin.current = false;
    onExhaustedRef.current?.();
  }, [exhausted]);

  const throwCard = (direction: 1 | -1, velocity = 0) => {
    if (!topItem || (direction === -1 && deck.length < 2)) return;
    const flight: Flight = {
      id: nextFlight.current++,
      item: topItem,
      position: 1,
      total: deck.length,
      from: x.get(),
      direction,
      velocity,
      spin: 8 + Math.random() * 14,
      drop: Math.random() * 110 - 20,
    };
    handoff.current = progress.get();
    flushSync(() => {
      if (direction === 1) onGive(topItem.key);
      else setOrder([...deck.slice(1), topItem.key]);
      if (!reduceMotion) setFlights((f) => [...f, flight]);
    });
    handoff.current = 0;
    x.jump(0);
  };

  if (exhausted) return null;

  return (
    <div onFocus={() => (focusWithin.current = true)} onBlur={() => (focusWithin.current = false)}>
      <div
        className="dx-edu-deck"
        role="group"
        aria-roledescription="tumpukan kartu"
        aria-label="Poin edukasi"
        tabIndex={0}
        data-testid="dx-tx-education-deck"
        onKeyDown={(event) => {
          if (event.repeat) return;
          if (event.key === 'ArrowLeft') throwCard(-1);
          if (event.key === 'ArrowRight') throwCard(1);
        }}
      >
        {deck.map((key, index) => {
          const item = byKey.get(key);
          if (!item) return null;
          return (
            <DeckCard
              key={key}
              item={item}
              position={index + 1}
              total={deck.length}
              index={index}
              x={index === 0 ? x : still}
              rotate={index === 0 ? rotate : still}
              opacity={index === 0 ? opacity : opaque}
              progress={progress}
              handoff={handoff}
              reduceMotion={reduceMotion}
              onRelease={(offset, velocity) => {
                const direction = throwDirection(offset, velocity);
                if (direction === 0 || (direction === -1 && deck.length < 2)) {
                  if (reduceMotion) x.jump(0);
                  else void animate(x, 0, { ...SNAP_BACK, velocity });
                }
                else throwCard(direction, velocity);
              }}
            />
          );
        })}
        {flights.map((flight) => (
          <FlyingCard
            key={flight.id}
            flight={flight}
            onLanded={() => setFlights((f) => f.filter((other) => other.id !== flight.id))}
          />
        ))}
      </div>
      <div className="flex items-center gap-4">
        <button type="button" className="diagnosis-text-button" disabled={deck.length < 2} onClick={() => throwCard(-1)}>
          <span aria-hidden="true">← </span>Lewati
        </button>
        <button type="button" className="btn-ac-inline btn-ac-inline--sharp"
          onClick={(event) => {
            if (event.detail > 1) return;
            throwCard(1);
          }}
        >
          Berikan<span aria-hidden="true"> →</span>
        </button>
      </div>
    </div>
  );
}

function DeckCard({
  item,
  position,
  total,
  index,
  x,
  rotate,
  opacity,
  progress,
  handoff,
  reduceMotion,
  onRelease,
}: {
  item: DeckItem;
  position: number;
  total: number;
  index: number;
  x: MotionValue<number>;
  rotate: MotionValue<number>;
  opacity: MotionValue<number>;
  progress: MotionValue<number>;
  handoff: { current: number };
  reduceMotion: boolean;
  onRelease: (offset: number, velocity: number) => void;
}) {
  const top = index === 0;
  const slot = useSpring(index, STEP_FORWARD);
  const previous = useRef(index);

  useLayoutEffect(() => {
    const from = previous.current;
    previous.current = index;
    if (from === index) return;
    if (reduceMotion) {
      slot.jump(index);
      return;
    }
    // A card entering view rises from one step further back; the others carry on from the drag.
    if (from >= VISIBLE && index < VISIBLE) slot.jump(index + 1);
    else slot.jump(slot.get() - handoff.current);
    slot.set(index);
  }, [index, reduceMotion, slot, handoff]);

  const depth = useTransform(() => Math.max(slot.get() - progress.get(), 0));
  const y = useTransform(depth, (d) => d * STEP_Y);
  const scale = useTransform(depth, (d) => 1 - d * STEP_SCALE);

  return (
    <motion.article
      aria-hidden={!top}
      drag={top ? 'x' : false}
      dragMomentum={false}
      onDragEnd={(_, info) => onRelease(info.offset.x, info.velocity.x)}
      style={{ x, rotate, y, scale, zIndex: 100 - index }}
      className="dx-edu-card"
      data-testid="dx-edu-card"
      data-top={top}
      data-hidden={index >= VISIBLE}
    >
      <CardFace text={item.text} position={position} total={total} opacity={opacity} />
    </motion.article>
  );
}

function FlyingCard({ flight, onLanded }: { flight: Flight; onLanded: () => void }) {
  const x = useMotionValue(flight.from);
  const y = useMotionValue(0);
  const rotate = useMotionValue(tiltAt(flight.from));
  const scale = useMotionValue(1);
  const { opacity } = useThrowStyle(x);
  const landed = useRef(onLanded);
  useEffect(() => {
    landed.current = onLanded;
  });
  useEffect(() => {
    const out = animate(x, flight.direction * OFFSCREEN, { ...THROW, velocity: flight.velocity });
    const rest = [
      animate(y, flight.drop, DROP),
      animate(rotate, rotate.get() + flight.direction * flight.spin, SPIN),
      animate(scale, 0.94, SHRINK),
    ];
    void out.then(() => landed.current());
    return () => [out, ...rest].forEach((controls) => controls.stop());
  }, [x, y, rotate, scale, flight]);
  return (
    <motion.div
      aria-hidden="true"
      style={{ x, y, rotate, scale, zIndex: 200 }}
      className="dx-edu-card dx-edu-card--flying"
      data-testid="dx-edu-flying"
    >
      <CardFace text={flight.item.text} position={flight.position} total={flight.total} opacity={opacity} />
    </motion.div>
  );
}

function CardFace({
  text,
  position,
  total,
  opacity,
}: {
  text: string;
  position: number;
  total: number;
  opacity: MotionValue<number>;
}) {
  return (
    <motion.div style={{ opacity }} className="neu-select dx-edu-card__face">
      <span className="ttv-label">{`${pad(position)} / ${pad(total)}`}</span>
      <p className="text-small">{text}</p>
    </motion.div>
  );
}
