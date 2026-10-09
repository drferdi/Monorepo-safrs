"use client";

import { Copy, Download, Pencil, RotateCcw } from "lucide-react";
import { useState } from "react";
import { modes } from "../lib/drafts";
import type { Message, ReviewStatus, WorkspaceAction } from "../lib/workspace";
import { PixelLoader } from "./pixel-loader";
import { Brand } from "./brand";
import { DocumentStudio } from "./document-studio";
import { diagnosisContent, hasMiraSource } from "../lib/mira/presentation";

export function downloadText(content: string, name: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/markdown;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function MessageCard({ message, onEdit, onToast, onReuse, onReview, encounterId, dispatch }: { message: Message; onEdit: (content: string) => void; onToast: (text: string) => void; onReuse: (content: string) => void; onReview: (status: ReviewStatus) => void; encounterId: string; dispatch: (action: WorkspaceAction) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(message.content);
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);
  const mira = hasMiraSource(message);
  const content = diagnosisContent(message);
  if (message.role === "user") return <div className="user-message"><div>{message.content}</div><button className="icon-button" aria-label="Gunakan kembali prompt" title="Gunakan kembali prompt" onClick={() => onReuse(message.content)}><RotateCcw size={13}/></button></div>;
  return <article className="assistant-message"><header className="message-header"><Brand compact/><strong>{modes.find((m) => m.id === message.mode)?.label}</strong><span className={`draft-badge status-${message.reviewStatus ?? "draft"}`}>{message.reviewStatus === "final" ? "Final" : message.reviewStatus === "reviewed" ? "Ditinjau" : mira ? "Draf analisis" : "Draf lokal"}</span></header>
    {editing ? <textarea className="draft-editor" aria-label="Edit draf Clinical" rows={20} value={text} onChange={(e) => setText(e.target.value)} maxLength={50000}/> : <DocumentStudio encounterId={encounterId} dispatch={dispatch} message={message} onEdit={onEdit} onReview={onReview}/>}
    {message.mode === "question" && !editing && !mira && <div className="evidence-handoff"><strong>Siap untuk peninjauan Evidence</strong><span>Hubungkan AI Clinical dan sumber terverifikasi untuk menjawab ringkasan ini. Draf dapat diedit dan diekspor.</span></div>}
    <footer className="message-actions">{editing ? <><button className="button primary" onClick={() => { onEdit(text); setEditing(false); onToast("Perubahan draf diperbarui."); }} disabled={!text.trim()}>Simpan draf</button><button className="button" onClick={() => setEditing(false)}>Batal</button></> : <><button className="text-button" disabled={copying} aria-busy={copying} onClick={async () => { setCopying(true); try { await navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { onToast("Clipboard tidak tersedia. Gunakan Edit untuk memilih dan menyalin teks."); } finally { setCopying(false); } }}>{copying || copied ? <PixelLoader done={copied} label="Sedang menyalin…" doneLabel="Tersalin"/> : <Copy size={14}/>} {copying ? "Menyalin…" : copied ? "Tersalin" : "Salin"}</button><button className="text-button" onClick={() => { setText(content); setEditing(true); }}><Pencil size={14}/> Edit</button><button className="text-button" onClick={() => downloadText(content, `${message.mode}-draft.md`)}><Download size={14}/> Unduh</button><span>Tinjau sebelum digunakan</span></>}</footer>
  </article>;
}
