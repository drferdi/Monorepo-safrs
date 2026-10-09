"use client";

import { AudioLines, FileText, Mic, Square, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useDictation } from "./use-dictation";
import { PixelLoader } from "./pixel-loader";
import { Dialog } from "./dialog";

export function Scribe({ onClose, onGenerate, language }: { onClose: () => void; onGenerate: (transcript: string) => void; language: string }) {
  const [transcript, setTranscript] = useState("");
  const [seconds, setSeconds] = useState(0);
  const { recording, starting, error, toggle: toggleRecording } = useDictation(language, (text) => setTranscript((previous) => `${previous}${previous ? "\n" : ""}${text}`));
  useEffect(() => { if (!recording) return; const timer = setInterval(() => setSeconds((s) => s + 1), 1000); return () => clearInterval(timer); }, [recording]);

  return <Dialog title="Kurangi mengetik, fokus pada perawatan." subtitle="Scribe menyusun percakapan Encounter menjadi draf yang dapat diedit." onClose={onClose} wide>
    <div className={`recording-panel ${recording ? "recording" : ""}`}><div className="waveform" aria-hidden="true">{Array.from({ length: 35 }, (_, i) => <span key={i} style={{ height: `${10 + ((i * 17) % 35)}px`, animationDelay: `${i * .06}s` }}/>)}</div><span className="recording-time">{String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</span><button className={`button ${recording ? "danger" : "primary"}`} type="button" disabled={starting} aria-busy={starting} onClick={toggleRecording}>{starting ? <PixelLoader label="Sedang menyiapkan mikrofon…"/> : recording ? <Square size={14}/> : <Mic size={16}/>} {starting ? "Menyiapkan…" : recording ? "Hentikan dikte" : "Mulai dikte"}</button><p>Dikte browser dapat memakai layanan speech penyedianya. Gunakan Encounter fiktif saja.</p></div>
    {error && <p className="form-warning" role="alert">{error}</p>}
    <label className="field"><span><FileText size={14}/> Transkrip Encounter</span><textarea placeholder={"Clinician: Apa keluhan hari ini?\nPatient: …\n\nTempel atau ketik percakapan di sini."} value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={8} maxLength={30000}/></label>
    <div className="privacy-line"><ShieldCheck size={14}/> Aplikasi tidak menyimpan audio. Tinjau setiap draf sebelum digunakan.</div>
    <div className="dialog-footer"><button className="button" onClick={onClose}>Batal</button><button className="button primary" disabled={!transcript.trim() || recording} onClick={() => onGenerate(transcript)}><AudioLines size={16}/> Buat Scribe Note</button></div>
  </Dialog>;
}
