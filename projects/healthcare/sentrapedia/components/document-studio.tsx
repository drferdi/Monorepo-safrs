"use client";

import { useEffect, useRef, useState } from "react";
import { Columns2, FileText, GitCompareArrows, Pencil, History, ListChecks } from "lucide-react";
import { documentSections, replaceSection } from "../lib/studio";
import type { Message, ReviewStatus, WorkspaceAction } from "../lib/workspace";
import { reviewComplete } from "../lib/workflow";
import { HistoryPanel, ReviewPanel } from "./document-workflow";
import { diagnosisContent, diagnosisFieldLabels, diagnosisSectionTitles, hasMiraSource, referralSectionTitle } from "../lib/mira/presentation";
import { DiagnosisDocument } from "./diagnosis-document";

const diagnosisLabels = new Set(["Keluhan utama", "Kondisi yang tercatat", "Alergi tercatat", "Obat yang sedang digunakan (input kasus)", "Anamnesis tercatat", "Tanda vital tercatat", "Pemeriksaan fisik tercatat", "Informasi yang belum tersedia", "Pertanyaan lanjutan dari layanan", "Alternatif", "Jangan terlewat", "Kemungkinan utama — belum ditinjau klinisi", "Pertimbangan layanan", "Bidang belum terisi", "Hasil pemeriksaan tercatat", "Usulan pemeriksaan dari layanan", "Kemampuan fasilitas tercatat", "Jejak analisis"]);

// Analysis answers already revealed on this page; an answer types out once, only while it is fresh.
const revealed = new Set<string>();
const freshAnswerMs = 20000;

export function DocumentContent({ content, onEdit, clinical = false }: { content: string; onEdit: (content: string) => void; clinical?: boolean }) {
  return <div className="draft-content">{content.split("\n").map((line, index) => {
    if (clinical && line.startsWith("### ")) return <h4 className="diagnosis-reference-heading" key={index}>{line.slice(4)}</h4>;
    if (line.startsWith("# ")) return <h2 key={index}>{line.slice(2)}</h2>;
    if (line.startsWith("## ")) return <h3 key={index}>{line.slice(3)}</h3>;
    if (line === "---") return <hr key={index}/>;
    if (/^- \[[ x]\]/.test(line)) return <label className="draft-task" key={index}><input type="checkbox" checked={line.startsWith("- [x]")} onChange={(event) => { const lines = content.split("\n"); lines[index] = lines[index].replace(/^- \[[ x]\]/, event.target.checked ? "- [x]" : "- [ ]"); onEdit(lines.join("\n")); }}/><span>{line.slice(6)}</span></label>;
    if (clinical && (diagnosisLabels.has(line) || diagnosisFieldLabels.has(line) || ["Gejala referensi dari database — bukan temuan pasien", "Definisi dan kriteria diagnosis dari database", "Kriteria rujukan dari database — narasi sumber"].includes(line))) return <h4 className="diagnosis-field-label" key={index}>{line}</h4>;
    if (clinical && line.startsWith("  - ")) return <p className="diagnosis-list-item diagnosis-list-nested" key={index}>{line.slice(4)}</p>;
    if (clinical && /^  (?:Mendukung|Menyangkal):/.test(line)) return <p className="diagnosis-list-detail" key={index}>{line.trim()}</p>;
    return line ? <p className={clinical && line.startsWith("- ") ? "diagnosis-list-item" : undefined} key={index}>{clinical && line.startsWith("- ") ? line.slice(2) : line}</p> : null;
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
  const diagnosis = hasMiraSource(message) && ["Ringkasan Kasus", referralSectionTitle, ...diagnosisSectionTitles].includes(sections[0]?.title);
  const [typing] = useState(() => diagnosis && !revealed.has(message.id) && Date.now() - Date.parse(message.createdAt) < freshAnswerMs);
  useEffect(() => { revealed.add(message.id); }, [message.id]);
  const section = sections[selected];
  const status = message.reviewStatus ?? "draft";
  return <div className="document-studio">
    <div className="studio-toolbar"><div role="group" aria-label="Tampilan dokumen">{[{ id: "document", label: "Dokumen", Icon: FileText }, { id: "source", label: "Sumber", Icon: Columns2 }, { id: "compare", label: "Perubahan", Icon: GitCompareArrows }, { id: "history", label: "Riwayat", Icon: History }, { id: "review", label: "Peninjauan", Icon: ListChecks }].map(({ id, label, Icon }) => <button key={id} className={view === id ? "active" : ""} aria-pressed={view === id} disabled={editing} onClick={() => setView(id as typeof view)}><Icon size={13}/>{label}</button>)}</div><label className="review-control"><span>Status</span><select aria-label="Status dokumen" value={status} disabled={editing} onChange={(event) => onReview(event.target.value as ReviewStatus)}><option value="draft">Draf</option><option value="reviewed" disabled={!reviewComplete(message.reviewItems)}>Ditinjau</option><option value="final" disabled={status === "draft" || !reviewComplete(message.reviewItems)}>Final</option></select></label></div>
    <p className="studio-status-note">Status ditetapkan pengguna di perangkat ini; bukan validasi klinis. Edit isi mengembalikan status ke Draf.</p>
    {view === "history" && <HistoryPanel message={message} encounterId={encounterId} dispatch={dispatch}/>}
    {view === "review" && <ReviewPanel message={{ ...message, content }} encounterId={encounterId} dispatch={dispatch} onNavigate={(target) => { if (target === "source") setView("source"); else { setView("document"); const index = sections.findIndex((item) => item.title === target); if (index >= 0) { setSelected(index); requestAnimationFrame(() => document.current?.querySelectorAll("h3")[index]?.scrollIntoView({ block: "nearest" })); } } }}/ >}
    {view === "document" && <>
      {sections.length > 0 && <div className="section-control"><label>Bagian<select aria-label="Bagian dokumen" value={selected < sections.length ? selected : 0} disabled={editing} onChange={(event) => { const index = Number(event.target.value); setSelected(index); document.current?.querySelectorAll("h3")[index]?.scrollIntoView({ block: "nearest", behavior: "auto" }); }}>{sections.map((item, index) => <option key={`${item.start}-${item.title}`} value={index}>{item.title}</option>)}</select></label><button className="text-button" disabled={!section || editing} onClick={() => { setBody(section.body); setEditing(true); }}><Pencil size={12}/> Edit bagian</button></div>}
      {editing && section ? <div className="section-editor"><label>{section.title}<textarea aria-label={`Edit bagian ${section.title}`} value={body} maxLength={50000} rows={8} onChange={(event) => setBody(event.target.value)}/></label><div><button className="button primary" onClick={() => { const newline = section.body.includes("\r\n") ? "\r\n" : "\n"; onEdit(replaceSection(content, section, body.endsWith("\n") ? body : body + newline)); setEditing(false); }}>Simpan bagian</button><button className="button" onClick={() => setEditing(false)}>Batal</button></div></div> : <div ref={document}>{diagnosis ? <DiagnosisDocument typing={typing} content={content} selected={selected} onSelect={setSelected} onEdit={onEdit} renderContent={(value, edit) => <DocumentContent content={value} onEdit={edit} clinical/>}/> : <DocumentContent content={content} onEdit={onEdit}/>}</div>}
    </>}
    {view === "source" && <div className="studio-columns"><div><h3>Dokumen saat ini</h3><DocumentContent content={content} onEdit={onEdit}/></div><div className="source-pane"><h3>Sumber saat dibuat</h3><p className="panel-caption">Salinan input lokal, bukan kutipan pedoman. Tidak berubah saat dokumen diedit.</p><pre>{message.sourceText ?? "Sumber asli belum tersedia untuk dokumen lama ini."}</pre></div></div>}
    {view === "compare" && <>{message.originalContent === undefined ? <p className="panel-empty">Draf awal belum tersedia. Perubahan berikutnya akan menyimpan isi sebelum edit sebagai pembanding.</p> : message.originalContent === message.content ? <p className="panel-empty">Belum ada perubahan dari draf awal.</p> : <div className="studio-columns comparison"><div><h3>Sebelum edit</h3><pre>{message.originalContent}</pre></div><div><h3>Saat ini</h3><pre>{message.content}</pre></div></div>}</>}
  </div>;
}
