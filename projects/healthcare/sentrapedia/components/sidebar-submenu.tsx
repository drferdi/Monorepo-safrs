"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { litPath, rowMiddle, spring, springEasing, SUBMENU_ROW, SUBMENU_TITLE, treePath } from "../lib/submenu-motion";

export interface SubmenuSection {
  id: string;
  title: string;
  selectedId?: string | null;
  items: { id: string; label: ReactNode; onSelect: () => void; actions?: ReactNode }[];
  empty?: ReactNode;
  action?: ReactNode;
}

const motionVars = { "--submenu-spring": springEasing, "--submenu-spring-ms": `${Math.round(spring.duration * 1000)}ms` } as CSSProperties;

/** After lab.xevrion.dev/lab/sidebar-submenu: one section open at a time, a bar riding the rail to the open
 *  title, items hanging off a drawn tree, and the branch to the current item lit and following it. */
export function SidebarSubmenu({ sections, initialSection }: { sections: SubmenuSection[]; initialSection: string }) {
  const [openId, setOpenId] = useState(initialSection);
  const id = useId();
  const openIndex = Math.max(0, sections.findIndex((section) => section.id === openId));
  return <div className="sidebar-submenu" style={motionVars}>
    <span aria-hidden="true" className="submenu-bar" style={{ transform: `translateY(${openIndex * SUBMENU_TITLE}px)` }}/>
    {sections.map((section) => {
      const open = section.id === openId;
      const selectedIndex = section.items.findIndex((item) => item.id === section.selectedId);
      const panelId = `${id}-${section.id}`;
      return <section key={section.id} className="submenu-section" data-open={open}>
        <div className="submenu-heading"><button type="button" id={`${panelId}-title`} aria-expanded={open} aria-controls={panelId} onClick={() => setOpenId(section.id)}><span>{section.title}</span><span className="submenu-count">{section.items.length}</span><ChevronDown size={13}/></button>{section.action}</div>
        <div id={panelId} role="region" aria-labelledby={`${panelId}-title`} className="submenu-body" inert={!open} aria-hidden={!open}>
          <div className="submenu-clip"><div className="submenu-items">
            {section.items.length > 0 && <Branches count={section.items.length} active={selectedIndex}/>}
            {section.items.map((item, index) => <div key={item.id} className="submenu-item" style={{ "--item-order": index } as CSSProperties} data-active={item.id === section.selectedId}>
              <button type="button" aria-current={item.id === section.selectedId ? "true" : undefined} onClick={item.onSelect}>{item.label}</button>{item.actions}
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
