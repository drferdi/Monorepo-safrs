"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState, type CSSProperties, type ReactNode } from "react";

export interface SubmenuSection {
  id: string;
  title: string;
  selectedId?: string | null;
  items: { id: string; label: ReactNode; onSelect: () => void; actions?: ReactNode }[];
  empty?: ReactNode;
  action?: ReactNode;
}

/** One open branch at a time; CSS owns folding, staggering, and the active tree rail. */
export function SidebarSubmenu({ sections, initialSection }: { sections: SubmenuSection[]; initialSection: string }) {
  const [openId, setOpenId] = useState(initialSection);
  const id = useId();
  return <div className="sidebar-submenu">{sections.map((section) => {
    const open = section.id === openId;
    const selectedIndex = section.items.findIndex((item) => item.id === section.selectedId);
    const panelId = `${id}-${section.id}`;
    return <section key={section.id} className="submenu-section" data-open={open}>
      <div className="submenu-heading"><button type="button" id={`${panelId}-title`} aria-expanded={open} aria-controls={panelId} onClick={() => setOpenId(section.id)}><span>{section.title}</span><span className="submenu-count">{section.items.length}</span><ChevronDown size={13}/></button>{section.action}</div>
      <div id={panelId} role="region" aria-labelledby={`${panelId}-title`} className="submenu-body" inert={!open} aria-hidden={!open}>
        <div className="submenu-clip"><div className="submenu-items">
          {selectedIndex >= 0 && <span aria-hidden="true" className="submenu-active-branch" style={{ height: `${selectedIndex * 34 + 17}px` }}/>}
          {section.items.map((item, index) => <div key={item.id} className="submenu-item" style={{ "--item-order": index } as CSSProperties} data-active={item.id === section.selectedId}>
            <button type="button" aria-current={item.id === section.selectedId ? "true" : undefined} onClick={item.onSelect}>{item.label}</button>{item.actions}
          </div>)}
          {!section.items.length && section.empty}
        </div></div>
      </div>
    </section>;
  })}</div>;
}
