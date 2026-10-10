"use client";

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Pencil } from "lucide-react";
import { documentSections, documentTitle, replaceSection, supportingSection } from "../lib/studio";
import { diagnosisReferenceMarker } from "../lib/mira/presentation";
import { revealAt } from "../lib/typing";

// Two columns: the section list beside the document (in the right margin on wide canvases). MIRA analyses and local drafts (Chief: "Clinic note redesign menjadi 2 kolom") share it.
export function DiagnosisDocument({ content, selected, onSelect, onEdit, renderContent, typing = false, label = "Alur kasus", navLabel = "Bagian analisis kasus", showMeta = true, onEditSection }: { content: string; selected: number; onSelect: (index: number) => void; onEdit: (content: string) => void; renderContent: (content: string, onEdit: (content: string) => void) => ReactNode; typing?: boolean; label?: string; navLabel?: string; showMeta?: boolean; onEditSection?: (index: number) => void }) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const sections = useMemo(() => documentSections(content), [content]);
  const prefix = content.slice(0, content.indexOf("## "));
  const marker = `\n\n${diagnosisReferenceMarker}\n\n`;
  const parts = useMemo(() => sections.map(section => { const split = section.body.indexOf(marker); return { section, split, body: split < 0 ? section.body : section.body.slice(0, split) }; }), [sections, marker]);
  const lengths = useMemo(() => [prefix.length, ...parts.map(part => part.body.length)], [prefix.length, parts]);
  const [elapsed, setElapsed] = useState(typing ? 0 : Infinity);
  const progress = revealAt(lengths, elapsed);
  const typingNow = !progress.done;
  const typingSection = Math.max(0, progress.active - 1);
  const current = typingNow ? typingSection : selected;

  useEffect(() => {
    if (!typing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setElapsed(Infinity); return; }
    const started = performance.now();
    let frame = requestAnimationFrame(function tick(now) { setElapsed(now - started); if (!revealAt(lengths, now - started).done) frame = requestAnimationFrame(tick); });
    return () => cancelAnimationFrame(frame);
  }, [typing, lengths]);
  // Once typing ends the tree stays on the last section.
  useEffect(() => { if (typing && !typingNow) onSelect(sections.length - 1); }, [typing, typingNow, sections.length, onSelect]);

  // The section last reached from the list; its heading draws a tosca underline.
  const [arrived, setArrived] = useState<number | null>(null);
  const navigate = (index: number) => {
    setElapsed(Infinity);
    onSelect(index);
    setArrived(index);
    requestAnimationFrame(() => {
      const target = root.current?.querySelectorAll<HTMLElement>("[data-diagnosis-section]")[index];
      const folded = target?.querySelector<HTMLDetailsElement>(":scope > .diagnosis-supporting");
      if (folded) folded.open = true;
      target?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      target?.querySelector<HTMLElement>("h3")?.focus({ preventScroll: true });
    });
  };
  return <div className="diagnosis-document" ref={root} aria-busy={typingNow}>
    <nav className="diagnosis-nav" aria-label={navLabel} style={{ "--active-section": current } as CSSProperties}>
      <span className="diagnosis-nav-label">{label}</span>
      <div className="diagnosis-nav-items">
        <span className="diagnosis-nav-branch" aria-hidden="true"/>
        {sections.map((section, index) => <button type="button" key={section.title} style={{ "--item-order": index } as CSSProperties} aria-current={current === index ? "location" : undefined} aria-controls={`${id}-${index}`} data-pending={typingNow && index > typingSection} onClick={() => navigate(index)}>{section.title}</button>)}
      </div>
    </nav>
    <div className="diagnosis-sections">
      {renderContent(showMeta ? prefix.slice(0, progress.visible[0]) : documentTitle(content), () => undefined)}
      {parts.map(({ section, split, body }, index) => {
        if (typingNow && index > typingSection) return null;
        const editable = !typingNow;
        const heading = <h3 id={`${id}-heading-${index}`} tabIndex={-1}>{section.title}</h3>;
        const edit = editable && onEditSection && <button type="button" className="text-button" aria-label={`Edit bagian ${section.title}`} onClick={() => onEditSection(index)}><Pencil size={12}/> Edit</button>;
        const sectionBody = <div className="diagnosis-section-body">
          {renderContent(editable ? body : body.slice(0, progress.visible[index + 1]), value => { if (editable) onEdit(replaceSection(content, section, split < 0 ? value : value + section.body.slice(split))); })}
          {split >= 0 && editable && <details className="diagnosis-provenance"><summary>Referensi dan jejak analisis</summary>{renderContent(section.body.slice(split + marker.length), () => undefined)}</details>}
        </div>;
        return <section key={section.title} id={`${id}-${index}`} className="diagnosis-section" data-diagnosis-section={index} data-active={current === index} data-arrived={arrived === index} data-typing={typingNow && index === typingSection} data-unfolding={typingNow && index === typingSection && progress.unfolding} aria-labelledby={`${id}-heading-${index}`}>
          {supportingSection(section.title)
            ? <details className="diagnosis-supporting"><summary>{heading}</summary>{edit}{sectionBody}</details>
            : <><div className="diagnosis-section-heading">{heading}{edit}</div>{sectionBody}</>}
        </section>;
      })}
    </div>
  </div>;
}
