"use client";

import { Fragment, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Pencil } from "lucide-react";
import { documentSections, documentTitle, emptySection, replaceSection, supportingSection } from "../lib/studio";
import { diagnosisReferenceMarker, diagnosisSectionTitles, doctorSummaryTitle, legacyTheOracleReferencesTitle, splitQuotes, theOracleReferencesTitle } from "../lib/aadi/presentation";
import { mobileQuery } from "../lib/layout";
import { streamAt, typedAt, wordsUpTo } from "../lib/typing";
import { autoNormalMarker } from "../lib/normal-exam";
import { TheOracleReferences } from "./theoracle-references";
import { useMediaQuery } from "./workspace-hooks";

// While typing, the text streams in word by word with no pause between sections (wordsUpTo), and nothing above the
// reader moves: empty sections never show, and a section's Edit and provenance arrive once its text is complete.

// The guideline passages sit in part 9's fold, which arrives whole; an edited older answer still has them as a part.
// Part 7's field labels listed under it in the case flow.
const therapySubItems = ["DDI", "Kontraindikasi"];
const quotesPart = (title: string) => title === theOracleReferencesTitle || title === legacyTheOracleReferencesTitle;

// On the phone, parts 2-4 start folded to their title and one line, so parts 5-7 come sooner (doctor-flow design C1).
const phoneFoldParts = diagnosisSectionTitles.slice(1, 4);
const foldedPart = (title: string, phone: boolean) => supportingSection(title) || (phone && phoneFoldParts.includes(title));
const tableSeparator =/^\|(?:\s*:?-+:?\s*\|)+$/;
// The folded part's one line: its opening text with the markdown and the table header dropped; CSS cuts it to one line.
const foldLine = (body: string) => body.split("\n").map(line => line.trim()).filter((line, index, lines) => !tableSeparator.test(line) && !tableSeparator.test(lines[index + 1] ?? ""))
  .map(line => line.startsWith("|") ? line.slice(1, -1).split("|").map(cell => cell.trim()).join(" · ") : line.replace(/\*\*/g, "").replace(/^(?:- |#+ )/, "")).join(" ").replace(/\s+/g, " ").trim().slice(0, 300);

// Two columns: the section list beside the document (in the right margin on wide canvases). AADI analyses and local drafts (Chief: "Clinic note redesign menjadi 2 kolom") share it.
export function DiagnosisDocument({ content, selected, onSelect, onEdit, renderContent, typing = false, label = "Alur kasus", navLabel = "Bagian analisis kasus", showMeta = true, onEditSection, autoFilled = [] }: { content: string; selected: number; onSelect: (index: number) => void; onEdit: (content: string) => void; renderContent: (content: string, onEdit: (content: string) => void) => ReactNode; typing?: boolean; label?: string; navLabel?: string; showMeta?: boolean; onEditSection?: (index: number) => void; autoFilled?: string[] }) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const sections = useMemo(() => documentSections(content), [content]);
  const prefix = content.slice(0, content.indexOf("## "));
  const marker = `\n\n${diagnosisReferenceMarker}\n\n`;
  const parts = useMemo(() => sections.map(section => { const split = section.body.indexOf(marker); return { section, split, body: split < 0 ? section.body : section.body.slice(0, split) }; }), [sections, marker]);
  // Sections still holding only the draft placeholder collapse into one line of links below the text.
  const empty = useMemo(() => parts.flatMap((part, index) => emptySection(part.body) ? [index] : []), [parts]);
  // The exam lines the normal template filled are named once, in the same line style, until the draft is reviewed.
  const autoSection = parts.findIndex((part) => part.body.includes(autoNormalMarker));
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
  // A sub-item (DDI, Kontraindikasi) scrolls to its field label inside the part.
  const [subSelected, setSubSelected] = useState<string | null>(null);
  const navigate = (index: number, sub?: string) => {
    setElapsed(Infinity);
    onSelect(index);
    setArrived(index);
    setSubSelected(sub ?? null);
    requestAnimationFrame(() => {
      const target = root.current?.querySelector<HTMLElement>(`[id="${id}-${index}"]`);
      const folded = target?.querySelector<HTMLDetailsElement>(":scope > .diagnosis-supporting");
      if (folded) folded.open = true;
      const label = sub ? [...target?.querySelectorAll<HTMLElement>("h4.diagnosis-field-label") ?? []].find((heading) => heading.textContent === sub) : undefined;
      (label ?? target)?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      if (!label) (target?.matches("button") ? target : target?.querySelector<HTMLElement>("h3"))?.focus({ preventScroll: true });
    });
  };
  const summaryFirst = parts[0]?.section.title === doctorSummaryTitle;
  const navStart = summaryFirst ? 1 : 0;
  // One row per part, and under part 7 its DDI and Kontraindikasi when the part has them (Gaffer, 2026-10-21, RareUI RailTOC).
  const navItems = sections.flatMap((section, index) => index < navStart ? [] : [{ index, label: section.title, sub: undefined as string | undefined },
    ...(section.title === diagnosisSectionTitles[6] ? therapySubItems.filter((sub) => parts[index].body.split("\n").includes(sub)).map((sub) => ({ index, label: sub, sub })) : [])]);
  const subRow = subSelected === null ? -1 : navItems.findIndex((item) => item.index === current && item.sub === subSelected);
  const activeRow = subRow >= 0 ? subRow : navItems.findIndex((item) => item.index === current && !item.sub);
  const [hover, setHover] = useState<number | null>(null);
  const depth = (row: number | null) => row !== null && navItems[row]?.sub ? 1 : 0;
  const renderPart = ({ section, split, body }: typeof parts[number], index: number) => {
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
    return <section key={section.title} id={`${id}-${index}`} className="diagnosis-section" data-diagnosis-section={index} data-columns={section.title === diagnosisSectionTitles[1] || undefined} data-active={current === index} data-arrived={arrived === index} data-typing={typingNow && index === typingSection} aria-labelledby={`${id}-heading-${index}`}>
      {supportingSection(section.title)
        ? <details className="diagnosis-supporting"><summary>{heading}</summary>{edit}{sectionBody}</details>
        : foldedPart(section.title, phone)
        ? <details className="diagnosis-supporting" data-fold="part"><summary><span>{heading}<span className="diagnosis-fold-line">{foldLine(body)}</span></span></summary>{edit}{sectionBody}</details>
        : <><div className="diagnosis-section-heading">{heading}{edit}</div>{sectionBody}</>}
    </section>;
  };
  return <div className="diagnosis-document" ref={root} aria-busy={typingNow}>
    {/* The case flow lists the report's parts only; the doctor's summary is a section of its own above it (Gaffer,
        2026-10-21). Rails as RareUI's HookSidebar: the accent one hooks into the current part, a muted one into the hovered. */}
    <nav className="diagnosis-nav" aria-label={navLabel} data-active={activeRow >= 0 || undefined} data-hover={hover !== null && hover !== activeRow || undefined} style={{ "--active-section": activeRow, "--active-depth": depth(activeRow), "--hover-section": hover ?? 0, "--hover-depth": depth(hover) } as CSSProperties} onMouseLeave={() => setHover(null)}>
      <span className="diagnosis-nav-label">{label}</span>
      <div className="diagnosis-nav-items">
        <span className="diagnosis-nav-hover" aria-hidden="true"/>
        <span className="diagnosis-nav-branch" aria-hidden="true"/>
        {navItems.map((item, row) => <button type="button" key={item.sub ? `${item.label}-${item.index}` : item.label} style={{ "--item-order": row } as CSSProperties} data-depth={item.sub ? 1 : undefined} aria-current={row === activeRow ? "location" : undefined} aria-controls={`${id}-${item.index}`} data-pending={typingNow && item.index > typingSection} onMouseEnter={() => setHover(row)} onFocus={() => setHover(row)} onBlur={() => setHover(null)} onClick={() => navigate(item.index, item.sub)}>{item.label}</button>)}
      </div>
    </nav>
    <div className="diagnosis-sections">
      {/* The doctor's summary stands as its own section above the report (Gaffer, 2026-10-21). */}
      {summaryFirst && renderPart(parts[0], 0)}
      {renderContent(showMeta ? prefix : documentTitle(content), () => undefined)}
      {parts.map((part, index) => summaryFirst && index === 0 ? null : renderPart(part, index))}
      {!typingNow && empty.length > 0 && <p className="empty-sections">Belum diisi: {empty.map((index, order) => <Fragment key={index}>{order > 0 && ", "}<button type="button" id={`${id}-${index}`} data-empty-section={index} className="text-button" aria-label={`Isi bagian ${sections[index].title}`} onClick={() => onEditSection ? onEditSection(index) : navigate(index)}>{sections[index].title}</button></Fragment>)}</p>}
      {!typingNow && autoFilled.length > 0 && autoSection >= 0 && <p className="empty-sections">Diisi templat normal: {autoFilled.map((label, order) => <Fragment key={label}>{order > 0 && ", "}<button type="button" className="text-button" aria-label={`Lihat ${label} di ${sections[autoSection].title}`} onClick={() => navigate(autoSection)}>{label}</button></Fragment>)}. Tinjau sebelum Ditinjau.</p>}
    </div>
  </div>;
}
