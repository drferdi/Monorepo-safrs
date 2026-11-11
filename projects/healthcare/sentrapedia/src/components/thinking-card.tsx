"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";

/** The answer's place while the analysis runs. It reports only what has happened: the request went out, and
 *  how long the workspace has been waiting. The gateway's stages arrive with the answer (Jejak analisis). */
export function ThinkingCard({ onCancel, startedAt }: { onCancel: () => void; startedAt?: number }) {
  // The card mounts when the request goes out, so its mount is the start unless the caller knows better.
  const [started] = useState(() => startedAt ?? performance.now());
  const [seconds, setSeconds] = useState(() => elapsed(started));
  useEffect(() => {
    const timer = setInterval(() => setSeconds(elapsed(started)), 1000);
    return () => clearInterval(timer);
  }, [started]);
  return <article className="assistant-message thinking-card" aria-busy="true">
    <div role="status" aria-live="polite"><ol className="thinking-steps">
      <li data-done="true"><Check size={12} aria-hidden="true"/><span>Permintaan diterima</span></li>
      <li data-done="false"><span className="thinking-dot" aria-hidden="true"/><span>Menunggu jawaban AADI · {seconds} dtk</span></li>
    </ol></div>
    <button type="button" className="text-button" onClick={onCancel}>Batalkan analisis</button>
  </article>;
}

function elapsed(startedAt: number): number {
  return Math.max(0, Math.floor((performance.now() - startedAt) / 1000));
}
