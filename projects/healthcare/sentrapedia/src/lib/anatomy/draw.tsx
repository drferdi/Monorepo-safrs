import * as React from "react";
import type { Flat, LineTone, SolidPaths, Tone } from "./iso-kit";

// The server-safe drawing components of the anatomy kit (kit/react/draw.tsx, MIT, see ./LICENSE), cut down to what
// the admission figure uses. The kit's own file also pulls in its client-side Stage, which a figure with no
// pointer-driven art does not need.

const tenth = (value: number) => Math.round(value * 10) / 10;

interface SolidProps {
  paths: SolidPaths;
  tone?: Tone;
  crease?: Tone | "none";
  halo?: boolean;
  lit?: boolean;
  flat?: boolean;
  className?: string;
  inner?: React.ReactNode;
  /** Marks the solid so live code can find it and light it. */
  cell?: number;
}

export function Solid({ paths, tone = "hi", crease = "faint", halo = false, lit = false, flat = false, className, inner, cell }: SolidProps) {
  return (
    <g className={className ? `iso-solid ${className}` : "iso-solid"} data-lit={lit ? "" : undefined} data-seamless={paths.seamless ? "" : undefined} data-cell-solid={cell}>
      {halo ? <path className="iso-halo" d={paths.fill} /> : null}
      <path className="iso-fill" d={paths.fill} />
      {flat ? null : paths.shades.map((d, shade) => (d ? <path key={shade} className="iso-shade" data-shade={shade} d={d} /> : null))}
      {flat ? null : <path className="iso-top" d={paths.top} />}
      {crease === "none" || !paths.crease ? null : <path className="iso-line iso-crease" data-tone={crease} d={paths.crease} />}
      {crease === "none" || !paths.bevel ? null : <path className="iso-line iso-bevel" data-tone={crease} d={paths.bevel} />}
      {inner}
      <path className="iso-line iso-edge" data-tone={tone} d={paths.outline} />
    </g>
  );
}

interface LineProps {
  d: string;
  tone?: LineTone;
  free?: boolean | "start" | "end";
}

export function Line({ d, tone = "lo", free }: LineProps) {
  if (!d) return null;
  return <path className="iso-line" data-tone={tone} data-free={free === true ? "" : free || undefined} d={d} />;
}

export function Dots({ points, size = 0.5, tone = "mid" }: { points: Array<Flat | [number, number, number]>; size?: number; tone?: Tone }) {
  return (
    <g className="iso-dots" data-tone={tone}>
      {points.map(([x, y, alpha], index) => (
        <circle key={index} cx={tenth(x)} cy={tenth(y)} r={size} fillOpacity={alpha !== undefined && alpha < 1 ? Math.max(0, alpha) : undefined} />
      ))}
    </g>
  );
}

export function FaceText({ transform, children, size = 3, tone = "mid", anchor = "start" }: { transform: string; children: React.ReactNode; size?: number; tone?: Tone; anchor?: "start" | "middle" | "end" }) {
  return (
    <text className="iso-face-text" data-tone={tone} transform={transform} fontSize={size} textAnchor={anchor}>
      {children}
    </text>
  );
}
