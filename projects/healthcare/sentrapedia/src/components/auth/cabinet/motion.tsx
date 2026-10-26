"use client";

import { useEffect } from "react";
import { DRAWERS, TOUR } from "./layout";

// Moves what art.tsx marked and nothing else: one drawer slides out of the cabinet, its cards rise one after another,
// and the drawer's front and cards take the lit accent. The picture is complete without this, so a browser with
// scripts off, or a visitor who asks for no motion, sees the cabinet shut.

const STEP_MS = 3200;
const RESUME_MS = 3600;
/** Cards start rising once the drawer is this far out, one card every STAGGER seconds. */
const OPEN_ENOUGH = 0.72;
const STAGGER = 0.09;
const SLIDE = 0.24;
const LIFT = 0.14;

interface Drawer {
  el: SVGGElement;
  id: number;
  out: number;
  aim: number;
}

interface Card {
  el: SVGGElement;
  drawer: number;
  slot: number;
  lift: number;
  aim: number;
  /** When the cards of this drawer were told to rise, so each can start a beat after the one before. */
  since: number;
}

export function CabinetMotion() {
  useEffect(() => {
    const root = document.querySelector<SVGSVGElement>("svg[data-cabinet]");
    if (!root) return;
    const vector = (name: string) => (root.dataset[name] ?? "0,0").split(",").map(Number) as [number, number];
    const [pullX, pullY] = vector("pull");
    const [riseX, riseY] = vector("rise");
    const readout = root.closest("figure")?.querySelector<HTMLElement>("[data-cabinet-readout]") ?? null;
    const rest = readout?.textContent ?? "";
    const calm = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

    const drawers: Drawer[] = Array.from(root.querySelectorAll<SVGGElement>("[data-drawer]"), (el) => ({ el, id: Number(el.dataset.drawer), out: 0, aim: 0 }));
    const cards: Card[] = Array.from(root.querySelectorAll<SVGGElement>("[data-card]"), (el) => ({ el, drawer: Number(el.dataset.card), slot: Number(el.dataset.slot), lift: 0, aim: 0, since: 0 }));
    const solids = new Map<number, Element[]>();
    for (const solid of root.querySelectorAll("[data-cell-solid]")) {
      const id = Number(solid.getAttribute("data-cell-solid"));
      solids.set(id, [...(solids.get(id) ?? []), solid]);
    }

    let active = 0;
    let frame = 0;
    let last = 0;
    let visible = true;
    let touring = !calm;
    let tour = 0;
    let stepTimer = 0;
    let resumeTimer = 0;

    const say = () => {
      if (!readout) return;
      const drawer = DRAWERS.find((candidate) => candidate.id === active);
      readout.textContent = drawer ? `${drawer.category.name} · ${drawer.category.entries} entri` : rest;
    };

    const light = (id: number, on: boolean) => {
      for (const solid of solids.get(id) ?? []) {
        if (on) solid.setAttribute("data-lit", "");
        else solid.removeAttribute("data-lit");
      }
    };

    const translate = (el: Element, x: number, y: number, amount: number) => {
      if (amount > 0.001) el.setAttribute("transform", `translate(${(x * amount).toFixed(2)} ${(y * amount).toFixed(2)})`);
      else el.removeAttribute("transform");
    };

    const follow = (value: number, goal: number, dt: number, tau: number) => {
      const next = calm ? goal : value + (goal - value) * (1 - Math.exp(-dt / tau));
      return Math.abs(goal - next) < 0.002 ? goal : next;
    };

    const settled = () => drawers.every((drawer) => drawer.out === drawer.aim) && cards.every((card) => card.lift === card.aim);

    const tick = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
      last = now;
      for (const drawer of drawers) {
        drawer.out = follow(drawer.out, drawer.aim, dt, SLIDE);
        translate(drawer.el, pullX, pullY, drawer.out);
        // Cards rise only once their drawer is out far enough to show them, and drop as soon as it starts back.
        const open = drawer.aim === 1 && drawer.out >= OPEN_ENOUGH;
        for (const card of cards) {
          if (card.drawer !== drawer.id) continue;
          const aim = open ? 1 : 0;
          if (aim !== card.aim) {
            card.aim = aim;
            card.since = now;
          }
        }
      }
      for (const card of cards) {
        const ready = card.aim === 0 || (now - card.since) / 1000 >= card.slot * STAGGER;
        card.lift = follow(card.lift, ready ? card.aim : card.lift, dt, LIFT);
        translate(card.el, riseX, riseY, card.lift);
      }
      frame = visible && !settled() ? requestAnimationFrame(tick) : 0;
    };

    const run = () => {
      if (!frame && visible) {
        last = 0;
        frame = requestAnimationFrame(tick);
      }
    };

    const choose = (id: number) => {
      if (id === active) return;
      light(active, false);
      active = id;
      light(active, true);
      for (const drawer of drawers) drawer.aim = drawer.id === active ? 1 : 0;
      say();
      run();
    };

    const step = () => {
      if (touring && visible) {
        choose(TOUR[tour % TOUR.length]!);
        tour += 1;
      }
      stepTimer = window.setTimeout(step, STEP_MS);
    };

    const pause = () => {
      touring = false;
      window.clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(() => {
        touring = !calm;
        if (!touring) choose(0);
      }, RESUME_MS);
    };

    const over = (event: PointerEvent) => {
      const id = Number((event.target as Element | null)?.closest("[data-drawer]")?.getAttribute("data-drawer"));
      if (!TOUR.includes(id)) return;
      pause();
      choose(id);
    };
    root.addEventListener("pointerover", over);
    root.addEventListener("pointermove", pause);

    const observer = typeof IntersectionObserver === "function" ? new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1]?.isIntersecting ?? true;
      if (visible) run();
    }, { rootMargin: "120px 0px" }) : null;
    observer?.observe(root);

    if (!calm) stepTimer = window.setTimeout(step, 1200);

    return () => {
      window.clearTimeout(stepTimer);
      window.clearTimeout(resumeTimer);
      cancelAnimationFrame(frame);
      observer?.disconnect();
      root.removeEventListener("pointerover", over);
      root.removeEventListener("pointermove", pause);
      for (const drawer of drawers) drawer.el.removeAttribute("transform");
      for (const card of cards) card.el.removeAttribute("transform");
      light(active, false);
      if (readout) readout.textContent = rest;
    };
  }, []);

  return null;
}
