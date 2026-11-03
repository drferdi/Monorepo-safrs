"use client";

import { ClipboardCopy, Copy, Download, History, PanelRightClose, Printer } from "lucide-react";
import { useState, type KeyboardEvent, type ReactNode } from "react";
import { modes } from "../lib/drafts";
import { documentTitle, workspaceDate } from "../lib/studio";
import type { Encounter, Message, ReviewStatus, WorkspaceAction } from "../lib/workspace";
import { reviewComplete } from "../lib/workflow";
import { diagnosisContent, hasAadiSource, type PcareCopy } from "../lib/aadi/presentation";
import { paneDocuments } from "../lib/document-pane";
import { DocumentStudio } from "./document-studio";
import { HistoryPanel, ReviewPanel } from "./document-workflow";

export interface PaneTools { onCopy: (m: Message) => void; onDownload: (m: Message) => void; onPrint: (m: Message) => void; pcare: (m: Message) => PcareCopy[] }

// A tab names the kind of document (an AADI analysis whatever mode sent it); the head carries the document's own title.
const label = (m: Message) => hasAadiSource(m) ? "Analisis kasus" : modes.find((mode) => mode.id === m.mode)?.label ?? "Dokumen";
const title = (m: Message) => documentTitle(diagnosisContent(m)).replace(/^# /, "") || label(m);
const time = (m: Message) => { const date = new Date(m.createdAt); return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(date); };
const closeOnEscape = (close: () => void) => (event: KeyboardEvent) => { if (event.key === "Escape") { event.stopPropagation(); close(); } };

// The encounter's documents beside the chat: Ringkasan encounter, then one tab per document, two at most before "Lainnya".
export function DocumentPane({ encounter, activeId, onActive, overview, tools, onClose, dispatch, onToast }: { encounter: Encounter; activeId: string | "overview"; onActive: (id: string | "overview") => void; overview: ReactNode; tools: PaneTools; onClose: () => void; dispatch: (a: WorkspaceAction) => void; onToast: (t: string, tone?: "error") => void }) {
  const [menu, setMenu] = useState<"more" | "pcare" | null>(null);
  const [panel, setPanel] = useState<"history" | "review" | null>(null);
  const documents = paneDocuments(encounter);
  const active = documents.find((m) => m.id === activeId);
  const index = active ? documents.indexOf(active) : -1;
  // A document chosen from the menu takes the second tab, so the open document always has a tab.
  const shown = active && index >= 2 ? [documents[0], active] : documents.slice(0, 2);
  const more = documents.filter((m) => !shown.includes(m));
  const pcare = active ? tools.pcare(active) : [];
  const status = active?.reviewStatus ?? "draft";
  const ref = active && { encounterId: encounter.id, messageId: active.id };
  function select(id: string | "overview") { setMenu(null); setPanel(null); onActive(id); }
  async function copyText(value: string, done: string) {
    setMenu(null);
    try { await navigator.clipboard.writeText(value); onToast(done); } catch { onToast("Clipboard tidak tersedia. Gunakan Edit untuk memilih dan menyalin teks.", "error"); }
  }
  const tab = (id: string, label: string, at?: string) => <button type="button" role="tab" key={id} id={`pane-tab-${id}`} aria-selected={(active?.id ?? "overview") === id} aria-controls="pane-body" onClick={() => select(id)}><span>{label}</span>{at && <small>{at}</small>}</button>;
  return <section className="document-pane" aria-label="Panel dokumen">
    <div className="pane-tabs">
      <div role="tablist" aria-label="Dokumen encounter">{tab("overview", "Ringkasan encounter")}{shown.map((m) => tab(m.id, label(m), time(m)))}</div>
      {more.length > 0 && <div className="pane-menu" onKeyDown={closeOnEscape(() => setMenu(null))}>
        <button type="button" className="text-button" aria-haspopup="menu" aria-expanded={menu === "more"} onClick={() => setMenu(menu === "more" ? null : "more")}>Lainnya +{more.length}</button>
        {menu === "more" && <div role="menu" aria-label="Dokumen lainnya">{more.map((m) => <button type="button" role="menuitem" key={m.id} onClick={() => select(m.id)}><span>{label(m)}</span> <small>{time(m)}</small></button>)}</div>}
      </div>}
    </div>
    <div className="pane-tools" role="toolbar" aria-label="Alat dokumen">
      {active && <>
        <button type="button" className="icon-button" aria-label="Riwayat versi" title="Riwayat versi" aria-pressed={panel === "history"} onClick={() => setPanel(panel === "history" ? null : "history")}><History size={15}/></button>
        <button type="button" className="icon-button" aria-label="Salin" title="Salin" onClick={() => tools.onCopy(active)}><Copy size={15}/></button>
        {pcare.length > 0 && <div className="pane-menu" onKeyDown={closeOnEscape(() => setMenu(null))}>
          <button type="button" className="text-button" aria-haspopup="menu" aria-expanded={menu === "pcare"} onClick={() => setMenu(menu === "pcare" ? null : "pcare")}><ClipboardCopy size={14}/>Salin ke P-Care</button>
          {menu === "pcare" && <div role="menu" aria-label="Salin ke P-Care">{pcare.map((item) => <button type="button" role="menuitem" key={item.field + item.label} title={item.value} aria-label={item.name ? `Salin ${item.value} — ${item.name} ke ${item.field} P-Care (kandidat, belum terkonfirmasi)` : `Salin ${item.label} ke ${item.field} P-Care`} onClick={() => copyText(item.value, item.done)}>{item.label}</button>)}</div>}
        </div>}
        <button type="button" className="icon-button" aria-label="Cetak" title="Cetak" onClick={() => tools.onPrint(active)}><Printer size={15}/></button>
        <button type="button" className="icon-button" aria-label="Unduh" title="Unduh" onClick={() => tools.onDownload(active)}><Download size={15}/></button>
      </>}
      <button type="button" className="icon-button pane-collapse" aria-label="Tutup panel dokumen" title="Tutup panel dokumen" onClick={onClose}><PanelRightClose size={15}/></button>
    </div>
    <div className="pane-body" role="tabpanel" id="pane-body" aria-labelledby={`pane-tab-${active?.id ?? "overview"}`}>
      {active && ref ? <>
        <header className="document-head">
          <div><h2>{title(active)}</h2><span>{workspaceDate(active.createdAt)}</span></div>
          <label className="review-control"><span>Status</span><select aria-label="Status dokumen" value={status} onChange={(event) => dispatch({ type: "message.review", ...ref, status: event.target.value as ReviewStatus })}><option value="draft">Draf</option><option value="reviewed" disabled={!reviewComplete(active.reviewItems)}>Ditinjau</option><option value="final" disabled={status === "draft" || !reviewComplete(active.reviewItems)}>Final</option></select></label>
          <button type="button" className="text-button" aria-pressed={panel === "review"} onClick={() => setPanel(panel === "review" ? null : "review")}>Peninjauan</button>
        </header>
        {panel === "history" && <HistoryPanel message={active} encounterId={encounter.id} dispatch={dispatch}/>}
        {/* "Lihat bagian" goes to that section's heading in the body below. */}
        {panel === "review" && <ReviewPanel message={{ ...active, content: diagnosisContent(active) }} encounterId={encounter.id} dispatch={dispatch} onNavigate={(target) => { setPanel(null); requestAnimationFrame(() => [...document.querySelectorAll<HTMLElement>(".pane-body h3")].find((heading) => heading.textContent === target)?.scrollIntoView({ block: "start" })); }}/>}
        <DocumentStudio key={active.id} message={active} onEdit={(content) => dispatch({ type: "message.edit", ...ref, content })}/>
      </> : overview}
    </div>
  </section>;
}
