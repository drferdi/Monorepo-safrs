"use client";

import { Copy, Download, Printer, RotateCcw } from "lucide-react";
import { useState } from "react";
import { modes } from "../lib/drafts";
import type { Message } from "../lib/workspace";
import { DocumentContent } from "./document-studio";
import { freshAnswer } from "../lib/fresh-answer";
import { diagnosisContent, hasAadiSource, aadiFocus, pipelineTrace } from "../lib/aadi/presentation";
import { documentTitle, downloadName, workspaceDate } from "../lib/studio";
import { paneDocument } from "../lib/document-pane";
import { reviewedText } from "../lib/normal-exam";

export function downloadText(content: string, name: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/markdown;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const focusLabel = { workup: "Pemeriksaan Penunjang", icd10: "ICD-10", refer: "Rujukan" } as const;

export function MessageCard({ message, onEdit, onToast, onReuse, onOpenDocument }: { message: Message; onEdit: (content: string) => void; onToast: (text: string, tone?: "error") => void; onReuse: (content: string) => void; onOpenDocument: (id: string) => void }) {
  // A fresh answer rises softly into focus (globals.css, data-reveal); a reopened one appears at once.
  const [fresh] = useState(() => message.role === "assistant" && freshAnswer(message));
  if (message.role === "user") return <div className="user-message"><div>{message.content}</div><button className="icon-button" aria-label="Gunakan kembali prompt" title="Gunakan kembali prompt" onClick={() => onReuse(message.content)}><RotateCcw size={13}/></button></div>;
  const aadi = hasAadiSource(message);
  const trace = aadi ? pipelineTrace(message) : [];
  const content = diagnosisContent(message);
  // What copy and download carry: the stored text, with the auto-normal marker hidden once reviewed (D10).
  const output = reviewedText(content, message.reviewStatus);
  // Every AADI answer is a case analysis (Gaffer, 2026-10-20, "Tetap lima mode").
  const modeName = modes.find((m) => m.id === message.mode)?.label;
  // An analysis opened in a focus mode names it (spec section 3); the document card stays titled Analisis kasus.
  const focus = aadi && message.mode ? aadiFocus(message.mode) : undefined;
  async function copy() {
    try { await navigator.clipboard.writeText(output); onToast("Jawaban disalin."); } catch { onToast("Clipboard tidak tersedia. Pilih teks jawaban lalu salin secara manual.", "error"); }
  }
  return <article className="assistant-message" data-reveal={fresh || undefined}>
    {/* A document lives in the pane; the chat keeps one line and a card that opens it. */}
    {paneDocument(message) ? <>
      <p className="document-line">{aadi ? `Analisis kasus disusun${focus ? ` · fokus: ${focusLabel[focus]}` : ""}.` : `Draf ${modeName} disusun.`}</p>
      <button type="button" className="document-card" onClick={() => onOpenDocument(message.id)}><span><strong>{aadi ? "Analisis kasus" : documentTitle(content).replace(/^# /, "") || modeName}</strong><small>{workspaceDate(message.createdAt)}</small></span></button>
      {trace.length > 0 && <details className="pipeline-trace"><summary>Jejak analisis</summary><ol>{trace.map((step, index) => <li key={index}>{step.stage} · {step.ms} ms{step.ok ? "" : " · gagal"}</li>)}</ol></details>}
    </> : <>
      <DocumentContent content={content} onEdit={onEdit}/>
      {message.mode === "question" && <div className="evidence-handoff"><strong>Siap untuk peninjauan Evidence</strong><span>Hubungkan AI Clinical dan sumber terverifikasi untuk menjawab ringkasan ini. Draf dapat diedit dan diekspor.</span></div>}
      <footer className="message-actions">
        <button type="button" className="icon-button" aria-label="Salin" title="Salin" onClick={copy}><Copy size={15}/></button>
        <button type="button" className="icon-button" aria-label="Cetak" title="Cetak" onClick={() => window.print()}><Printer size={15}/></button>
        <button type="button" className="icon-button" aria-label="Unduh" title="Unduh" onClick={() => downloadText(output, downloadName(modeName ?? "jawaban", message.createdAt))}><Download size={15}/></button>
      </footer>
    </>}
  </article>;
}
