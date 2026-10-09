"use client";

import { Check, FileUp, Search, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { useRef, useState, type Dispatch } from "react";
import { PixelLoader } from "./pixel-loader";
import { specialtyLabel, modelLabel } from "../lib/ui-labels";
import { Dialog } from "./dialog";
import { newId, specialties, type Encounter, type Patient, type PatientList, type Settings, type Workspace, type WorkspaceAction } from "../lib/workspace";

export function PatientForm({ patient, onSave, onDelete, onClose }: { patient?: Patient; onSave: (p: Patient) => void; onDelete: (id: string) => void; onClose: () => void }) {
  const [name, setName] = useState(patient?.name ?? "");
  const [age, setAge] = useState(patient?.age ?? "");
  const [sex, setSex] = useState(patient?.sex ?? "Not specified");
  const [notes, setNotes] = useState(patient?.notes ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  return <Dialog title={patient ? "Detail Patient" : "Buat Patient"} subtitle="Simpan konteks bersama, dari pertanyaan pertama hingga Follow-up." onClose={onClose}><form onSubmit={(e) => { e.preventDefault(); if (name.trim()) onSave({ id: patient?.id ?? newId(), name: name.trim(), age, sex, notes }); }}>
    <div className="notice"><ShieldCheck size={16}/><span>Workspace lokal · Gunakan data Patient fiktif saja.</span></div>
    <label className="field"><span>Nama Patient <span className="required">*</span></span><input autoFocus required placeholder="Contoh: Patient Demo" value={name} onChange={(e) => setName(e.target.value)} maxLength={80}/></label>
    <div className="field-grid"><label className="field"><span>Usia</span><input type="number" min="0" max="130" placeholder="Tahun" value={age} onChange={(e) => setAge(e.target.value)}/></label><label className="field"><span>Sex</span><select aria-label="Sex" value={sex} onChange={(e) => setSex(e.target.value)}><option value="Not specified">Belum diisi</option><option>Female</option><option>Male</option><option value="Other">Lainnya</option></select></label></div>
    <label className="field"><span>Konteks tambahan</span><textarea placeholder="History, Medications, Allergies, atau preferensi yang relevan…" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} maxLength={10000}/><small>Tersedia sebagai konteks saat membuat draf dalam Encounter Patient ini.</small></label>
    {confirmDelete && <div className="form-warning">Hapus Patient ini dan semua Encounter terkait? <button type="button" className="text-danger" onClick={() => { if (patient) onDelete(patient.id); }}>Ya, hapus Patient lokal</button></div>}
    <div className="dialog-footer">{patient && <button type="button" className="button danger-ghost push-left" onClick={() => setConfirmDelete(true)}><Trash2 size={14}/> Hapus</button>}<button type="button" className="button" onClick={onClose}>Batal</button><button className="button primary" disabled={!name.trim()}>{patient ? "Simpan perubahan" : "Buat Patient"}</button></div>
  </form></Dialog>;
}

export function EncounterForm({ encounter, patients, onSave, onDelete, onClose }: { encounter: Encounter; patients: Patient[]; onSave: (updates: Pick<Encounter, "title" | "patientId">) => void; onDelete: () => void; onClose: () => void }) {
  const [title, setTitle] = useState(encounter.title);
  const [patientId, setPatientId] = useState(encounter.patientId ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  return <Dialog title="Detail Encounter" subtitle="Atur Encounter ini agar mudah ditemukan kembali." onClose={onClose}><form onSubmit={(e) => { e.preventDefault(); if (title.trim()) onSave({ title: title.trim(), patientId: patientId || null }); }}>
    <label className="field"><span>Judul Encounter</span><input autoFocus required value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100}/></label>
    <label className="field"><span>Patient terkait</span><select aria-label="Patient terkait" value={patientId} onChange={(e) => setPatientId(e.target.value)}><option value="">Encounter tanpa Patient</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    {confirmDelete && <div className="form-warning">Hapus Encounter ini beserta drafnya? <button type="button" className="text-danger" onClick={onDelete}>Ya, hapus Encounter lokal</button></div>}
    <div className="dialog-footer"><button type="button" className="button danger-ghost push-left" onClick={() => setConfirmDelete(true)}><Trash2 size={14}/> Hapus Encounter</button><button type="button" className="button" onClick={onClose}>Batal</button><button className="button primary" disabled={!title.trim()}>Simpan Encounter</button></div>
  </form></Dialog>;
}

export function ListForm({ list, state, dispatch, onClose }: { list?: PatientList; state: Workspace; dispatch: Dispatch<WorkspaceAction>; onClose: () => void }) {
  const [name, setName] = useState(list?.name ?? "");
  const [ids, setIds] = useState<string[]>(list?.patientIds ?? []);
  return <Dialog title={list ? "Daftar Patient" : "Buat daftar Patient"} subtitle="Atur Rounds, Follow-up, dan perawatan dalam satu daftar." onClose={onClose}><form onSubmit={(e) => { e.preventDefault(); if (name.trim()) { dispatch({ type: "list.save", list: { id: list?.id ?? newId(), name: name.trim(), patientIds: ids } }); onClose(); } }}>
    <label className="field"><span>Nama daftar</span><input autoFocus required placeholder="Contoh: Morning rounds" value={name} onChange={(e) => setName(e.target.value)} maxLength={80}/></label>
    <div className="field"><span>Patient <small>{ids.length} dipilih</small></span><div className="patient-picker">{state.patients.length === 0 ? <p>Buat Patient terlebih dahulu, lalu tambahkan ke daftar ini.</p> : state.patients.map((patient) => <label className="patient-pick" key={patient.id}><input type="checkbox" checked={ids.includes(patient.id)} onChange={(e) => setIds(e.target.checked ? [...ids, patient.id] : ids.filter((id) => id !== patient.id))}/><UserRound size={16}/><span>{patient.name}</span><small>{patient.age ? `${patient.age} tahun` : "Usia belum diisi"}</small></label>)}</div></div>
    <div className="dialog-footer">{list && <button type="button" className="button danger-ghost push-left" onClick={() => { dispatch({ type: "list.delete", id: list.id }); onClose(); }}><Trash2 size={14}/> Hapus daftar</button>}<button type="button" className="button" onClick={onClose}>Batal</button><button className="button primary" disabled={!name.trim()}>{list ? "Simpan daftar" : "Buat daftar"}</button></div>
  </form></Dialog>;
}

export function SettingsForm({ settings, onSave, onClose }: { settings: Settings; onSave: (s: Settings) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(settings);
  return <Dialog title="Sesuaikan workspace" subtitle="Atur Specialty, detail, dan gaya penulisan draf Clinical." onClose={onClose}><form onSubmit={(e) => { e.preventDefault(); onSave(draft); }}>
    <label className="field"><span>Specialty</span><select aria-label="Specialty" value={draft.specialty} onChange={(e) => setDraft({ ...draft, specialty: e.target.value })}>{specialties.map((s) => <option key={s} value={s}>{specialtyLabel(s)}</option>)}</select></label>
    <div className="field"><span>Mode draf</span><div className="model-cards">{(["Standard", "Extended"] as const).map((model) => <button type="button" className={`model-card ${draft.model === model ? "selected" : ""}`} onClick={() => setDraft({ ...draft, model })} key={model}><strong>{modelLabel(model)}{draft.model === model && <Check size={15}/>}</strong><span>{model === "Standard" ? "Catatan ringkas dengan bagian utama." : "Catatan terperinci dengan checklist peninjauan."}</span></button>)}</div><small>Mode format lokal. Penyedia model AI belum terhubung.</small></div>
    <label className="field"><span>Bahasa draf</span><select aria-label="Bahasa draf" value={draft.language} onChange={(e) => setDraft({ ...draft, language: e.target.value as Settings["language"] })}><option value="English">Inggris</option><option>Bahasa Indonesia</option></select></label>
    <label className="field"><span>Preferensi penulisan</span><textarea placeholder="Contoh: Gunakan kalimat ringkas. Pertahankan kata-kata Patient." value={draft.instructions} onChange={(e) => setDraft({ ...draft, instructions: e.target.value })} rows={3} maxLength={2000}/><small>Disimpan bersama draf untuk ditinjau; interpretasi AI memerlukan integrasi backend.</small></label>
    <div className="dialog-footer"><button type="button" className="button" onClick={onClose}>Batal</button><button className="button primary">Simpan preferensi</button></div>
  </form></Dialog>;
}

export function ContextForm({ context, onSave, onClose }: { context: string; onSave: (s: string) => void; onClose: () => void }) {
  const [text, setText] = useState(context);
  const [filename, setFilename] = useState("");
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const file = useRef<HTMLInputElement>(null);
  return <Dialog title="Tambahkan konteks yang relevan" subtitle="Tambahkan detail yang ingin disertakan dalam draf Encounter ini." onClose={onClose}>
    <input ref={file} type="file" accept=".txt,.md,.csv" className="visually-hidden" aria-label="Unggah berkas konteks" onChange={async (event) => { const selected = event.target.files?.[0]; if (!selected) return; if (!/\.(txt|md|csv)$/i.test(selected.name) || selected.size > 100000) { setError("Pilih berkas TXT, Markdown, atau CSV di bawah 100 KB."); return; } setReading(true); try { const content = await selected.text(); if (text.length + content.length > 30000) { setError("Konteks dibatasi hingga 30.000 karakter."); return; } setText((previous) => `${previous}${previous ? "\n\n" : ""}${content}`); setFilename(selected.name); setError(""); } catch { setError("Berkas tidak dapat dibaca. Tempel teks sebagai alternatif."); } finally { setReading(false); } }}/>
    <button className="upload-zone" disabled={reading} aria-busy={reading} onClick={() => file.current?.click()}>{reading ? <PixelLoader label="Sedang membaca berkas…"/> : <FileUp size={22}/>}<strong>{filename || "Pilih berkas konteks"}</strong><span>TXT, Markdown, atau CSV · hingga 100 KB · dibaca secara lokal</span></button>
    <label className="field"><span>Konteks Encounter</span><textarea placeholder="History, Examination findings, hasil Lab, atau catatan tambahan…" disabled={reading} value={text} onChange={(e) => setText(e.target.value)} rows={8} maxLength={30000}/><small>{text.length.toLocaleString("id-ID")} / 30.000 karakter</small></label>
    {error && <p className="form-warning" role="alert">{error}</p>}
    <div className="dialog-footer"><button className="button push-left" disabled={reading} onClick={() => { setText(""); setFilename(""); }}>Kosongkan</button><button className="button" onClick={onClose}>Batal</button><button className="button primary" disabled={reading} onClick={() => onSave(text)}>Simpan konteks</button></div>
  </Dialog>;
}

export function SearchDialog({ state, onSelect, onPatient, onClose }: { state: Workspace; onSelect: (id: string) => void; onPatient: (id: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const term = query.toLowerCase().trim();
  const patients = state.patients.filter((p) => `${p.name} ${p.notes}`.toLowerCase().includes(term));
  const encounters = state.encounters.filter((e) => `${e.title} ${e.context} ${e.messages.map((m) => m.content).join(" ")}`.toLowerCase().includes(term));
  return <Dialog title="Cari dalam workspace" subtitle="Cari Patient, Encounter, konteks, dan isi draf." onClose={onClose}><div className="search-input"><Search size={18}/><input aria-label="Cari dalam workspace" autoFocus placeholder="Cari dalam workspace…" value={query} onChange={(e) => setQuery(e.target.value)}/><kbd>esc</kbd></div><div className="search-results"><div className="section-label">Patient</div>{patients.map((p) => <button key={p.id} onClick={() => onPatient(p.id)}><UserRound size={16}/><span>{p.name}</span><span className="result-type">Patient</span></button>)}<div className="section-label">Encounter</div>{encounters.map((e) => <button key={e.id} onClick={() => onSelect(e.id)}><FileUp size={16}/><span>{e.title}</span><span className="result-type">{e.messages.length ? `${e.messages.length} pesan` : "Encounter"}</span></button>)}{!patients.length && !encounters.length && <div className="search-empty"><Search size={25}/><strong>Tidak ada hasil untuk “{query}”</strong><p>Coba nama Patient lain atau frasa dari draf.</p></div>}</div></Dialog>;
}
