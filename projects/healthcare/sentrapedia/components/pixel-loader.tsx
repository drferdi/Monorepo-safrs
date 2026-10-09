"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const subscribeMotion = (listener: () => void) => {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
};
const getReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const serverMotion = () => true;
const cells = Array.from({ length: 16 }, (_, index) => index);
const spiral = [0, 1, 2, 3, 7, 11, 15, 14, 13, 12, 8, 4, 5, 6, 10, 9];
const snake = [0, 1, 2, 3, 7, 6, 5, 4, 8, 9, 10, 11, 15, 14, 13, 12];
const check = [8, 13, 10, 7];
const patterns = [
  [...spiral, ...spiral.slice(1, -1).reverse()].map((cell) => [cell]),
  snake.map((cell, index) => snake.slice(Math.max(0, index - 1), index).concat(cell)),
  [cells.filter((cell) => [5, 6, 9, 10].includes(cell)), cells.filter((cell) => ![5, 6, 9, 10].includes(cell)), []],
  [cells.filter((cell) => (Math.floor(cell / 4) + cell % 4) % 2 === 0), cells.filter((cell) => (Math.floor(cell / 4) + cell % 4) % 2 === 1)],
];
// Complete each pattern's loop before switching to the next shape.
const frames = patterns.flatMap((pattern) => Array.from({ length: Math.ceil(1800 / (pattern.length * 110)) }, () => pattern).flat());

/** A reusable status indicator inspired by xevrion's pixel-loader; no artificial waiting. */
export function PixelLoader({ done = false, label = "Sedang memuat…", doneLabel = "Selesai", className = "" }: { done?: boolean; label?: string; doneLabel?: string; className?: string }) {
  const [tick, setTick] = useState(0);
  const reducedMotion = useSyncExternalStore(subscribeMotion, getReducedMotion, serverMotion);
  useEffect(() => {
    if (done || reducedMotion) return;
    // Freeze off-tab and dispose the timer when the operation completes or unmounts.
    const timer = setInterval(() => { if (!document.hidden) setTick((value) => value + 1); }, 110);
    return () => clearInterval(timer);
  }, [done, reducedMotion]);
  const lit = done ? check : frames[tick % frames.length];
  return <span role="status" aria-live="polite" className={`pixel-loader ${className}`} data-done={done}>
    <span className="pixel-grid" aria-hidden="true">{cells.map((cell) => <span key={cell} data-on={lit.includes(cell)} style={{ transitionDelay: done && check.includes(cell) ? `${check.indexOf(cell) * 55}ms` : `${(Math.floor(cell / 4) + cell % 4) * 18}ms` }}/>)}</span>
    <span className="visually-hidden">{done ? doneLabel : label}</span>
  </span>;
}
