"use client";

import { ClipboardList, Copy, Download, FileOutput, Pencil, RotateCcw } from "lucide-react";
import { useState } from "react";
import { modes } from "../lib/drafts";
import type { Message, ReviewStatus, WorkspaceAction } from "../lib/workspace";
import { PixelLoader } from "./pixel-loader";
import { Brand } from "./brand";
import { DocumentStudio } from "./document-studio";
import { freshAnswer } from "../lib/fresh-answer";
import { diagnosisContent, hasAadiSource, aadiFocus, referralPrompt, summaryCopies } from "../lib/aadi/presentation";
import { downloadName } from "../lib/studio";

export function downloadText(content: string, name: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/markdown;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const focusLabel = { workup: "Pemeriksaan Penunjang", icd10: "ICD-10", refer: "Rujukan" } as const;
function caseComplaint(sourceText?: string): string {
  try { const source: unknown = JSON.parse(sourceText ?? "null"); return source && typeof source === "object" && "case" in source && source.case && typeof source.case === "object" && "chiefComplaint" in source.case && typeof source.case.chiefComplaint === "string" ? source.case.chiefComplaint : ""; } catch { return ""; }
}

export function MessageCard({ message, onEdit, onToast, onReuse, onReferral, onReview, encounterId, dispatch }: { message: Message; onEdit: (content: string) => void; onToast: (text: string, tone?: "error") => void; onReuse: (content: string) => void; onReferral?: (text: string) => void; onReview: (status: ReviewStatus) => void; encounterId: string; dispatch: (action: WorkspaceAction) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(message.content);
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);
  // A fresh answer rises softly into focus (globals.css, data-reveal); a reopened one appears at once.
  const [fresh] = useState(() => message.role === "assistant" && freshAnswer(message));
  const aadi = hasAadiSource(message);
  const content = diagnosisContent(message);
  // Every AADI answer is a case analysis (Gaffer, 2026-10-20, "Tetap lima mode"); the mode it came from shows as its focus.
  const modeName = modes.find((m) => m.id === message.mode)?.label;
  const focus = aadi && message.mode ? aadiFocus(message.mode) : undefined;
  const complaint = aadi ? caseComplaint(message.sourceText) : "";
  // The summary, each ICD-10 code and the therapy line copy on their own, for an RME or PCare note (design D1, D2).
  const copies = aadi ? summaryCopies(content) : null;
  const referral = aadi && onReferral ? referralPrompt(message) : "";
  async function copyText(value: string, done: string) {
    try { await navigator.clipboard.writeText(value); onToast(done); } catch { onToast("Clipboard tidak tersedia. Gunakan Edit untuk memilih dan menyalin teks.", "error"); }
  }
  if (message.role === "user") return <div className="user-message"><div>{message.content}</div><button className="icon-button" aria-label="Gunakan kembali prompt" title="Gunakan kembali prompt" onClick={() => onReuse(message.content)}><RotateCcw size={13}/></button></div>;
  return <article className="assistant-message" data-reveal={fresh || undefined}><header className="message-header"><Brand compact/><strong>{aadi ? "Analisis kasus" : modeName}</strong>{focus && <span className="focus-tag">fokus: {focusLabel[focus]}</span>}<span className={`draft-badge status-${message.reviewStatus ?? "draft"}`}>{message.reviewStatus === "final" ? "Final" : message.reviewStatus === "reviewed" ? "Ditinjau" : aadi ? "Draf analisis" : "Draf lokal"}</span></header>
    {editing ? <textarea className="draft-editor" aria-label="Edit draf Clinical" rows={20} value={text} onChange={(e) => setText(e.target.value)} maxLength={50000}/> : <DocumentStudio encounterId={encounterId} dispatch={dispatch} message={message} onEdit={onEdit} onReview={onReview}/>}
    {message.mode === "question" && !editing && !aadi && <div className="evidence-handoff"><strong>Siap untuk peninjauan Evidence</strong><span>Hubungkan AI Clinical dan sumber terverifikasi untuk menjawab ringkasan ini. Draf dapat diedit dan diekspor.</span></div>}
    {copies && !editing && (copies.codes.length > 0 || copies.therapy) && <div className="quick-copy" role="group" aria-label="Salin cepat"><span>Salin:</span>{copies.codes.map((item) => <button type="button" key={item.code} className="action-chip" title={item.text} aria-label={`Salin ${item.text}`} onClick={() => copyText(item.text, `${item.code} disalin.`)}>{item.code}</button>)}{copies.therapy && <button type="button" className="action-chip" title={copies.therapy} aria-label="Salin terapi usulan" onClick={() => copyText(copies.therapy, "Terapi usulan disalin.")}>Terapi</button>}</div>}
    <footer className="message-actions">{editing ? <><button className="button primary" onClick={() => { onEdit(text); setEditing(false); onToast("Perubahan draf diperbarui."); }} disabled={!text.trim()}>Simpan draf</button><button className="button" onClick={() => setEditing(false)}>Batal</button></> : <><button className="text-button" disabled={copying} aria-busy={copying} onClick={async () => { setCopying(true); try { await navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { onToast("Clipboard tidak tersedia. Gunakan Edit untuk memilih dan menyalin teks.", "error"); } finally { setCopying(false); } }}>{copying || copied ? <PixelLoader done={copied} label="Sedang menyalin…" doneLabel="Tersalin"/> : <Copy size={14}/>} {copying ? "Menyalin…" : copied ? "Tersalin" : "Salin"}</button>{copies && <button className="text-button" onClick={() => copyText(copies.summary, "Ringkasan disalin.")}><ClipboardList size={14}/> Salin ringkas</button>}<button className="text-button" onClick={() => { setText(content); setEditing(true); }}><Pencil size={14}/> Edit</button><button className="text-button" onClick={() => downloadText(content, downloadName(aadi ? `analisis ${complaint}` : modeName ?? "draf", message.createdAt))}><Download size={14}/> Unduh</button>{referral && onReferral && <button className="text-button" onClick={() => onReferral(referral)}><FileOutput size={14}/> Surat rujukan</button>}<span>Tinjau sebelum digunakan</span></>}</footer>
  </article>;
}
