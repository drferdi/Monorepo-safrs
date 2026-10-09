"use client";

import { useEffect, useRef, useState } from "react";

interface RecognitionResult { isFinal: boolean; 0: { transcript: string } }
interface RecognitionEvent { resultIndex: number; results: { length: number; [index: number]: RecognitionResult } }
interface Recognition { continuous: boolean; interimResults: boolean; lang: string; onstart: (() => void) | null; onresult: ((event: RecognitionEvent) => void) | null; onerror: ((event: { error: string }) => void) | null; onend: (() => void) | null; start(): void; stop(): void; abort(): void }
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };

/** Browser dictation shared by Voice mode and the composer's microphone; each final phrase goes to `onText`. */
export function useDictation(language: string, onText: (text: string) => void) {
  const [recording, setRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const recognition = useRef<Recognition | null>(null);
  const deliver = useRef(onText);
  useEffect(() => { deliver.current = onText; });
  useEffect(() => () => { recognition.current?.abort(); }, []);

  function toggle() {
    if (recording) { recognition.current?.stop(); setRecording(false); return; }
    const Constructor = (window as SpeechWindow).SpeechRecognition ?? (window as SpeechWindow).webkitSpeechRecognition;
    if (!Constructor) { setError("Dikte tidak didukung browser ini. Ketik atau tempel teks, atau buka aplikasi di Chrome."); return; }
    const instance = new Constructor();
    instance.onstart = () => setStarting(false);
    instance.continuous = true;
    instance.interimResults = false;
    instance.lang = language === "Bahasa Indonesia" ? "id-ID" : "en-US";
    instance.onresult = (event) => { let text = ""; for (let i = event.resultIndex; i < event.results.length; i++) { if (event.results[i].isFinal) text += event.results[i][0].transcript + " "; } if (text.trim()) deliver.current(text.trim()); };
    instance.onerror = (event) => { setError(`Dikte berhenti (${event.error}). Lanjutkan dengan mengetik atau menempel teks.`); setRecording(false); setStarting(false); };
    instance.onend = () => { setRecording(false); setStarting(false); };
    recognition.current = instance;
    try { setStarting(true); instance.start(); setError(""); setRecording(true); } catch { setStarting(false); setError("Mikrofon tidak dapat dimulai. Periksa izin browser atau tempel teks."); }
  }

  return { recording, starting, error, toggle };
}
