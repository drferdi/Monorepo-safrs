"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { modes } from "../lib/drafts";
import { newId, type Workspace, type WorkspaceAction } from "../lib/workspace";
import { defaultReviewItems, freshReview, validTemplate, type PersonalTemplate } from "../lib/workflow";
import { Dialog } from "./dialog";

export function TemplateLibrary({ state, dispatch, onChoose, onClose }: { state: Workspace; dispatch: (action: WorkspaceAction) => void; onChoose: (key: string) => void; onClose: () => void }) {
  const [tab, setTab] = useState("personal");
  const [selected, setSelected] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const templates = state.templates ?? [];
  const template = templates.find((item) => item.id === selected);
  const star = (key: string, name: string) => <button className="icon-button" aria-label={`Favorit ${name}`} aria-pressed={state.favorites?.includes(key) ?? false} onClick={() => dispatch({ type: "favorite.toggle", key })}><Star size={16} fill={state.favorites?.includes(key) ? "currentColor" : "none"}/></button>;
  return <Dialog title="Templat dan favorit" subtitle="Struktur pribadi untuk draf lokal. Pilihan templat menjaga isi kolom input." wide onClose={onClose}>
    <div className="workflow-tabs" role="group" aria-label="Pengelola templat">{[["personal", "Pribadi"], ["builtin", "Bawaan"], ["review", "Checklist default"]].map(([id, label]) => <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}</div>
    {tab === "builtin" && <div className="template-list">{modes.map((item) => <div className="template-row" key={item.id}>{star(`mode:${item.id}`, item.label)}<button className="text-button" onClick={() => onChoose(`mode:${item.id}`)}>{item.label}</button></div>)}</div>}
    {tab === "personal" && <div className="template-columns"><div className="template-list"><button className="button" onClick={() => { setSelected(null); setDeleting(false); }}>Templat baru</button><p className="panel-caption">{templates.length} / 50 templat</p>{templates.map((item) => <div className="template-row" key={item.id}>{star(`template:${item.id}`, item.name)}<button className="text-button" aria-pressed={selected === item.id} onClick={() => { setSelected(item.id); setDeleting(false); }}>{item.name}</button><button className="text-button" onClick={() => onChoose(`template:${item.id}`)}>Gunakan</button></div>)}</div><div><TemplateEditor key={selected ?? "new"} template={template} full={templates.length >= 50 && !template} onSave={(next) => { dispatch({ type: "template.save", template: next }); setSelected(next.id); }}/>{template && <div className="workflow-actions"><button className="button" disabled={templates.length >= 50} onClick={() => { const next = { ...template, id: newId(), name: `${template.name.slice(0, 70)} salinan` }; dispatch({ type: "template.save", template: next }); setSelected(next.id); }}>Gandakan</button><button className="button danger-ghost" onClick={() => setDeleting(true)}>Hapus templat</button></div>}{deleting && template && <div className="form-warning"><p>Hapus {template.name}? Dokumen yang sudah dibuat tetap tersimpan.</p><button className="button danger" onClick={() => { dispatch({ type: "template.delete", id: template.id }); setSelected(null); setDeleting(false); }}>Konfirmasi hapus templat</button><button className="button" onClick={() => setDeleting(false)}>Batal</button></div>}</div></div>}
    {tab === "review" && <ReviewDefaults items={state.reviewDefaults ?? defaultReviewItems} onSave={(items) => dispatch({ type: "review.defaults", items })}/>}
  </Dialog>;
}

function TemplateEditor({ template, full, onSave }: { template?: PersonalTemplate; full: boolean; onSave: (template: PersonalTemplate) => void }) {
  const [name, setName] = useState(template?.name ?? "");
  const [mode, setMode] = useState(template?.mode ?? "clinic");
  const [sections, setSections] = useState(template?.sections.join("\n") ?? "History\nExamination\nAssessment\nPlan");
  const [instructions, setInstructions] = useState(template?.instructions ?? "");
  const [error, setError] = useState("");
  return <form className="workflow-form" onSubmit={(event) => { event.preventDefault(); const next: PersonalTemplate = { id: template?.id ?? newId(), name: name.trim(), mode, sections: sections.split(/\r?\n/).map((item) => item.trim()).filter(Boolean), instructions }; if (!validTemplate(next) || full) { setError("Isi nama dan 1–20 judul bagian yang berbeda, maksimal 80 karakter per judul. Batas 50 templat."); return; } setError(""); onSave(next); }}>
    <label>Nama templat<input aria-label="Nama templat" value={name} maxLength={80} required onChange={(event) => setName(event.target.value)}/></label>
    <label>Mode dasar<select aria-label="Mode dasar templat" value={mode} onChange={(event) => setMode(event.target.value as PersonalTemplate["mode"])}>{modes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    <label>Judul bagian, satu per baris<textarea aria-label="Judul bagian templat" value={sections} rows={5} maxLength={1700} onChange={(event) => setSections(event.target.value)}/></label>
    <label>Preferensi penulisan<textarea aria-label="Preferensi penulisan templat" value={instructions} rows={3} maxLength={2000} onChange={(event) => setInstructions(event.target.value)}/></label>
    <p className="panel-caption">Isi dengan label yang sesuai, misalnya History: … Kerangka lokal menyalin teks berlabel; bagian kosong tetap belum tersedia. Preferensi dicatat tanpa pemrosesan AI.</p>
    {error && <p role="alert" className="form-warning">{error}</p>}<button className="button primary" disabled={full}>Simpan templat</button>
  </form>;
}
function ReviewDefaults({ items, onSave }: { items: ReturnType<typeof freshReview>; onSave: (items: ReturnType<typeof freshReview>) => void }) {
  const [labels, setLabels] = useState(items.map((item) => item.label).join("\n"));
  const [saved, setSaved] = useState(false);
  const list = labels.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  return <form className="workflow-form" onSubmit={(event) => { event.preventDefault(); onSave(list.map((label, index) => ({ id: `review-${index}`, label, target: items[index]?.target ?? "document", required: true, checked: false }))); setSaved(true); }}><label>Item wajib, satu per baris<textarea aria-label="Checklist default" rows={7} maxLength={4800} value={labels} onChange={(event) => { setLabels(event.target.value); setSaved(false); }}/></label><p className="panel-caption">1–30 item, maksimal 160 karakter per item. Berlaku untuk dokumen berikutnya; checklist dokumen lama tetap.</p><button className="button primary" disabled={!list.length || list.length > 30 || list.some((item) => item.length > 160)}>Simpan checklist default</button>{saved && <p role="status">Checklist default diperbarui.</p>}</form>;
}
