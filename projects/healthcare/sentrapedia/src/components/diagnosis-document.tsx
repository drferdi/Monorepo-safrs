"use client";

import { Fragment, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Pencil } from "lucide-react";
import { documentSections, documentTitle, emptySection, replaceSection, supportingSection } from "../lib/studio";
import { diagnosisReferenceMarker, diagnosisSectionTitles, legacyTheOracleReferencesTitle, splitQuotes, theOracleReferencesTitle } from "../lib/aadi/presentation";
import { mobileQuery } from "../lib/layout";
import { streamAt, typedAt, wordsUpTo } from "../lib/typing";
import { TheOracleReferences } from "./theoracle-references";
import { useMediaQuery } from "./workspace-hooks";

// While typing, the text streams in word by word with no pause between sections (wordsUpTo), and nothing above the
// reader moves: empty sections never show, and a section's Edit and provenance arrive once its text is complete.

// The guideline passages sit in part 9's fold, which arrives whole; an edited older answer still has them as a part.
const quotesPart = (title: string) => title === theOracleReferencesTitle || title === legacyTheOracleReferencesTitle;

// On the phone, parts 2-4 start folded to their title and one line, so parts 5-7 come sooner (doctor-flow design C1).
const phoneFoldParts = diagnosisSectionTitles.slice(1, 4);
const foldedPart = (title: string, phone: boolean) => supportingSection(title) || (phone && phoneFoldParts.includes(title));
const tableSeparator =/^\|(?:\s*:?-+:?\s*\|)+$/;
// The folded part's one line: its opening text with the markdown and the table header dropped; CSS cuts it to one line.
const foldLine = (body: string) => body.split("\n").map(line => line.trim()).filter((line, index, lines) => !tableSeparator.test(line) && !tableSeparator.test(lines[index + 1] ?? ""))
  .map(line => line.startsWith("|") ? line.slice(1, -1).split("|").map(cell => cell.trim()).join(" · ") : line.replace(/\*\*/g, "").replace(/^(?:- |#+ )/, "")).join(" ").replace(/\s+/g, " ").trim().slice(0, 300);

// Two columns: the section list beside the document (in the right margin on wide canvases). AADI analyses and local drafts (Chief: "Clinic note redesign menjadi 2 kolom") share it.
export function DiagnosisDocument({ content, selected, onSelect, onEdit, renderContent, typing = false, label = "Alur kasus", navLabel = "Bagian analisis kasus", showMeta = true, onEditSection }: { content: string; selected: number; onSelect: (index: number) => void; onEdit: (content: string) => void; renderContent: (content: string, onEdit: (content: string) => void) => ReactNode; typing?: boolean; label?: string; navLabel?: string; showMeta?: boolean; onEditSection?: (index: number) => void }) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const sections = useMemo(() => documentSections(content), [content]);
  const prefix = content.slice(0, content.indexOf("## "));
  const marker = `\n\n${diagnosisReferenceMarker}\n\n`;
  const parts = useMemo(() => sections.map(section => { const split = section.body.indexOf(marker); return { section, split, body: split < 0 ? section.body : section.body.slice(0, split) }; }), [sections, marker]);
  // Sections still holding only the draft placeholder collapse into one line of links below the text.
  const empty = useMemo(() => parts.flatMap((part, index) => emptySection(part.body) ? [index] : []), [parts]);
  const phone = useMediaQuery(mobileQuery);
  // The title shows at once. The references show as compact titles and a folded section starts closed, so neither
  // is typed text: they take no typing time and arrive whole once the text before them is typed. Nor do empty sections.
  const lengths = useMemo(() => [0, ...parts.map((part, index) => empty.includes(index) || quotesPart(part.section.title) || foldedPart(part.section.title, phone) ? 0 : part.body.length)], [parts, empty, phone]);
  const total = lengths.reduce((sum, length) => sum + length, 0);
  const [elapsed, setElapsed] = useState(typing ? 0 : Infinity);
  const progress = streamAt(lengths, typedAt(elapsed, total));
  const typingNow = !progress.done;
  const typingSection = Math.max(0, progress.active - 1);
  const current = typingNow ? typingSection : selected;

  useEffect(() => {
    if (!typing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setElapsed(Infinity); return; }
    const started = performance.now();
    let frame = requestAnimationFrame(function tick(now) { setElapsed(now - started); if (typedAt(now - started, total) < total) frame = requestAnimationFrame(tick); });
    return () => cancelAnimationFrame(frame);
  }, [typing, total]);
  // Once typing ends the tree stays on the last section.
  useEffect(() => { if (typing && !typingNow) onSelect(sections.length - 1); }, [typing, typingNow, sections.length, onSelect]);

  // The section last reached from the list; its heading draws a tosca underline.
  const [arrived, setArrived] = useState<number | null>(null);
  const navigate = (index: number) => {
    setElapsed(Infinity);
    onSelect(index);
    setArrived(index);
    requestAnimationFrame(() => {
      const target = root.current?.querySelector<HTMLElement>(`[id="${id}-${index}"]`);
      const folded = target?.querySelector<HTMLDetailsElement>(":scope > .diagnosis-supporting");
      if (folded) folded.open = true;
      target?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      (target?.matches("button") ? target : target?.querySelector<HTMLElement>("h3"))?.focus({ preventScroll: true });
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
      {renderContent(showMeta ? prefix : documentTitle(content), () => undefined)}
      {parts.map(({ section, split, body }, index) => {
        if ((typingNow && index > typingSection) || empty.includes(index)) return null;
        const editable = !typingNow, complete = editable || progress.visible[index + 1] >= lengths[index + 1];
        const heading = <h3 id={`${id}-heading-${index}`} tabIndex={-1}>{section.title}</h3>;
        const edit = complete && onEditSection && <button type="button" className="text-button" aria-label={`Edit bagian ${section.title}`} onClick={() => onEditSection(index)}><Pencil size={12}/> Edit</button>;
        const plain = renderContent(complete ? body : wordsUpTo(body, progress.visible[index + 1]), value => { if (editable) onEdit(replaceSection(content, section, split < 0 ? value : value + section.body.slice(split))); });
        const fold = section.body.slice(split + marker.length), quotes = splitQuotes(fold);
        const sectionBody = <div className="diagnosis-section-body">
          {quotesPart(section.title) ? <TheOracleReferences body={body} fallback={plain}/> : plain}
          {split >= 0 && complete && <details className="diagnosis-provenance"><summary>Referensi dan jejak analisis</summary>{quotes
            ? <>{renderContent(quotes[0], () => undefined)}<TheOracleReferences body={quotes[1]} fallback={renderContent(quotes[1], () => undefined)}/>{quotes[2] && renderContent(quotes[2], () => undefined)}</>
            : renderContent(fold, () => undefined)}</details>}
        </div>;
        return <section key={section.title} id={`${id}-${index}`} className="diagnosis-section" data-diagnosis-section={index} data-active={current === index} data-arrived={arrived === index} data-typing={typingNow && index === typingSection} aria-labelledby={`${id}-heading-${index}`}>
          {supportingSection(section.title)
            ? <details className="diagnosis-supporting"><summary>{heading}</summary>{edit}{sectionBody}</details>
            : foldedPart(section.title, phone)
            ? <details className="diagnosis-supporting" data-fold="part"><summary><span>{heading}<span className="diagnosis-fold-line">{foldLine(body)}</span></span></summary>{edit}{sectionBody}</details>
            : <><div className="diagnosis-section-heading">{heading}{edit}</div>{sectionBody}</>}
        </section>;
      })}
      {!typingNow && empty.length > 0 && <p className="empty-sections">Belum diisi: {empty.map((index, order) => <Fragment key={index}>{order > 0 && ", "}<button type="button" id={`${id}-${index}`} data-empty-section={index} className="text-button" aria-label={`Isi bagian ${sections[index].title}`} onClick={() => onEditSection ? onEditSection(index) : navigate(index)}>{sections[index].title}</button></Fragment>)}</p>}
    </div>
  </div>;
}
