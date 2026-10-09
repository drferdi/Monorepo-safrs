"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { focusStep, locate, restoreNavMemory } from "../lib/nav-tree";
import { litPath, rowMiddle, spring, SUBMENU_ROW, treePath } from "../lib/submenu-motion";

function readMemory(key: string): string | null { try { return localStorage.getItem(key); } catch { return null; } }

export interface SubmenuSection {
  id: string;
  title: string;
  selectedId?: string | null;
  items: { id: string; label: ReactNode; onSelect: () => void; actions?: ReactNode }[];
  empty?: ReactNode;
  action?: ReactNode;
}

/** After lab.xevrion.dev/lab/sidebar-submenu: one section open at a time, items hanging off a drawn tree,
 *  and the branch to the current item lit and following it. With `follow`, items have no lasting selection:
 *  the branch follows the pointer or focus and rests on the open dialog's item, else the item used last.
 *  The open group and last items are remembered under `memoryKey`; arrow keys, Home and End move between rows. */
export function SidebarSubmenu({ sections, initialSection, follow = false, activeItemId = null, memoryKey }: { sections: SubmenuSection[]; initialSection: string; follow?: boolean; activeItemId?: string | null; memoryKey?: string }) {
  const shape = sections.map((section) => ({ id: section.id, itemIds: section.items.map((item) => item.id) }));
  const [memory] = useState(() => follow && memoryKey ? restoreNavMemory(readMemory(memoryKey), shape, initialSection) : { open: initialSection, used: {} });
  const [openId, setOpenId] = useState(memory.open);
  const [hovered, setHovered] = useState<number | null>(null);
  const [used, setUsed] = useState<Record<string, number>>(memory.used);
  const [seenActive, setSeenActive] = useState<string | null | undefined>(undefined);
  // An open dialog, however it was opened, opens its group and becomes the group's item (adjusted during render).
  if (follow && activeItemId !== seenActive) {
    setSeenActive(activeItemId);
    const spot = locate(shape, activeItemId);
    if (spot) { setOpenId(spot.section); setUsed((value) => ({ ...value, [spot.section]: spot.index })); }
  }
  useEffect(() => { if (follow && memoryKey) try { localStorage.setItem(memoryKey, JSON.stringify({ open: openId, used })); } catch { /* Memory is a convenience; the tree works without it. */ } }, [follow, memoryKey, openId, used]);
  const id = useId();
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const rows = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>(".submenu-heading > button:first-child, .submenu-section[data-open=\"true\"] .submenu-item > button:first-child"));
    const index = rows.indexOf(document.activeElement as HTMLButtonElement);
    if (index < 0) return;
    const section = rows[index].closest<HTMLElement>(".submenu-section");
    const onTitle = rows[index].parentElement?.classList.contains("submenu-heading");
    if (event.key === "ArrowRight" && onTitle && section?.dataset.section) {
      event.preventDefault(); setOpenId(section.dataset.section);
      requestAnimationFrame(() => requestAnimationFrame(() => section.querySelector<HTMLButtonElement>(".submenu-item > button")?.focus()));
      return;
    }
    if (event.key === "ArrowLeft" && !onTitle) { event.preventDefault(); section?.querySelector<HTMLButtonElement>(".submenu-heading > button")?.focus(); return; }
    const next = focusStep(rows.length, index, event.key);
    if (next === null) return;
    event.preventDefault(); rows[next].focus();
  }
  return <div className="sidebar-submenu" onKeyDown={follow ? onKeyDown : undefined}>
    {sections.map((section) => {
      const open = section.id === openId;
      const selectedIndex = follow ? (open && hovered !== null ? hovered : used[section.id] ?? 0) : section.items.findIndex((item) => item.id === section.selectedId);
      const panelId = `${id}-${section.id}`;
      return <section key={section.id} className="submenu-section" data-open={open} data-section={section.id}>
        <div className="submenu-heading"><button type="button" id={`${panelId}-title`} aria-expanded={open} aria-controls={panelId} onClick={() => { setOpenId(section.id); setHovered(null); }}><span>{section.title}</span>{!follow && <span className="submenu-count">{section.items.length}</span>}<ChevronDown size={13}/></button>{section.action}</div>
        <div id={panelId} role="region" aria-labelledby={`${panelId}-title`} className="submenu-body" inert={!open} aria-hidden={!open}>
          <div className="submenu-clip"><div className="submenu-items">
            {section.items.length > 0 && <Branches count={section.items.length} active={selectedIndex}/>}
            {section.items.map((item, index) => <div key={item.id} className="submenu-item" style={{ "--item-order": index } as CSSProperties} data-active={follow ? index === selectedIndex : item.id === section.selectedId} {...(follow ? { onPointerEnter: () => setHovered(index), onPointerLeave: () => setHovered(null), onFocus: () => setHovered(index), onBlur: () => setHovered(null) } : {})}>
              <button type="button" aria-current={!follow && item.id === section.selectedId ? "true" : undefined} onClick={() => { if (follow) setUsed((value) => ({ ...value, [section.id]: index })); item.onSelect(); }}>{item.label}</button>{item.actions}
            </div>)}
            {!section.items.length && section.empty}
          </div></div>
        </div>
      </section>;
    })}
  </div>;
}

/** The grey tree, and the lit branch that stretches to the current row on the reference's spring. */
function Branches({ count, active }: { count: number; active: number }) {
  const lit = useRef<SVGPathElement>(null);
  const y = useRef(rowMiddle(Math.max(active, 0)));
  useEffect(() => {
    if (active < 0) return;
    const target = rowMiddle(active), start = y.current;
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
  }, [active]);
  return <svg aria-hidden="true" className="submenu-tree" width={14} height={count * SUBMENU_ROW} fill="none" strokeLinecap="round">
    <path d={treePath(count)} className="submenu-tree-grey"/>
    {active >= 0 && <path ref={lit} pathLength={1} className="submenu-tree-lit"/>}
  </svg>;
}
