"use client";

import { AudioLines, FileText, Mic, Square, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PixelLoader } from "./pixel-loader";
import { Dialog } from "./dialog";

interface RecognitionResult { isFinal: boolean; 0: { transcript: string } }
interface RecognitionEvent { resultIndex: number; results: { length: number; [index: number]: RecognitionResult } }
interface Recognition { continuous: boolean; interimResults: boolean; lang: string; onstart: (() => void) | null; onresult: ((event: RecognitionEvent) => void) | null; onerror: ((event: { error: string }) => void) | null; onend: (() => void) | null; start(): void; stop(): void; abort(): void }
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };

export function Scribe({ onClose, onGenerate, language }: { onClose: () => void; onGenerate: (transcript: string) => void; language: string }) {
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const recognition = useRef<Recognition | null>(null);
  useEffect(() => () => { recognition.current?.abort(); }, []);
  useEffect(() => { if (!recording) return; const timer = setInterval(() => setSeconds((s) => s + 1), 1000); return () => clearInterval(timer); }, [recording]);

  function toggleRecording() {
    if (recording) { recognition.current?.stop(); setRecording(false); return; }
    const Constructor = (window as SpeechWindow).SpeechRecognition ?? (window as SpeechWindow).webkitSpeechRecognition;
    if (!Constructor) { setError("Dikte tidak didukung browser ini. Tempel atau ketik transkrip di bawah, atau buka aplikasi di Chrome."); return; }
    const instance = new Constructor();
    instance.onstart = () => setStarting(false);
    instance.continuous = true;
    instance.interimResults = false;
    instance.lang = language === "Bahasa Indonesia" ? "id-ID" : "en-US";
    instance.onresult = (event) => { let text = ""; for (let i = event.resultIndex; i < event.results.length; i++) { if (event.results[i].isFinal) text += event.results[i][0].transcript + " "; } setTranscript((previous) => `${previous}${previous ? "\n" : ""}${text.trim()}`); };
    instance.onerror = (event) => { setError(`Dikte berhenti (${event.error}). Lanjutkan dengan mengetik atau menempel transkrip.`); setRecording(false); setStarting(false); };
    instance.onend = () => { setRecording(false); setStarting(false); };
    recognition.current = instance;
    try { setStarting(true); instance.start(); setError(""); setRecording(true); } catch { setStarting(false); setError("Mikrofon tidak dapat dimulai. Periksa izin browser atau tempel transkrip."); }
  }

  return <Dialog title="Kurangi mengetik, fokus pada perawatan." subtitle="Scribe menyusun percakapan Encounter menjadi draf yang dapat diedit." onClose={onClose} wide>
    <div className={`recording-panel ${recording ? "recording" : ""}`}><div className="waveform" aria-hidden="true">{Array.from({ length: 35 }, (_, i) => <span key={i} style={{ height: `${10 + ((i * 17) % 35)}px`, animationDelay: `${i * .06}s` }}/>)}</div><span className="recording-time">{String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</span><button className={`button ${recording ? "danger" : "primary"}`} type="button" disabled={starting} aria-busy={starting} onClick={toggleRecording}>{starting ? <PixelLoader label="Sedang menyiapkan mikrofon…"/> : recording ? <Square size={14}/> : <Mic size={16}/>} {starting ? "Menyiapkan…" : recording ? "Hentikan dikte" : "Mulai dikte"}</button><p>Dikte browser dapat memakai layanan speech penyedianya. Gunakan Encounter fiktif saja.</p></div>
    {error && <p className="form-warning" role="alert">{error}</p>}
    <label className="field"><span><FileText size={14}/> Transkrip Encounter</span><textarea placeholder={"Clinician: Apa keluhan hari ini?\nPatient: …\n\nTempel atau ketik percakapan di sini."} value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={8} maxLength={30000}/></label>
    <div className="privacy-line"><ShieldCheck size={14}/> Aplikasi tidak menyimpan audio. Tinjau setiap draf sebelum digunakan.</div>
    <div className="dialog-footer"><button className="button" onClick={onClose}>Batal</button><button className="button primary" disabled={!transcript.trim() || recording} onClick={() => onGenerate(transcript)}><AudioLines size={16}/> Buat Scribe Note</button></div>
  </Dialog>;
}
