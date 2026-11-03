"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { draftModels, modes } from "../lib/drafts";
import { specialtyLabel, modelLabel } from "../lib/ui-labels";
import { environments, specialties, type Settings, type Workspace, type WorkspaceAction } from "../lib/workspace";
import { TemplateLibraryPanel } from "./template-library";

export interface TheOracleIndexInfo { id: string; chunks: number; model: string; hash: string; catalogVersion: string }
type Tab = "preferences" | "modes" | "knowledge";
const tabs: { id: Tab; label: string }[] = [{ id: "preferences", label: "Preferensi" }, { id: "modes", label: "Mode dan templat" }, { id: "knowledge", label: "Pengetahuan" }];

// Pengaturan Agent (spec section 7): the settings dialog as a page, three tabs. Preferences and mode instructions are saved
// with one settings.save each; the template manager dispatches its own actions as it did in the dialog.
export function AgentSettings({ state, dispatch, theoracle }: { state: Workspace; dispatch: (action: WorkspaceAction) => void; theoracle: TheOracleIndexInfo | null }) {
  const [tab, setTab] = useState<Tab>("preferences");
  const [draft, setDraft] = useState(state.settings);
  const [saved, setSaved] = useState("");
  const save = (next: Settings, message: string) => { dispatch({ type: "settings.save", settings: next }); setDraft(next); setSaved(message); };
  const instruction = (mode: typeof modes[number]["id"], text: string) => {
    const modeInstructions = { ...draft.modeInstructions, [mode]: text };
    if (!text.trim()) delete modeInstructions[mode];
    setDraft({ ...draft, ...(Object.keys(modeInstructions).length ? { modeInstructions } : {}) });
    if (!Object.keys(modeInstructions).length) setDraft(({ modeInstructions: _dropped, ...rest }) => { void _dropped; return rest; });
  };
  return <section className="agent-settings" aria-label="Pengaturan Agent">
    <div className="agent-tabs" role="tablist" aria-label="Bagian pengaturan">{tabs.map((item) => <button key={item.id} type="button" role="tab" id={`agent-tab-${item.id}`} aria-selected={tab === item.id} aria-controls={`agent-panel-${item.id}`} onClick={() => { setTab(item.id); setSaved(""); }}>{item.label}</button>)}</div>
    <div role="tabpanel" id={`agent-panel-${tab}`} aria-labelledby={`agent-tab-${tab}`} className="agent-panel">
      {tab === "preferences" && <form onSubmit={(e) => { e.preventDefault(); save(draft, "Preferensi Agent tersimpan."); }}>
        <label className="field"><span>Nama panggilan</span><input aria-label="Nama panggilan" placeholder="Contoh: dr. Rani" value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} maxLength={60}/><small>Dipakai untuk sapaan di beranda.</small></label>
        <label className="field"><span>Specialty</span><select aria-label="Specialty" value={draft.specialty} onChange={(e) => setDraft({ ...draft, specialty: e.target.value })}>{specialties.map((s) => <option key={s} value={s}>{specialtyLabel(s)}</option>)}</select></label>
        <label className="field"><span>Lingkungan</span><select aria-label="Lingkungan" value={draft.environment ?? environments[0]} onChange={(e) => setDraft({ ...draft, environment: e.target.value as Settings["environment"] })}>{environments.map((item) => <option key={item}>{item}</option>)}</select><small>Ditampilkan di beranda encounter.</small></label>
        <label className="field"><span>Bahasa draf</span><select aria-label="Bahasa draf" value={draft.language} onChange={(e) => setDraft({ ...draft, language: e.target.value as Settings["language"] })}><option value="English">Inggris</option><option>Bahasa Indonesia</option></select></label>
        <div className="field"><span>Format keluaran default</span><div className="model-cards">{draftModels.map((model) => <button type="button" className={`model-card ${draft.model === model ? "selected" : ""}`} onClick={() => setDraft({ ...draft, model })} key={model}><strong>{modelLabel(model)}{draft.model === model && <Check size={15}/>}</strong><span>{model === "Standard" ? "Catatan ringkas dengan bagian utama." : "Catatan terperinci dengan checklist peninjauan."}</span></button>)}</div><small>Mode format lokal. Penyedia model AI belum terhubung.</small></div>
        <label className="field"><span>Instruksi global</span><textarea placeholder="Contoh: Gunakan kalimat ringkas. Pertahankan kata-kata Pasien." value={draft.instructions} onChange={(e) => setDraft({ ...draft, instructions: e.target.value })} rows={3} maxLength={2000}/><small>Disimpan bersama draf lokal untuk ditinjau; tidak mengubah prompt AADI.</small></label>
        <div className="workflow-actions"><button className="button primary">Simpan preferensi</button></div>
      </form>}
      {tab === "modes" && <>
        <form className="agent-modes" onSubmit={(e) => { e.preventDefault(); save(draft, "Instruksi mode tersimpan."); }}>
          <p className="panel-caption">Instruksi tambahan per mode, dipakai pada draf lokal saja. Prompt AADI tidak dapat diubah dari sini.</p>
          {modes.map((mode) => <label className="field" key={mode.id}><span>{mode.label}</span><textarea aria-label={`Instruksi mode ${mode.label}`} rows={2} maxLength={1000} value={draft.modeInstructions?.[mode.id] ?? ""} onChange={(e) => instruction(mode.id, e.target.value)}/></label>)}
          <div className="workflow-actions"><button className="button primary">Simpan instruksi mode</button></div>
        </form>
        <h3>Templat dan favorit</h3>
        <TemplateLibraryPanel state={state} dispatch={dispatch}/>
      </>}
      {tab === "knowledge" && <div className="agent-knowledge">
        {theoracle ? <dl>
          <dt>Index terpasang</dt><dd>{theoracle.id}</dd>
          <dt>Jumlah potongan</dt><dd>{theoracle.chunks.toLocaleString("id-ID")}</dd>
          <dt>Model embedding</dt><dd>{theoracle.model}</dd>
          <dt>Hash index</dt><dd className="source-hash">{theoracle.hash}</dd>
          <dt>Versi katalog</dt><dd>{theoracle.catalogVersion}</dd>
        </dl> : <p className="panel-empty">Database belum terpasang</p>}
        <p className="panel-caption">Sumber pengetahuan dipasang oleh operator server; tidak dapat diubah dari halaman ini.</p>
      </div>}
    </div>
    {saved && <p role="status" className="panel-caption">{saved}</p>}
  </section>;
}
