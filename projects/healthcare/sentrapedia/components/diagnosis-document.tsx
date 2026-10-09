"use client";

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { documentSections, replaceSection } from "../lib/studio";
import { diagnosisReferenceMarker } from "../lib/mira/presentation";
import { revealAt } from "../lib/typing";

export function DiagnosisDocument({ content, selected, onSelect, onEdit, renderContent, typing = false }: { content: string; selected: number; onSelect: (index: number) => void; onEdit: (content: string) => void; renderContent: (content: string, onEdit: (content: string) => void) => ReactNode; typing?: boolean }) {
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

  const navigate = (index: number) => {
    setElapsed(Infinity);
    onSelect(index);
    requestAnimationFrame(() => {
      const target = root.current?.querySelectorAll<HTMLElement>("[data-diagnosis-section]")[index];
      target?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      target?.querySelector<HTMLElement>("h3")?.focus({ preventScroll: true });
    });
  };
  return <div className="diagnosis-document" ref={root} aria-busy={typingNow}>
    <nav className="diagnosis-nav" aria-label="Bagian analisis kasus" style={{ "--active-section": current } as CSSProperties}>
      <span className="diagnosis-nav-label">Alur kasus</span>
      <div className="diagnosis-nav-items">
        <span className="diagnosis-nav-branch" aria-hidden="true"/>
        {sections.map((section, index) => <button type="button" key={section.title} style={{ "--item-order": index } as CSSProperties} aria-current={current === index ? "location" : undefined} aria-controls={`${id}-${index}`} data-pending={typingNow && index > typingSection} onClick={() => navigate(index)}>{section.title}</button>)}
      </div>
    </nav>
    <div className="diagnosis-sections">
      {renderContent(prefix.slice(0, progress.visible[0]), () => undefined)}
      {parts.map(({ section, split, body }, index) => {
        if (typingNow && index > typingSection) return null;
        const editable = !typingNow;
        return <section key={section.title} id={`${id}-${index}`} className="diagnosis-section" data-diagnosis-section={index} data-active={current === index} data-typing={typingNow && index === typingSection} data-unfolding={typingNow && index === typingSection && progress.unfolding} aria-labelledby={`${id}-heading-${index}`}>
          <div className="diagnosis-section-heading"><h3 id={`${id}-heading-${index}`} tabIndex={-1}>{section.title}</h3></div>
          <div className="diagnosis-section-body">
            {renderContent(editable ? body : body.slice(0, progress.visible[index + 1]), value => { if (editable) onEdit(replaceSection(content, section, split < 0 ? value : value + section.body.slice(split))); })}
            {split >= 0 && editable && <details className="diagnosis-provenance"><summary>Referensi dan jejak analisis</summary>{renderContent(section.body.slice(split + marker.length), () => undefined)}</details>}
          </div>
        </section>;
      })}
    </div>
  </div>;
}
