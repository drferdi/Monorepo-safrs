"use client";

import { useSyncExternalStore } from "react";
import { greeting } from "../lib/ui-labels";

// An Indonesian greeting with the saved name ("Selamat malam, dr. Rani") and the motion of
// https://lab.xevrion.dev/lab/greeting (Chief, 2026-10-09):
// a sun or moon, chosen by the reader's local time, rises into place along an arc. The lab's sun/moon
// geometry is kept; its `motion` springs are recreated in CSS (globals.css, .greeting-glyph) without a new dependency.

function subscribeMinute(onChange: () => void) {
  let timer: ReturnType<typeof setTimeout>;
  const schedule = () => { timer = setTimeout(() => { onChange(); schedule(); }, 60_000 - (Date.now() % 60_000) + 20); };
  schedule();
  return () => clearTimeout(timer);
}
const minuteSnapshot = () => Math.floor(Date.now() / 60_000);
// The server cannot know the reader's hour, so no glyph is rendered until the client takes over.
const serverSnapshot = () => null;

// Days since a known new moon, folded into one synodic cycle: 0 is new, 0.5 is full.
const newMoon = Date.UTC(2000, 0, 6, 18, 14);
const synodic = 29.530588853 * 86_400_000;
const moonPhase = (at: number) => (((at - newMoon) % synodic) + synodic) % synodic / synodic;
const round = (n: number) => Math.round(n * 100) / 100;

function Sun({ hour }: { hour: number }) {
  // Rays are stubs at dawn and dusk and longest at noon.
  const height = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI));
  const inner = 7.5, outer = inner + 1.2 + height * 2.6;
  return <><circle cx="12" cy="12" r="4.25"/>{Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return <line key={i} x1={round(12 + Math.cos(a) * inner)} y1={round(12 + Math.sin(a) * inner)} x2={round(12 + Math.cos(a) * outer)} y2={round(12 + Math.sin(a) * outer)}/>; })}</>;
}

function Moon({ phase }: { phase: number }) {
  const r = 7, rx = round(Math.abs(Math.cos(phase * Math.PI * 2)) * r);
  const waxing = phase < 0.5, crescent = phase < 0.25 || phase > 0.75;
  const d = `M12 ${12 - r}A${r} ${r} 0 0 ${waxing ? 1 : 0} 12 ${12 + r}A${rx} ${r} 0 0 ${waxing === crescent ? 0 : 1} 12 ${12 - r}Z`;
  return <><circle cx="12" cy="12" r={r} opacity={0.3}/><path d={d} fill="currentColor" stroke="none"/></>;
}

export function WorkspaceGreeting({ name }: { name: string }) {
  const minute = useSyncExternalStore(subscribeMinute, minuteSnapshot, serverSnapshot);
  let glyph = null, text = null;
  if (minute !== null) {
    const now = new Date(minute * 60_000);
    const hour = now.getHours() + now.getMinutes() / 60;
    // The sun sets at 18, when the greeting turns to "malam".
    const sunUp = hour >= 6 && hour < 18;
    // Keyed by body, so the new one rises when the sun sets or rises.
    glyph = <span key={sunUp ? "sun" : "moon"} className="greeting-arc"><svg className="greeting-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round">{sunUp ? <Sun hour={hour}/> : <Moon phase={moonPhase(minute * 60_000)}/>}</svg></span>;
    const line = greeting(hour, name);
    // Keyed by the words, so a new part of the day or a new name fades in.
    text = <span key={line} className="greeting-text">{line}</span>;
  }
  // The glyph slot is reserved from the first render, so its arrival never nudges the text.
  return <span className="workspace-greeting"><span className="greeting-slot" aria-hidden="true">{glyph}</span>{text}</span>;
}
