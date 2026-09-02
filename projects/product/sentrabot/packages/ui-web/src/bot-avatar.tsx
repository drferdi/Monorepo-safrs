import { ACTIVE_RUN_STATUSES, avatarIdentitySeed, organicAvatarPath } from "@sentrabot/core";
import { type CSSProperties, memo, useEffect, useId, useRef, useSyncExternalStore } from "react";
import { type AvatarStyle, useAvatarStyle } from "./avatar-style.js";
import { cn } from "./lib/utils.js";
import "./styles.css";

export interface BotAvatarProps {
  color: string;
  size?: number;
  status?: string;
  variant?: AvatarStyle;
  identity?: string;
  className?: string;
}

export const BotAvatar = memo(function BotAvatar({
  color,
  size = 38,
  status,
  variant,
  identity,
  className,
}: BotAvatarProps) {
  const isWorking = ACTIVE_RUN_STATUSES.some((activeStatus) => activeStatus === status);
  const gradId = `spin-grad-${useId().replace(/[^a-zA-Z0-9-_]/g, "")}`;
  const preferredVariant = useAvatarStyle();
  const effectiveVariant = variant ?? preferredVariant;
  if (effectiveVariant === "organic") {
    return (
      <OrganicAvatar
        color={color}
        identity={identity}
        size={size}
        isWorking={isWorking}
        className={className}
      />
    );
  }
  if (effectiveVariant === "clay") {
    return (
      <ClayAvatar
        color={color}
        identity={identity}
        size={size}
        isWorking={isWorking}
        className={className}
      />
    );
  }
  const visorW = Math.round(size * 0.68);
  const visorH = Math.round(size * 0.44);
  const eyeW = Math.max(4, Math.round(size * 0.14));
  const eyeH = Math.max(7, Math.round(size * 0.22));
  const eyeRadius = Math.max(2, Math.round(eyeW * 0.5));
  const eyeGap = Math.max(3, Math.round(size * 0.1));

  const seed = hashString(color || "#8B5CF6");
  const eyeVariant = seed % 4;
  const idleDuration = (4.2 + ((seed * 7) % 28) / 10).toFixed(2);
  const idleDelay = (-(((seed * 13) % 45) / 10)).toFixed(2);
  const eyeGlow = `0 0 4px #FFFFFF, 0 0 8px #FFFFFF, 0 0 14px ${lightenColor(color, 20)}`;
  const idleEyeAnimation = {
    "--sentrabot-eye-animation-name": `sentrabot-eyes-idle-${eyeVariant}`,
    "--sentrabot-eye-animation-duration": `${idleDuration}s`,
    "--sentrabot-eye-animation-easing": "cubic-bezier(0.4, 0, 0.2, 1)",
    "--sentrabot-eye-animation-delay": `${idleDelay}s`,
  } as CSSProperties;
  const workingEyeAnimation = {
    "--sentrabot-eye-animation-name": "sentrabot-eyes-working",
    "--sentrabot-eye-animation-duration": "1.4s",
    "--sentrabot-eye-animation-easing": "ease-in-out",
    "--sentrabot-eye-animation-delay": "0s",
  } as CSSProperties;

  return (
    <div
      className={cn(
        "sentrabot-bot-avatar group relative flex items-center justify-center rounded-full select-none",
        className,
      )}
      data-working={isWorking}
      style={{
        width: size,
        height: size,
        flex: "none",
        background: `radial-gradient(circle at 35% 26%, ${lightenColor(color, 35)}, ${color} 55%, ${darkenColor(color, 40)} 100%)`,
        boxShadow: isWorking
          ? `0 0 0 2px rgba(255,255,255,0.25), 0 0 ${Math.round(size * 0.45)}px ${color}, inset 0 1px 2px rgba(255,255,255,0.6)`
          : `0 2px ${Math.max(4, Math.round(size * 0.15))}px rgba(0,0,0,0.4), inset 0 1px 1.5px rgba(255,255,255,0.4)`,
      }}
    >
      <svg
        className="sentrabot-bot-avatar-ring absolute pointer-events-none"
        style={{
          inset: -4,
          width: size + 8,
          height: size + 8,
          filter: `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 10px #ffffff)`,
        }}
        viewBox="0 0 48 48"
        fill="none"
      >
        <circle
          cx="24"
          cy="24"
          r="22"
          stroke={`url(#${gradId})`}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeDasharray="45 80"
        />
        <circle cx="43" cy="24" r="2.8" fill="#ffffff" />
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="60%" stopColor={color} stopOpacity="0.9" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      <div
        className="sentrabot-bot-avatar-visor relative flex items-center justify-center overflow-hidden transition-transform duration-200 group-hover:scale-[1.04]"
        style={{
          width: visorW,
          height: visorH,
          borderRadius: Math.round(visorH * 0.52),
          background: "linear-gradient(180deg, #101014 0%, #030305 100%)",
          boxShadow: "inset 0 1.5px 3px rgba(0,0,0,0.95), 0 1px 1px rgba(255,255,255,0.18)",
          border: "1px solid rgba(255,255,255,0.14)",
        }}
      >
        <div
          className="absolute top-0 inset-x-0 h-[40%] pointer-events-none rounded-t-full"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.01) 100%)",
          }}
        />

        {(["idle", "working"] as const).map((mode) => (
          <div
            key={mode}
            className={`sentrabot-bot-avatar-eyes sentrabot-bot-avatar-eyes-${mode} absolute inset-0 z-10 flex items-center justify-center`}
            style={{
              gap: eyeGap,
              ...(mode === "idle" ? idleEyeAnimation : workingEyeAnimation),
            }}
          >
            {[0, 1].map((eye) => (
              <span
                key={eye}
                className="block bg-white"
                style={{
                  width: eyeW,
                  height: eyeH,
                  borderRadius: eyeRadius,
                  backgroundColor: "#FFFFFF",
                  boxShadow: eyeGlow,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
});

/** Mascot avatar: glossy cream clay robot — squircle body, pill eyes, stub arms and legs. */
function ClayAvatar({
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

  // Eyes follow the pointer: one listener per avatar, rAF-throttled, writing the
  // transform directly to the DOM (no React state) so dozens of avatars stay cheap.
  useEffect(() => {
    if (reducedMotion) return;
    let frame = 0;
    let pointer: { x: number; y: number } | null = null;
    const apply = () => {
      frame = 0;
      const svg = svgRef.current;
      const eyes = eyesRef.current;
      if (!svg || !eyes || !pointer) return;
      const rect = svg.getBoundingClientRect();
      if (rect.width === 0) return;
      const dx = pointer.x - (rect.left + rect.width / 2);
      const dy = pointer.y - (rect.top + rect.height / 2);
      const distance = Math.hypot(dx, dy) || 1;
      const reach = Math.min(1, distance / 160);
      const offsetX = (dx / distance) * 5 * reach;
      const offsetY = (dy / distance) * 3.5 * reach;
      eyes.style.transform = `translate(${offsetX.toFixed(2)}px, ${offsetY.toFixed(2)}px)`;
    };
    const onPointerMove = (event: PointerEvent) => {
      pointer = { x: event.clientX, y: event.clientY };
      if (!frame) frame = requestAnimationFrame(apply);
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      if (frame) cancelAnimationFrame(frame);
      if (eyesRef.current) eyesRef.current.style.transform = "";
    };
  }, [reducedMotion]);

  const cream = "#F3ECDA";
  const creamDark = "#E4D8BC";
  const limb = { fill: creamDark, stroke: "rgba(70,58,30,0.16)", strokeWidth: 1 };

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
          <stop offset="0%" stopColor="#FBF5E6" />
          <stop offset="55%" stopColor={cream} />
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

function OrganicAvatar({
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
  const duration = `${4.8 + (seed % 24) / 10}s`;
  const shapeA = organicAvatarPath(seed);
  const shapeB = organicAvatarPath(seed, 0.42);

  return (
    <svg
      viewBox="-60 -60 120 120"
      aria-hidden="true"
      className={cn(
        "sentrabot-bot-avatar sentrabot-organic-avatar overflow-visible select-none",
        className,
      )}
      data-working={isWorking}
      data-shape-family={seed % 10}
      data-eye-pattern={seed % 4}
      style={{
        width: size,
        height: size,
        flex: "none",
      }}
    >
      {(["idle", "working"] as const).map((mode) => (
        <path
          key={mode}
          className={`sentrabot-organic-avatar-body sentrabot-organic-avatar-body-${mode}`}
          d={shapeA}
          fill={color}
          style={
            {
              "--sentrabot-organic-path": `path("${shapeA}")`,
              filter:
                mode === "working"
                  ? `drop-shadow(0 0 ${Math.round(size * 0.16)}px ${color})`
                  : "drop-shadow(0 2px 3px rgba(0,0,0,.34))",
            } as CSSProperties
          }
        >
          {!reducedMotion ? (
            <animate
              attributeName="d"
              values={`${shapeA};${shapeB};${shapeA}`}
              dur={duration}
              repeatCount="indefinite"
            />
          ) : null}
        </path>
      ))}
      <g transform={`rotate(${(seed % 9) - 4})`}>
        {(["idle", "working"] as const).map((mode) => (
          <g
            key={mode}
            className={`sentrabot-organic-avatar-eyes sentrabot-organic-avatar-eyes-${mode}`}
            fill="#101014"
          >
            <rect x="-14" y="-12" width="7" height="24" rx="3.5" />
            <rect x="7" y="-12" width="7" height="24" rx="3.5" />
          </g>
        ))}
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

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function lightenColor(hex: string, percent: number): string {
  return adjustColor(hex, percent);
}

function darkenColor(hex: string, percent: number): string {
  return adjustColor(hex, -percent);
}

function adjustColor(hex: string, percent: number): string {
  const clean = hex.replace(/^#/, "");
  if (clean.length !== 6 && clean.length !== 3) return hex;
  const num = parseInt(
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean,
    16,
  );
  if (Number.isNaN(num)) return hex;
  let r = (num >> 16) + Math.round((255 * percent) / 100);
  let g = ((num >> 8) & 0x00ff) + Math.round((255 * percent) / 100);
  let b = (num & 0x0000ff) + Math.round((255 * percent) / 100);
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
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
