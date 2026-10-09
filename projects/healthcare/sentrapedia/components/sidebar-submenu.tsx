"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { focusStep, locate, restoreNavMemory } from "../lib/nav-tree";
import { litPath, rowMiddle, spring, SUBMENU_ROW, treePath } from "../lib/submenu-motion";

function readMemory(key: string): string | null { try { return localStorage.getItem(key); } catch { return null; } }

export interface SubmenuSection {
  id: string;
  title: string;
  count?: number;
  caption?: ReactNode;
  /** Row height for every item in the section; taller for two-line rows. */
  row?: number;
  items: { id: string; label: ReactNode; onSelect: () => void; actions?: ReactNode }[];
  empty?: ReactNode;
  action?: ReactNode;
}

/** After lab.xevrion.dev/lab/sidebar-submenu: items hang off a drawn tree and the lit branch follows the pointer or focus,
 *  resting on the current item. One item is current (`activeItemId`, tosca) and its group's heading shows it too.
 *  Groups open and close independently; the open groups are remembered under `memoryKey` (UI state only).
 *  A current item inside a closed group opens it. Arrow keys, Home and End move between rows. */
export function SidebarSubmenu({ sections, initialOpen, activeItemId = null, memoryKey }: { sections: SubmenuSection[]; initialOpen: string[]; activeItemId?: string | null; memoryKey?: string }) {
  const shape = sections.map((section) => ({ id: section.id, itemIds: section.items.map((item) => item.id) }));
  const [openIds, setOpenIds] = useState(() => memoryKey ? restoreNavMemory(readMemory(memoryKey), shape, initialOpen) : initialOpen);
  const [hovered, setHovered] = useState<{ section: string; index: number } | null>(null);
  const [seenActive, setSeenActive] = useState<string | null | undefined>(undefined);
  // The current item, however it became current, opens its group (adjusted during render).
  if (activeItemId !== seenActive) {
    setSeenActive(activeItemId);
    const spot = locate(shape, activeItemId);
    if (spot && !openIds.includes(spot.section)) setOpenIds([...openIds, spot.section]);
  }
  useEffect(() => { if (memoryKey) try { localStorage.setItem(memoryKey, JSON.stringify({ open: openIds })); } catch { /* Memory is a convenience; the tree works without it. */ } }, [memoryKey, openIds]);
  const id = useId();
  const toggle = (sectionId: string) => setOpenIds((value) => value.includes(sectionId) ? value.filter((item) => item !== sectionId) : [...value, sectionId]);
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const rows = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>(".submenu-heading > button:first-child, .submenu-section[data-open=\"true\"] .submenu-item > button:first-child"));
    const index = rows.indexOf(document.activeElement as HTMLButtonElement);
    if (index < 0) return;
    const section = rows[index].closest<HTMLElement>(".submenu-section");
    const onTitle = rows[index].parentElement?.classList.contains("submenu-heading");
    const sectionId = section?.dataset.section;
    if (event.key === "ArrowRight" && onTitle && sectionId) {
      event.preventDefault(); setOpenIds((value) => value.includes(sectionId) ? value : [...value, sectionId]);
      requestAnimationFrame(() => requestAnimationFrame(() => section.querySelector<HTMLButtonElement>(".submenu-item > button")?.focus()));
      return;
    }
    if (event.key === "ArrowLeft" && !onTitle) { event.preventDefault(); section?.querySelector<HTMLButtonElement>(".submenu-heading > button")?.focus(); return; }
    const next = focusStep(rows.length, index, event.key);
    if (next === null) return;
    event.preventDefault(); rows[next].focus();
  }
  return <div className="sidebar-submenu" onKeyDown={onKeyDown}>
    {sections.map((section) => {
      const open = openIds.includes(section.id);
      const currentIndex = section.items.findIndex((item) => item.id === activeItemId);
      const branchIndex = open && hovered?.section === section.id ? hovered.index : currentIndex;
      const row = section.row ?? SUBMENU_ROW;
      const panelId = `${id}-${section.id}`;
      return <section key={section.id} className="submenu-section" data-open={open} data-section={section.id} data-current={currentIndex >= 0} style={{ "--submenu-row": `${row}px` } as CSSProperties}>
        <div className="submenu-heading"><button type="button" id={`${panelId}-title`} aria-expanded={open} aria-controls={panelId} onClick={() => { toggle(section.id); setHovered(null); }}><span>{section.title}</span>{section.count !== undefined && <span className="submenu-count">{section.count}</span>}<ChevronDown size={13}/></button>{section.action}</div>
        <div id={panelId} role="region" aria-labelledby={`${panelId}-title`} className="submenu-body" inert={!open} aria-hidden={!open}>
          <div className="submenu-clip">{section.caption}<div className="submenu-items">
            {section.items.length > 0 && <Branches count={section.items.length} active={branchIndex} row={row}/>}
            {section.items.map((item, index) => <div key={item.id} className="submenu-item" style={{ "--item-order": index } as CSSProperties} data-current={item.id === activeItemId} onPointerEnter={() => setHovered({ section: section.id, index })} onPointerLeave={() => setHovered(null)} onFocus={() => setHovered({ section: section.id, index })} onBlur={() => setHovered(null)}>
              <button type="button" aria-current={item.id === activeItemId ? "page" : undefined} onClick={item.onSelect}>{item.label}</button>{item.actions}
            </div>)}
            {!section.items.length && section.empty}
          </div></div>
        </div>
      </section>;
    })}
  </div>;
}

/** The grey tree, and the lit branch that stretches to the current row on the reference's spring. */
function Branches({ count, active, row }: { count: number; active: number; row: number }) {
  const lit = useRef<SVGPathElement>(null);
  const y = useRef(rowMiddle(Math.max(active, 0), row));
  useEffect(() => {
    if (active < 0) return;
    const target = rowMiddle(active, row), start = y.current;
    const draw = (value: number) => { y.current = value; lit.current?.setAttribute("d", litPath(value)); };
    if (start === target || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { draw(target); return; }
    let frame = 0; const began = performance.now();
    const step = (now: number) => {
      const t = (now - began) / 1000;
      if (t >= spring.duration) { draw(target); return; }
      draw(start + (target - start) * spring.at(t));
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [active, row]);
  return <svg aria-hidden="true" className="submenu-tree" width={14} height={count * row} fill="none" strokeLinecap="round">
    <path d={treePath(count, row)} className="submenu-tree-grey"/>
    <path ref={lit} pathLength={1} className="submenu-tree-lit" visibility={active >= 0 ? "visible" : "hidden"}/>
  </svg>;
}
