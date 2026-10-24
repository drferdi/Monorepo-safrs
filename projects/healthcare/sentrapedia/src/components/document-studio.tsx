"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Columns2, FileText, GitCompareArrows, Pencil, History, ListChecks } from "lucide-react";
import { documentSections, replaceSection } from "../lib/studio";
import type { Message, ReviewStatus, WorkspaceAction } from "../lib/workspace";
import { reviewComplete } from "../lib/workflow";
import { HistoryPanel, ReviewPanel } from "./document-workflow";
import { diagnosisContent, diagnosisFieldLabels, diagnosisSectionTitles, doctorSummaryTitle, hasAadiSource, icd10SectionTitle, legacyDiagnosisSectionTitles, referralSectionTitle, sourceForDisplay, theOracleSourceLinks } from "../lib/aadi/presentation";
import { DiagnosisDocument } from "./diagnosis-document";
import { freshAnswer, markRevealed } from "../lib/fresh-answer";
import { autoNormalLabels, templateNote } from "../lib/normal-exam";

const diagnosisLabels = new Set(["Keluhan utama", "Kondisi yang tercatat", "Alergi tercatat", "Obat yang sedang digunakan (input kasus)", "Anamnesis tercatat", "Tanda vital tercatat", "Pemeriksaan fisik tercatat", "Informasi yang belum tersedia", "Pertanyaan lanjutan dari layanan", "Alternatif", "Jangan terlewat", "Kemungkinan utama — belum ditinjau klinisi", "Pertimbangan layanan", "Bidang belum terisi", "Hasil pemeriksaan tercatat", "Usulan pemeriksaan dari layanan", "Kemampuan fasilitas tercatat", "Jejak analisis"]);


// Inline marks: **bold** (one still open at the end of a line, as while an answer types, runs to the line's end), *italic*,
// and links, only to http(s) pages since the document holds model text.
const inlineMarks = /\*\*(.+?)(?:\*\*|$)|\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|(?<![\w*])\*(?!\s)([^*\n]+?)\*(?![\w*])/g;
function inline(text: string): ReactNode {
  const nodes: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(inlineMarks)) {
    const [whole, strong, label, href, em] = match;
    nodes.push(text.slice(last, match.index), strong !== undefined ? <strong key={match.index}>{inline(strong)}</strong> : href ? <a key={match.index} href={href} target="_blank" rel="noopener noreferrer">{label}</a> : <em key={match.index}>{em}</em>);
    last = match.index + whole.length;
  }
  nodes.push(text.slice(last));
  return nodes.filter(node => node !== "");
}
const tableCells = (line: string) => line.trim().replace(/^\||\|$/g, "").split(/(?<!\\)\|/).map(cell => cell.trim().replace(/\\\|/g, "|"));
const tableSeparator = /^\|(?:\s*:?-{3,}:?\s*\|)+$/;

// A markdown table scrolls sideways inside its own frame, never the page.
function DocumentTable({ lines }: { lines: string[] }) {
  const [head, ...rest] = lines.map(line => line.trim());
  const body = (rest[0] && tableSeparator.test(rest[0]) ? rest.slice(1) : rest).map(tableCells);
  const columns = tableCells(head);
  return <div className="draft-table" role="region" aria-label={`Tabel ${columns.join(", ")}`} tabIndex={0}><table>
    <thead><tr>{columns.map((cell, index) => <th scope="col" key={index}>{inline(cell)}</th>)}</tr></thead>
    <tbody>{body.map((row, index) => <tr key={index}>{row.map((cell, column) => <td key={column}>{autoNormal(cell)}</td>)}</tr>)}</tbody>
  </table></div>;
}

// A line the normal template filled ends with the marker; the document shows it without (the stored text keeps it, and
// one line under the document names those lines until review). Typing cuts at a space, so "[otomatis" alone can show.
const autoNormal = (line: string): ReactNode => inline(line.replace(/ \[otomatis(?: normal\])?$/, ""));

export function DocumentContent({ content, onEdit, clinical = false }: { content: string; onEdit: (content: string) => void; clinical?: boolean }) {
  const lines = content.split("\n");
  return <div className="draft-content">{lines.map((line, index) => {
    if (line.startsWith("|")) {
      if (lines[index - 1]?.startsWith("|")) return null;
      const end = lines.findIndex((next, at) => at > index && !next.startsWith("|"));
      return <DocumentTable key={index} lines={lines.slice(index, end < 0 ? lines.length : end)}/>;
    }
    // The exam's A/B/C headings: "####" in the AADI report, "###" in the SOAP note (normal-exam.ts examTables).
    if (line.startsWith("#### ")) return <h4 className="diagnosis-field-label" key={index}>{line.slice(5)}</h4>;
    if (line.startsWith("### ")) return <h4 className={clinical ? "diagnosis-reference-heading" : "diagnosis-field-label"} key={index}>{line.slice(4)}</h4>;
    if (line.startsWith("# ")) return <h2 key={index}>{line.slice(2)}</h2>;
    if (line.startsWith("## ")) return <h3 key={index}>{line.slice(3)}</h3>;
    if (line === "---") return <hr key={index}/>;
    if (/^- \[[ x]\]/.test(line)) return <label className="draft-task" key={index}><input type="checkbox" checked={line.startsWith("- [x]")} onChange={(event) => { const lines = content.split("\n"); lines[index] = lines[index].replace(/^- \[[ x]\]/, event.target.checked ? "- [x]" : "- [ ]"); onEdit(lines.join("\n")); }}/><span>{line.slice(6)}</span></label>;
    if (clinical && (diagnosisLabels.has(line) || diagnosisFieldLabels.has(line) || ["Gejala referensi dari database — bukan temuan pasien", "Definisi dan kriteria diagnosis dari database", "Kriteria rujukan dari database — narasi sumber"].includes(line))) return <h4 className="diagnosis-field-label" key={index}>{line}</h4>;
    if (clinical && line.startsWith("  - ")) return <p className="diagnosis-list-item diagnosis-list-nested" key={index}>{inline(line.slice(4))}</p>;
    if (clinical && /^  (?:Mendukung|Menyangkal):/.test(line)) return <p className="diagnosis-list-detail" key={index}>{line.trim()}</p>;
    // "- " lines read as bullets in every document (the SOAP note's "Belum diisi" list among them).
    return line ? <p className={line.startsWith("- ") ? "diagnosis-list-item" : undefined} key={index}>{autoNormal(line.startsWith("- ") ? line.slice(2) : line)}</p> : null;
  })}</div>;
}

export function DocumentStudio({ message, onEdit, onReview, encounterId, dispatch }: { message: Message; onEdit: (content: string) => void; onReview: (status: ReviewStatus) => void; encounterId: string; dispatch: (action: WorkspaceAction) => void }) {
  const [view, setView] = useState<"document" | "source" | "compare" | "history" | "review">("document");
  const [selected, setSelected] = useState(0);
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState("");
  const document = useRef<HTMLDivElement>(null);
  const content = diagnosisContent(message);
  const sections = documentSections(content);
  const diagnosis = hasAadiSource(message) && [doctorSummaryTitle, referralSectionTitle, icd10SectionTitle, ...diagnosisSectionTitles, ...legacyDiagnosisSectionTitles].includes(sections[0]?.title);
  // A fresh SOAP draft arrives with the analysis answer's typing reveal (Gaffer, 2026-10-21: "use exactly that").
  const [typing] = useState(() => (diagnosis || (message.mode === "clinic" && sections.length > 1)) && freshAnswer(message));
  // Any other fresh answer lets its blocks follow one another in (globals.css, data-reveal).
  const [cascade] = useState(() => !typing && freshAnswer(message));
  useEffect(() => { markRevealed(message.id); }, [message.id]);
  const section = sections[selected];
  // Two-column documents carry their own section list and per-section Edit, so the Bagian bar above them goes (Chief, 2026-10-09).
  const twoColumn = diagnosis || sections.length > 1;
  const editSection = (index: number) => { setSelected(index); setBody(sections[index].body); setEditing(true); };
  const status = message.reviewStatus ?? "draft";
  return <div className="document-studio" data-reveal={cascade || undefined}>
    <div className="studio-toolbar"><div role="group" aria-label="Tampilan dokumen">{[{ id: "document", label: "Dokumen", Icon: FileText }, { id: "source", label: "Sumber", Icon: Columns2 }, { id: "compare", label: "Perubahan", Icon: GitCompareArrows }, { id: "history", label: "Riwayat", Icon: History }, { id: "review", label: "Peninjauan", Icon: ListChecks }].map(({ id, label, Icon }) => <button key={id} className={view === id ? "active" : ""} aria-pressed={view === id} disabled={editing} onClick={() => setView(id as typeof view)}><Icon size={13}/>{label}</button>)}</div><label className="review-control"><span>Status</span><select aria-label="Status dokumen" value={status} disabled={editing} onChange={(event) => onReview(event.target.value as ReviewStatus)}><option value="draft">Draf</option><option value="reviewed" disabled={!reviewComplete(message.reviewItems)}>Ditinjau</option><option value="final" disabled={status === "draft" || !reviewComplete(message.reviewItems)}>Final</option></select></label></div>
    {view === "history" && <HistoryPanel message={message} encounterId={encounterId} dispatch={dispatch}/>}
    {view === "review" && <ReviewPanel message={{ ...message, content }} encounterId={encounterId} dispatch={dispatch} onNavigate={(target) => { if (target === "source") setView("source"); else { setView("document"); const index = sections.findIndex((item) => item.title === target); if (index >= 0) { setSelected(index); requestAnimationFrame(() => document.current?.querySelector(`[data-diagnosis-section="${index}"], [data-empty-section="${index}"]`)?.scrollIntoView({ block: "nearest" })); } } }}/ >}
    {view === "document" && <>
      {sections.length > 0 && !twoColumn && <div className="section-control"><label>Bagian<select aria-label="Bagian dokumen" value={selected < sections.length ? selected : 0} disabled={editing} onChange={(event) => { const index = Number(event.target.value); setSelected(index); document.current?.querySelectorAll("h3")[index]?.scrollIntoView({ block: "nearest", behavior: "auto" }); }}>{sections.map((item, index) => <option key={`${item.start}-${item.title}`} value={index}>{item.title}</option>)}</select></label><button className="text-button" disabled={!section || editing} onClick={() => { setBody(section.body); setEditing(true); }}><Pencil size={12}/> Edit bagian</button></div>}
      {editing && section ? <div className="section-editor" key="edit"><label>{section.title}<textarea aria-label={`Edit bagian ${section.title}`} value={body} maxLength={50000} rows={8} onChange={(event) => setBody(event.target.value)}/></label><div><button className="button primary" onClick={() => { const newline = section.body.includes("\r\n") ? "\r\n" : "\n"; onEdit(replaceSection(content, section, body.endsWith("\n") ? body : body + newline)); setEditing(false); }}>Simpan bagian</button><button className="button" onClick={() => setEditing(false)}>Batal</button></div></div> : <div key="view" ref={document}>{diagnosis ? <DiagnosisDocument typing={typing} content={content} selected={selected} onSelect={setSelected} onEdit={onEdit} onEditSection={editSection} renderContent={(value, edit) => <DocumentContent content={value} onEdit={edit} clinical/>}/> : sections.length > 1 ? <DiagnosisDocument typing={typing} content={content} selected={selected} onSelect={setSelected} onEdit={onEdit} onEditSection={editSection} label="Bagian" navLabel="Bagian dokumen" showMeta={false} autoFilled={status === "draft" && !content.includes(templateNote) ? autoNormalLabels(content) : []} renderContent={(value, edit) => <DocumentContent content={value} onEdit={edit}/>}/> : <DocumentContent content={content} onEdit={onEdit}/>}</div>}
    </>}
    {view === "source" && <div className="studio-columns"><div><h2>Dokumen saat ini</h2><DocumentContent content={content} onEdit={onEdit}/></div><div className="source-pane"><h2>Sumber saat dibuat</h2><p className="panel-caption">{theOracleSourceLinks(message).length ? "Salinan input dan referensi Oracle yang dipilih sebelum analisis. Tidak berubah saat dokumen diedit." : "Salinan input lokal, bukan kutipan pedoman. Tidak berubah saat dokumen diedit."}</p><ul>{theOracleSourceLinks(message).map(source => <li key={source.id}><strong>{source.label}</strong><p className="source-quote">{source.text}</p></li>)}</ul>{hasAadiSource(message) ? <details className="source-technical"><summary>Data teknis untuk audit</summary><pre>{sourceForDisplay(message)}</pre></details> : <pre>{sourceForDisplay(message) ?? "Sumber asli belum tersedia untuk dokumen lama ini."}</pre>}</div></div>}
    {view === "compare" && <>{message.originalContent === undefined ? <p className="panel-empty">Draf awal belum tersedia. Perubahan berikutnya akan menyimpan isi sebelum edit sebagai pembanding.</p> : message.originalContent === message.content ? <p className="panel-empty">Belum ada perubahan dari draf awal.</p> : <div className="studio-columns comparison"><div><h2>Sebelum edit</h2><pre>{diagnosisContent({ ...message, content: message.originalContent })}</pre></div><div><h2>Saat ini</h2><pre>{message.content}</pre></div></div>}</>}
  </div>;
}
