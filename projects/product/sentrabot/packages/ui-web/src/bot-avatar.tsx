import { ACTIVE_RUN_STATUSES, avatarIdentitySeed } from "@sentrabot/core";
import { type CSSProperties, memo, useEffect, useId, useRef, useSyncExternalStore } from "react";
import type { AvatarStyle } from "./avatar-style.js";
import { cn } from "./lib/utils.js";
import "./styles.css";

export interface BotAvatarProps {
  color: string;
  size?: number;
  status?: string;
  /** Retained for API and database compatibility while the product ships a single character. */
  variant?: AvatarStyle;
  identity?: string;
  className?: string;
}

export const BotAvatar = memo(function BotAvatar({
  color,
  size = 38,
  status,
  identity,
  className,
}: BotAvatarProps) {
  const isWorking = ACTIVE_RUN_STATUSES.some((activeStatus) => activeStatus === status);
  return (
    <ChipAvatar
      color={color}
      identity={identity}
      size={size}
      isWorking={isWorking}
      className={className}
    />
  );
});

const EYE_TRACKING_MIN_SIZE = 48;

type PointerListener = (x: number, y: number) => void;
const pointerListeners = new Set<PointerListener>();
let pointerFrame = 0;
let pointerX = 0;
let pointerY = 0;

function flushPointer() {
  pointerFrame = 0;
  for (const listener of pointerListeners) listener(pointerX, pointerY);
}

function handlePointerMove(event: PointerEvent) {
  pointerX = event.clientX;
  pointerY = event.clientY;
  if (!pointerFrame) pointerFrame = requestAnimationFrame(flushPointer);
}

function subscribeToPointer(listener: PointerListener): () => void {
  if (pointerListeners.size === 0) {
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
  }
  pointerListeners.add(listener);
  return () => {
    pointerListeners.delete(listener);
    if (pointerListeners.size === 0) {
      window.removeEventListener("pointermove", handlePointerMove);
      if (pointerFrame) cancelAnimationFrame(pointerFrame);
      pointerFrame = 0;
    }
  };
}

/** Blend `tint` into `base` by `amount` (0..1). Invalid input returns `base`. */
export function mixHex(base: string, tint: string, amount: number): string {
  const a = parseHex(base);
  const b = parseHex(tint);
  if (!a || !b) return base;
  const t = Math.min(1, Math.max(0, amount));
  const channel = (x: number, y: number) => Math.round(x + (y - x) * t);
  const r = channel(a[0], b[0]);
  const g = channel(a[1], b[1]);
  const bl = channel(a[2], b[2]);
  return `#${((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1)}`;
}

function parseHex(hex: string): [number, number, number] | null {
  const clean = hex.replace(/^#/, "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  if (full.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(full)) return null;
  const num = Number.parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/** Mascot avatar: glossy cream chip robot — squircle body, pill eyes, stub arms and legs. */
function ChipAvatar({
  color,
  identity,
  size,
  isWorking,
  className,
}: {
  color: string;
  identity?: string;
  size: number;
  isWorking: boolean;
  className?: string;
}) {
  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    reducedMotionSnapshot,
    () => false,
  );
  const seed = avatarIdentitySeed(identity || color || "#8B5CF6");
  const idleDuration = (4.6 + (seed % 20) / 10).toFixed(2);
  const idleDelay = (-(((seed * 11) % 40) / 10)).toFixed(2);
  const uid = useId().replace(/[^a-zA-Z0-9-_]/g, "");
  const bodyGradId = `clay-body-${uid}`;
  const glossGradId = `clay-gloss-${uid}`;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const eyesRef = useRef<SVGGElement | null>(null);

  // Eyes follow the pointer: one shared window listener for every avatar, rAF-throttled,
  // writing the transform directly to the DOM (no React state) so dozens of avatars stay
  // cheap. Small avatars (list rows, etc.) skip tracking entirely.
  useEffect(() => {
    if (reducedMotion || size < EYE_TRACKING_MIN_SIZE) return;
    const unsubscribe = subscribeToPointer((x, y) => {
      const svg = svgRef.current;
      const eyes = eyesRef.current;
      if (!svg || !eyes) return;
      const rect = svg.getBoundingClientRect();
      if (rect.width === 0) return;
      const dx = x - (rect.left + rect.width / 2);
      const dy = y - (rect.top + rect.height / 2);
      const distance = Math.hypot(dx, dy) || 1;
      const reach = Math.min(1, distance / 160);
      const offsetX = (dx / distance) * 5 * reach;
      const offsetY = (dy / distance) * 3.5 * reach;
      eyes.style.transform = `translate(${offsetX.toFixed(2)}px, ${offsetY.toFixed(2)}px)`;
    });
    return () => {
      unsubscribe();
      if (eyesRef.current) eyesRef.current.style.transform = "";
    };
  }, [reducedMotion, size]);

  const cream = mixHex("#FBF5E6", color, 0.1);
  const creamMid = mixHex("#F3ECDA", color, 0.22);
  const creamDark = mixHex("#E4D8BC", color, 0.34);
  const limbFill = mixHex("#E4D8BC", color, 0.3);
  const limb = { fill: limbFill, stroke: "rgba(70,58,30,0.16)", strokeWidth: 1 };

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 120 120"
      aria-hidden="true"
      className={cn(
        "sentrabot-bot-avatar sentrabot-clay-avatar overflow-visible select-none",
        className,
      )}
      data-working={isWorking}
      style={
        {
          width: size,
          height: size,
          flex: "none",
          "--sentrabot-clay-idle-duration": `${idleDuration}s`,
          "--sentrabot-clay-idle-delay": `${idleDelay}s`,
          filter: isWorking
            ? `drop-shadow(0 0 ${Math.max(3, Math.round(size * 0.14))}px ${color})`
            : "drop-shadow(0 2px 3px rgba(0,0,0,.35))",
        } as CSSProperties
      }
    >
      <defs>
        <linearGradient id={bodyGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cream} />
          <stop offset="55%" stopColor={creamMid} />
          <stop offset="100%" stopColor={creamDark} />
        </linearGradient>
        <linearGradient id={glossGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g className="sentrabot-clay-avatar-figure">
        {/* Arms */}
        <rect x="2" y="50" width="20" height="20" rx="10" {...limb} />
        <rect x="98" y="50" width="20" height="20" rx="10" {...limb} />
        {/* Legs: two pairs */}
        <rect x="30" y="84" width="11" height="22" rx="5.5" {...limb} />
        <rect x="47" y="84" width="11" height="22" rx="5.5" {...limb} />
        <rect x="68" y="84" width="11" height="22" rx="5.5" {...limb} />
        <rect x="85" y="84" width="11" height="22" rx="5.5" {...limb} />
        {/* Body */}
        <rect
          x="16"
          y="14"
          width="88"
          height="78"
          rx="22"
          fill={`url(#${bodyGradId})`}
          stroke="rgba(70,58,30,0.18)"
          strokeWidth="1.2"
        />
        {/* Gloss highlight */}
        <rect
          x="24"
          y="19"
          width="72"
          height="26"
          rx="13"
          fill={`url(#${glossGradId})`}
          pointerEvents="none"
        />
        {/* Eyes (pointer-tracked group; blink/scan animation on the pills) */}
        <g ref={eyesRef} className="sentrabot-clay-avatar-eyes">
          {[38, 69].map((x) => (
            <rect
              key={x}
              className="sentrabot-clay-avatar-eye"
              x={x}
              y="38"
              width="13"
              height="28"
              rx="6.5"
              fill="#17171A"
            />
          ))}
        </g>
      </g>
    </svg>
  );
}

const reducedMotionMedia = "(prefers-reduced-motion: reduce)";

function reducedMotionSnapshot(): boolean {
  return window.matchMedia(reducedMotionMedia).matches;
}

function subscribeToReducedMotion(onChange: () => void): () => void {
  const media = window.matchMedia(reducedMotionMedia);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex h-11 w-11 items-center justify-center gap-1.5 rounded-full bg-[#16161A]">
        <span className="h-4 w-[7px] rounded-full bg-[#F7F7F4]" />
        <span className="h-4 w-[7px] rounded-full bg-[#F7F7F4]" />
      </div>
      <span className="font-[Aeonik,ui-sans-serif] text-[28px] tracking-tight text-[#1B1B1E]">
        Sentra Bot
      </span>
    </div>
  );
}
