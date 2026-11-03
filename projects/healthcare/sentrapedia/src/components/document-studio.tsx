"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Bold, Heading2, Italic, List, Pencil } from "lucide-react";
import { documentSections } from "../lib/studio";
import type { Message } from "../lib/workspace";
import { applyMark } from "../lib/document-pane";
import { diagnosisContent, diagnosisFieldLabels, diagnosisSectionTitles, doctorSummaryTitle, hasAadiSource, icd10SectionTitle, legacyDiagnosisSectionTitles, referralSectionTitle } from "../lib/aadi/presentation";
import { DiagnosisDocument } from "./diagnosis-document";
import { freshAnswer, markRevealed } from "../lib/fresh-answer";

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

// hideTitle: the pane's document head already shows the "# " title line.
export function DocumentContent({ content, onEdit, clinical = false, hideTitle = false }: { content: string; onEdit: (content: string) => void; clinical?: boolean; hideTitle?: boolean }) {
  const lines = content.split("\n");
  const title = hideTitle ? lines.findIndex((line) => line.startsWith("# ")) : -1;
  return <div className="draft-content">{lines.map((line, index) => {
    if (line.startsWith("|")) {
      if (lines[index - 1]?.startsWith("|")) return null;
      const end = lines.findIndex((next, at) => at > index && !next.startsWith("|"));
      return <DocumentTable key={index} lines={lines.slice(index, end < 0 ? lines.length : end)}/>;
    }
    // The exam's A/B/C headings: "####" in the AADI report, "###" in the SOAP note (normal-exam.ts examTables).
    if (line.startsWith("#### ")) return <h4 className="diagnosis-field-label" key={index}>{line.slice(5)}</h4>;
    if (line.startsWith("### ")) return <h4 className={clinical ? "diagnosis-reference-heading" : "diagnosis-field-label"} key={index}>{line.slice(4)}</h4>;
    if (line.startsWith("# ")) return index === title ? null : <h2 key={index}>{line.slice(2)}</h2>;
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

const marks = [{ mark: "heading", label: "Judul", Icon: Heading2 }, { mark: "bold", label: "Tebal", Icon: Bold }, { mark: "italic", label: "Miring", Icon: Italic }, { mark: "list", label: "Daftar", Icon: List }] as const;

// The pane body: the document in one column, editable in place as markdown with a small toolbar.
export function DocumentStudio({ message, onEdit }: { message: Message; onEdit: (content: string) => void }) {
  const [selected, setSelected] = useState(0);
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState("");
  const box = useRef<HTMLTextAreaElement>(null);
  // The selection a toolbar mark leaves, set on the textarea once the new text renders.
  const selection = useRef<{ start: number; end: number } | null>(null);
  const content = diagnosisContent(message);
  const sections = documentSections(content);
  const diagnosis = hasAadiSource(message) && [doctorSummaryTitle, referralSectionTitle, icd10SectionTitle, ...diagnosisSectionTitles, ...legacyDiagnosisSectionTitles].includes(sections[0]?.title);
  // A fresh analysis or SOAP draft keeps its typing reveal, in one column (Gaffer, 2026-10-21: "use exactly that"). An
  // analysis keeps its folded references and dose check; any other document is plain markdown.
  const [typing] = useState(() => (diagnosis || (message.mode === "clinic" && sections.length > 1)) && freshAnswer(message));
  // Any other fresh answer lets its blocks follow one another in (globals.css, data-reveal).
  const [cascade] = useState(() => !typing && freshAnswer(message));
  useEffect(() => { markRevealed(message.id); }, [message.id]);
  useLayoutEffect(() => { if (selection.current) box.current?.setSelectionRange(selection.current.start, selection.current.end); selection.current = null; }, [body]);
  function format(mark: typeof marks[number]["mark"]) {
    const field = box.current;
    if (!field) return;
    const next = applyMark(body, field.selectionStart, field.selectionEnd, mark);
    selection.current = next; setBody(next.text); field.focus();
  }
  return <div className="document-studio" data-reveal={cascade || undefined}>
    {editing ? <div className="document-editor">
      {/* Mouse down keeps the selection in the textarea while a mark is applied. */}
      <div className="editor-toolbar" role="toolbar" aria-label="Format teks">{marks.map(({ mark, label, Icon }) => <button type="button" key={mark} className="text-button" onMouseDown={(event) => event.preventDefault()} onClick={() => format(mark)}><Icon size={13}/>{label}</button>)}</div>
      <textarea ref={box} aria-label="Isi dokumen" value={body} maxLength={50000} rows={18} onChange={(event) => setBody(event.target.value)}/>
      <div className="editor-actions"><button className="button primary" disabled={!body.trim()} onClick={() => { onEdit(body); setEditing(false); }}>Simpan</button><button className="button" onClick={() => setEditing(false)}>Batal</button></div>
    </div> : <>
      <button type="button" className="text-button document-edit" onClick={() => { setBody(content); setEditing(true); }}><Pencil size={12}/> Edit</button>
      {diagnosis || typing ? <DiagnosisDocument rail={false} typing={typing} content={content} selected={selected} onSelect={setSelected} onEdit={onEdit} showMeta={diagnosis} renderContent={(value, edit) => <DocumentContent content={value} onEdit={edit} clinical={diagnosis} hideTitle/>}/> : <DocumentContent content={content} onEdit={onEdit} clinical={diagnosis} hideTitle/>}
    </>}
  </div>;
}
