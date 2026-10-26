"use client";

import { useEffect } from "react";
import { TOUR } from "./layout";

// Moves what art.tsx marked and nothing else: the cards of one cell rise out of their pouches, one after another,
// and that cell's solids take the lit accent. The picture is complete without this, so a browser with scripts off,
// or a visitor who asks for no motion, sees the cabinet at rest.

const STEP_MS = 2800;
const RESUME_MS = 3600;
const STAGGER = 0.11;
const FOLLOW = 0.16;

interface Card {
  el: SVGGElement;
  cell: number;
  slot: number;
  lift: number;
  /** When this card's target last changed, so each card in a cell can start a beat after the one before. */
  since: number;
  aim: number;
}

export function TesseractMotion() {
  useEffect(() => {
    const root = document.querySelector<SVGSVGElement>("svg[data-tesseract]");
    if (!root) return;
    const [riseX = 0, riseY = 0] = (root.dataset.rise ?? "0,0").split(",").map(Number);
    const readout = root.closest("figure")?.querySelector<HTMLElement>("[data-tesseract-readout]") ?? null;
    const rest = readout?.textContent ?? "";
    const calm = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

    const cards: Card[] = Array.from(root.querySelectorAll<SVGGElement>("[data-card]"), (el) => ({ el, cell: Number(el.dataset.card), slot: Number(el.dataset.slot), lift: 0, since: 0, aim: 0 }));
    const solids = new Map<number, Element[]>();
    for (const solid of root.querySelectorAll("[data-cell-solid]")) {
      const cell = Number(solid.getAttribute("data-cell-solid"));
      solids.set(cell, [...(solids.get(cell) ?? []), solid]);
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
      const raised = cards.filter((card) => card.cell === active).length;
      readout.textContent = active ? `sel ${active} dari 8 · ${raised} kartu naik` : rest;
    };

    const light = (cell: number, on: boolean) => {
      for (const solid of solids.get(cell) ?? []) {
        if (on) solid.setAttribute("data-lit", "");
        else solid.removeAttribute("data-lit");
      }
    };

    const place = (card: Card) => card.el.setAttribute("transform", card.lift > 0.001 ? `translate(${(riseX * card.lift).toFixed(2)} ${(riseY * card.lift).toFixed(2)})` : "");

    const settled = () => cards.every((card) => card.lift === card.aim);

    const tick = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
      last = now;
      for (const card of cards) {
        const ready = (now - card.since) / 1000 >= card.slot * STAGGER;
        const goal = ready ? card.aim : card.lift;
        const next = calm ? goal : card.lift + (goal - card.lift) * (1 - Math.exp(-dt / FOLLOW));
        card.lift = Math.abs(goal - next) < 0.002 ? goal : next;
        place(card);
      }
      frame = visible && !settled() ? requestAnimationFrame(tick) : 0;
    };

    const run = () => {
      if (!frame && visible) {
        last = 0;
        frame = requestAnimationFrame(tick);
      }
    };

    const choose = (cell: number) => {
      if (cell === active) return;
      const now = performance.now();
      light(active, false);
      active = cell;
      light(active, true);
      for (const card of cards) {
        const aim = card.cell === active ? 1 : 0;
        if (aim !== card.aim) {
          card.aim = aim;
          card.since = now;
        }
      }
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
      const cell = Number((event.target as Element | null)?.closest("[data-cell]")?.getAttribute("data-cell"));
      if (!TOUR.includes(cell)) return;
      pause();
      choose(cell);
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
      for (const card of cards) card.el.removeAttribute("transform");
      light(active, false);
      if (readout) readout.textContent = rest;
    };
  }, []);

  return null;
}
