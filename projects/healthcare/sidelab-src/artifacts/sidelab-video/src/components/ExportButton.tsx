import { useState, useRef, useCallback } from 'react';

const TOTAL_MS = 31000; // 6+6+6+6.5+6.5 seconds

type Phase = 'idle' | 'selecting' | 'recording' | 'done' | 'error';

export function ExportButton({ onRestartVideo }: { onRestartVideo: () => void }) {
  const [phase, setPhase]       = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const mediaRef    = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef   = useRef<Blob[]>([]);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopAll = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    mediaRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const handleExport = useCallback(async () => {
    setPhase('selecting');
    setProgress(0);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 } as MediaTrackConstraints,
        audio: false,
      });
      mediaRef.current = stream;

      // Prefer MP4 if available, fall back to WebM
      const mimeType = MediaRecorder.isTypeSupported('video/mp4')
        ? 'video/mp4'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const ext  = mimeType.startsWith('video/mp4') ? 'mp4' : 'webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `cdss-fktp-sidelab-video.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
        setPhase('done');
        setTimeout(() => setPhase('idle'), 3000);
      };

      // Restart video from scene 0 then start recording
      onRestartVideo();
      await new Promise(r => setTimeout(r, 200)); // tiny delay for scene reset

      recorder.start(100); // collect chunks every 100ms
      setPhase('recording');

      const start = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - start;
        const pct = Math.min((elapsed / TOTAL_MS) * 100, 100);
        setProgress(pct);
        if (elapsed >= TOTAL_MS) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          recorder.stop();
          stream.getTracks().forEach(t => t.stop());
        }
      }, 100);

      // Safety: also listen for track end (user stops share)
      stream.getVideoTracks()[0].onended = () => {
        if (recorderRef.current?.state !== 'inactive') {
          recorderRef.current?.stop();
        }
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        setPhase('idle');
      };

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Permission denied') || msg.includes('cancelled')) {
        setPhase('idle');
      } else {
        setErrorMsg(msg);
        setPhase('error');
        setTimeout(() => setPhase('idle'), 4000);
      }
    }
  }, [onRestartVideo]);

  const handleCancel = useCallback(() => {
    stopAll();
    setPhase('idle');
  }, [stopAll]);

  /* ── Render ─────────────────────────────────────────────────────────────── */
  const base =
    'fixed bottom-6 right-6 z-[9999] flex items-center gap-2.5 rounded-[14px] px-4 py-2.5 text-[13px] font-semibold shadow-2xl transition-all select-none';

  if (phase === 'idle') {
    return (
      <button
        onClick={handleExport}
        className={`${base} bg-[#00ff66] text-black hover:brightness-110 active:scale-95`}
      >
        <DownloadIcon />
        Export Video
      </button>
    );
  }

  if (phase === 'selecting') {
    return (
      <div className={`${base} bg-[#1a1a18] text-[#00ff66] border border-[#00ff66]/30`}>
        <SpinnerIcon />
        Pilih tab/jendela…
      </div>
    );
  }

  if (phase === 'recording') {
    const secs = Math.ceil(((100 - progress) / 100) * TOTAL_MS / 1000);
    return (
      <div className={`${base} flex-col items-start gap-1.5 bg-[#0e0e0c] border border-[#00ff66]/40`} style={{ minWidth: 180 }}>
        <div className="flex w-full items-center justify-between">
          <span className="flex items-center gap-2 text-[#00ff66]">
            <span className="size-2 rounded-full bg-[#ff4444] animate-pulse" />
            Merekam… {secs}s
          </span>
          <button onClick={handleCancel} className="ml-3 text-[11px] text-[#555] hover:text-[#aaa]">batal</button>
        </div>
        {/* Progress bar */}
        <div className="h-1 w-full rounded-full bg-[#222220] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#00ff66] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className={`${base} bg-[#0e1a12] text-[#00ff66] border border-[#00ff66]/30`}>
        <CheckIcon />
        Download dimulai!
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className={`${base} bg-[#1a0e0e] text-[#ff6666] border border-[#ff4444]/30`} style={{ maxWidth: 260 }}>
        <span className="truncate">Error: {errorMsg}</span>
      </div>
    );
  }

  return null;
}

/* ── Tiny icons ─────────────────────────────────────────────────────────── */
function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function SpinnerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
  );
}
