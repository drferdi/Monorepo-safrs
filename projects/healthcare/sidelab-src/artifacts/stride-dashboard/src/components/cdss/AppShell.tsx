import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, RefreshCw, FileText } from "lucide-react";
import { z } from "zod";
import { useCdssListBackends } from "@workspace/api-client-react";
import type { PatientData, ConsultResult, ConversationMessage } from "@workspace/api-client-react";
import { ThinIcon } from "@/components/ui/ThinIcon";
import { PatientSidebar } from "./PatientSidebar";
import { ClinicalOutput } from "./ClinicalOutput";
import { RedFlagAlert } from "./RedFlagAlert";
import { RiwayatKasus } from "./RiwayatKasus";
import { loadRiwayat, saveToRiwayat, deleteFromRiwayat, saveSessionToServer, type SavedCase } from "@/lib/riwayat-store";
import { Formularium } from "./Formularium";
import { Notifikasi } from "./Notifikasi";
import { Dashboard } from "./Dashboard";

const DEFAULT_MODELS = [
  "openai/gpt-oss-20b:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
];

const sseDoneSchema = z.object({
  done: z.literal(true),
  raw: z.string(),
  sections: z.record(z.unknown()),
  red_flags: z.array(z.string()),
  history: z.array(z.object({
    role: z.string(),
    content: z.string(),
  })),
  certainty: z.string().optional(),
});

function apiUrl(path: string) {
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  return `${base}/api/cdss${path}`;
}

// ── Typewriter display hook ────────────────────────────────────────────────
function useTypewriter() {
  const bufferRef    = useRef("");          // raw received text
  const posRef       = useRef(0);           // how many chars displayed
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneRef      = useRef(false);       // stream finished?
  const [display, setDisplay] = useState("");

  const reset = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    bufferRef.current = "";
    posRef.current = 0;
    doneRef.current = false;
    setDisplay("");
  }, []);

  const pushToken = useCallback((token: string) => {
    bufferRef.current += token;
    if (timerRef.current) return; // already ticking
    timerRef.current = setInterval(() => {
      const buf = bufferRef.current;
      const pos = posRef.current;
      if (pos >= buf.length) return;
      // Speed: 4 chars/tick while streaming, catch up fast after done
      const step = doneRef.current ? 12 : 4;
      const next = Math.min(pos + step, buf.length);
      posRef.current = next;
      setDisplay(buf.slice(0, next));
    }, 18);
  }, []);

  const markDone = useCallback(() => { doneRef.current = true; }, []);

  const isCaughtUp = useCallback(() =>
    posRef.current >= bufferRef.current.length, []);

  const stop = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  return { display, pushToken, markDone, isCaughtUp, reset, stop };
}

export function CdssAppShell() {
  const [patient, setPatient]           = useState<PatientData>({ nama:"",umur:"",jk:"",bb:"",tb:"",alergi:"",komorbid:"",obat:"" });
  const [complaint, setComplaint]       = useState("");
  const [history, setHistory]           = useState<ConversationMessage[]>([]);
  const [result, setResult]             = useState<ConsultResult | null>(null);
  const [backend, setBackend]           = useState("openai");
  const [model, setModel]               = useState("gpt-4o-mini");
  const [activeView, setActiveView]     = useState("dashboard");
  const [flagsDismissed, setFlagsDismissed] = useState(false);
  const [savedCases, setSavedCases]     = useState<SavedCase[]>(() => loadRiwayat());

  const [isStreaming, setIsStreaming]   = useState(false);
  const [streamError, setStreamError]  = useState<string | null>(null);
  const [showResult, setShowResult]    = useState(false);

  const pendingResultRef = useRef<ConsultResult | null>(null);
  const streamRef        = useRef<AbortController | null>(null);
  const streamEndRef     = useRef<HTMLDivElement>(null);
  const textareaRef      = useRef<HTMLTextAreaElement>(null);

  const tw = useTypewriter();

  const { data: backendsData } = useCdssListBackends();
  const availableModels = (() => {
    const b = backendsData?.backends?.find(b => b.id === backend);
    return b?.models?.length ? b.models : DEFAULT_MODELS;
  })();

  // Once typewriter catches up after done → show structured result
  useEffect(() => {
    if (!isStreaming && pendingResultRef.current && tw.isCaughtUp()) {
      const r = pendingResultRef.current;
      pendingResultRef.current = null;
      tw.stop();
      setResult(r);
      setShowResult(true);
      setTimeout(() => textareaRef.current?.focus(), 80);
    }
  });

  // Auto-scroll typewriter — rAF throttled
  const scrollRafRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isStreaming || !streamEndRef.current) return;
    if (scrollRafRef.current !== null) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      streamEndRef.current?.scrollIntoView({ behavior: "instant", block: "nearest" });
      scrollRafRef.current = null;
    });
  }, [tw.display, isStreaming]);

  const handleSubmit = useCallback(async () => {
    if (!complaint.trim() || isStreaming) return;

    streamRef.current?.abort();
    const ctrl = new AbortController();
    streamRef.current = ctrl;

    setIsStreaming(true);
    setShowResult(false);
    setStreamError(null);
    pendingResultRef.current = null;
    tw.reset();

    const payload = { complaint: complaint.trim(), patient, history, backend, model };

    try {
      const resp = await fetch(apiUrl("/consult/stream"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });

      if (!resp.ok || !resp.body) {
        const text = await resp.text();
        throw new Error(text || `HTTP ${resp.status}`);
      }

      const reader  = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const raw = line.slice(5).trim();
          if (!raw) continue;
          let msg: Record<string, unknown>;
          try { msg = JSON.parse(raw); } catch { continue; }

          if (msg.error) throw new Error(String(msg.error));

          if (msg.t) {
            tw.pushToken(msg.t as string);
          }

          if (msg.done) {
            const parsed = sseDoneSchema.safeParse(msg);
            if (!parsed.success) {
              throw new Error("Respons engine tidak valid (format SSE)");
            }
            const final = parsed.data as unknown as ConsultResult;
            tw.markDone();
            pendingResultRef.current = final;
            setHistory(final.history ?? []);
            setFlagsDismissed(false);
            // Auto-save to riwayat
            const saved: SavedCase = {
              id: Date.now().toString(),
              tanggal: new Date().toISOString(),
              complaint: complaint.trim(),
              patient,
              result: final,
            };
            saveToRiwayat(saved);
            void saveSessionToServer(complaint.trim(), patient, final.history ?? []);
            setSavedCases(loadRiwayat());
            setComplaint("");
            setIsStreaming(false);
            return;
          }
        }
      }
    } catch (err: unknown) {
      if ((err as { name?: string }).name === "AbortError") return;
      setStreamError((err as { message?: string }).message ?? "Terjadi kesalahan.");
      setIsStreaming(false);
      tw.stop();
    }
  }, [complaint, patient, history, backend, model, isStreaming, tw]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSubmit(); }
  };

  const handleNewCase = () => {
    streamRef.current?.abort();
    tw.reset(); tw.stop();
    setResult(null); setShowResult(false);
    setHistory([]); setComplaint("");
    setFlagsDismissed(false); setIsStreaming(false); setStreamError(null);
    pendingResultRef.current = null;
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleLoadCase = (c: SavedCase) => {
    handleNewCase();
    setPatient(c.patient);
    setResult(c.result);
    setShowResult(true);
    setHistory([]);
    setActiveView("consult");
  };

  const handleDeleteCase = (id: string) => {
    deleteFromRiwayat(id);
    setSavedCases(loadRiwayat());
  };

  const [saveState, setSaveState] = useState<string | null>(null);

  const handleSaveToFile = async () => {
    if (!window.electronCDSS || !result) return;
    const res = await window.electronCDSS.saveSessionToFile(result.raw);
    setSaveState(res.success ? `Tersimpan: ${res.path}` : `Gagal menyimpan: ${res.error ?? "kesalahan tidak diketahui"}`);
  };

  useEffect(() => {
    if (!isStreaming && !result) textareaRef.current?.focus();
  }, [isStreaming]);

  const isTyping     = isStreaming || (!!pendingResultRef.current && !tw.isCaughtUp());
  const showStreamer = isTyping || (!showResult && tw.display.length > 0);

  return (
    <div
      className="bg-[var(--sentra-db01-canvas)] flex px-[3vw]"
      style={{ height: "100dvh", overflow: "hidden", paddingTop: "4.6vw", paddingBottom: "4.6vw" }}
    >
      <main
        className="mx-auto flex w-[min(94vw,1930px)] overflow-hidden rounded-[56px] border-[12px] border-[#343434] bg-[var(--sentra-db01-shell)]"
        style={{ flex: 1 }}
      >
        {/* Sidebar */}
        <div className="h-full overflow-y-auto" style={{ width: 360, flexShrink: 0 }}>
          <PatientSidebar
            patient={patient} onChange={setPatient}
            backend={backend} onBackendChange={setBackend}
            model={model} availableModels={availableModels} onModelChange={setModel}
            activeView={activeView} onViewChange={setActiveView}
          />
        </div>

        {/* Main area */}
        <section className="flex min-w-0 flex-1 flex-col border-l border-[var(--sentra-db01-divider)]">

          {/* Header */}
          <header className="flex h-[69px] shrink-0 items-center justify-between border-b border-[var(--sentra-db01-divider)] px-8">
            <div className="flex items-center gap-2.5">
              <FileText className="size-[15px] text-[#484846]" strokeWidth={1.7} />
              <p className="text-[15px] font-medium text-[#787876]">
                {activeView === "dashboard"   ? "SentraBoard"   :
                 activeView === "consult"     ? "MedLink"       :
                 activeView === "history"     ? "Logbook"       :
                 activeView === "formularium" ? "Resources"     :
                 activeView === "notif"       ? "Notification"  : "SentraBoard"}
                <span className="mx-2 text-[#333331]">·</span>
                <span className="text-[#484846]">
                  {activeView === "dashboard"   ? "Overview"      :
                   activeView === "consult"     ? "Konsultasi Baru" :
                   activeView === "history"     ? "Riwayat Kasus" :
                   activeView === "formularium" ? "Formularium"   :
                   activeView === "notif"       ? "Notifikasi"    : "Overview"}
                </span>
              </p>
            </div>
            {(showResult || showStreamer) && (
              <button
                onClick={handleNewCase}
                className="anim-fade-in flex items-center gap-2 rounded-[11px] border border-white/[0.07] px-3.5 py-1.5 text-[13px] font-medium text-[#6a6a68] transition-all hover:bg-[var(--sentra-db01-raised)] hover:text-[#c0c0be] active:scale-95"
              >
                <RefreshCw className="size-3.5" strokeWidth={2} />
                Kasus Baru
              </button>
            )}
          </header>

          {/* ── View routing ────────────────────────────────────────── */}

          {/* Dashboard */}
          {activeView === "dashboard" && (
            <div key="dashboard" className="anim-view-enter flex-1 overflow-hidden">
              <Dashboard
                cases={savedCases}
                onStartConsult={() => setActiveView("consult")}
                onViewChange={setActiveView}
                engineReady={!!backendsData}
                model={model}
              />
            </div>
          )}

          {/* Riwayat Kasus */}
          {activeView === "history" && (
            <div key="history" className="anim-view-enter flex-1 overflow-hidden">
              <RiwayatKasus
                cases={savedCases}
                onDelete={handleDeleteCase}
                onLoadCase={handleLoadCase}
              />
            </div>
          )}

          {/* Formularium */}
          {activeView === "formularium" && (
            <div key="formularium" className="anim-view-enter flex-1 overflow-hidden">
              <Formularium />
            </div>
          )}

          {/* Notifikasi */}
          {activeView === "notif" && (
            <div key="notif" className="anim-view-enter flex-1 overflow-hidden">
              <Notifikasi cases={savedCases} />
            </div>
          )}

          {/* Konsultasi */}
          {activeView === "consult" && (
            <div key="consult" className="anim-view-enter flex-1 overflow-y-auto">
              <div className="mx-auto max-w-[820px] px-10 py-8">

                {/* Error */}
                {streamError && (
                  <div className="anim-slide-down mb-6 rounded-[14px] border border-[var(--sentra-db01-accent-red)]/20 bg-[#150606] px-5 py-3.5 text-[14px] text-[#a04040]">
                    <span className="font-semibold text-[var(--sentra-db01-accent-red)]">Error: </span>{streamError}
                  </div>
                )}

                {/* Red flags */}
                {showResult && result && result.red_flags.length > 0 && !flagsDismissed && (
                  <div className="anim-slide-down mb-6">
                    <RedFlagAlert flags={result.red_flags} onDismiss={() => setFlagsDismissed(true)} />
                  </div>
                )}

                {/* Clinical results */}
                {showResult && result && (
                  <div className="anim-fade-up mb-6">
                    <ClinicalOutput result={result} />
                  </div>
                )}

                {/* Desktop-only: save session to file */}
                {showResult && result && window.electronCDSS?.isElectron && (
                  <div className="mb-6 flex items-center gap-3">
                    <button
                      onClick={() => { void handleSaveToFile(); }}
                      className="rounded-[10px] border border-white/[0.08] bg-[#1e1e1e] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#a8a8a4] transition-colors hover:border-white/[0.16] hover:text-white"
                    >
                      Simpan ke File
                    </button>
                    <button
                      onClick={() => { void window.electronCDSS?.openSessionFolder(); }}
                      className="rounded-[10px] border border-white/[0.08] bg-transparent px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#787876] transition-colors hover:border-white/[0.16] hover:text-white"
                    >
                      Buka Folder Sesi
                    </button>
                    {saveState && (
                      <span className="text-[11px] text-[#787876]">{saveState}</span>
                    )}
                  </div>
                )}

                {/* Typewriter stream */}
                {showStreamer && (
                  <div className="anim-fade-up mb-6">
                    <div className="mb-3 flex items-center gap-2.5">
                      {isStreaming ? (
                        <>
                          <span className="relative flex size-2 shrink-0">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--sentra-db01-accent-green)] opacity-60" />
                            <span className="relative inline-flex size-2 rounded-full bg-[var(--sentra-db01-accent-green)]" />
                          </span>
                          <p className="text-[12px] font-medium text-[#484846]">SIDELAB menganalisis…</p>
                        </>
                      ) : (
                        <>
                          <Loader2 className="size-3 animate-spin text-[#484846]" strokeWidth={2} />
                          <p className="text-[12px] font-medium text-[#484846]">Memproses hasil…</p>
                        </>
                      )}
                    </div>
                    <div className="rounded-[14px] border border-white/[0.05] bg-[#171715] p-5">
                      <pre
                        className="whitespace-pre-wrap break-words text-[13px] leading-[1.75] text-[#787876]"
                        style={{ fontFamily: "var(--sentra-db01-font)" }}
                      >
                        {tw.display}
                        <span className="ml-0.5 inline-block h-[14px] w-[2px] animate-pulse bg-[var(--sentra-db01-accent-green)] align-middle" />
                      </pre>
                      <div ref={streamEndRef} />
                    </div>
                  </div>
                )}

                {/* Complaint input */}
                <div className="rounded-[18px] border border-white/[0.07] bg-[#1e1e1e] transition-shadow duration-300 focus-within:border-white/[0.12] focus-within:shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
                  <div className="px-5 pt-5">
                    <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#484846]">
                      {showResult ? "Tindak Lanjut / Informasi Tambahan" : "Keluhan Utama & Anamnesis"}
                    </p>
                    <textarea
                      ref={textareaRef}
                      value={complaint}
                      onChange={e => setComplaint(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={isStreaming}
                      rows={showResult ? 3 : 6}
                      placeholder={
                        showResult
                          ? "Tambahkan informasi atau pertanyaan tindak lanjut…"
                          : "Deskripsikan keluhan pasien secara lengkap.\n\nContoh: Pasien laki-laki 45 tahun dengan nyeri dada kiri sejak 2 jam, menjalar ke lengan kiri, disertai keringat dingin dan sesak napas. Riwayat DM tipe 2."
                      }
                      className="w-full resize-none bg-transparent text-[15px] leading-[1.65] text-[#e0e0de] placeholder:text-[#333331] outline-none disabled:opacity-40"
                    />
                  </div>
                  <div className="flex items-center justify-between px-5 py-3.5">
                    <span className="text-[12px] text-[#333331]">Ctrl+Enter</span>
                    <button
                      onClick={handleSubmit}
                      disabled={!complaint.trim() || isStreaming}
                      className="flex h-9 items-center gap-2 rounded-[11px] bg-[#eeeeec] px-4 text-[14px] font-semibold text-[#272727] transition-all hover:bg-white active:scale-[0.96] disabled:opacity-25 disabled:cursor-not-allowed"
                    >
                      {isStreaming
                        ? <><Loader2 className="size-3.5 animate-spin" />Menganalisis…</>
                        : <><ThinIcon Icon={Send} className="size-3.5" />{showResult ? "Lanjutkan" : "Analisis Klinis"}</>
                      }
                    </button>
                  </div>
                </div>

                {/* Empty state */}
                {!showResult && !showStreamer && (
                  <div className="anim-fade-in mt-10 flex flex-col items-center py-8 text-center">
                    <ThinIcon Icon={FileText} className="size-8 text-[#2a2a28]" />
                    <p className="mt-4 text-[15px] font-medium text-[#2e2e2c]">Belum ada konsultasi</p>
                    <p className="mt-1.5 max-w-[360px] text-[13px] leading-relaxed text-[#252523]">
                      Engine menghasilkan diagnosis banding, diagnosis kerja, farmakologi FORNAS, dan edukasi pasien.
                    </p>
                  </div>
                )}

              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
