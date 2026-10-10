"use client";

import { Check } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { thinkingStepAt, thinkingSteps } from "../lib/typing";
import { Brand } from "./brand";

/** The answer's place while the analysis runs: the clinical steps appear one after another. */
export function ThinkingCard({ onCancel }: { onCancel: () => void }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const started = performance.now();
    let frame = requestAnimationFrame(function tick(now) { const next = thinkingStepAt(now - started); setStep(next); if (next < thinkingSteps.length - 1) frame = requestAnimationFrame(tick); });
    return () => cancelAnimationFrame(frame);
  }, []);
  return <article className="assistant-message thinking-card" aria-busy="true">
    <header className="message-header"><Brand compact/><strong>Analisis kasus</strong></header>
    <div role="status"><ol className="thinking-steps">
      {thinkingSteps.slice(0, step + 1).map((label, index) => <li key={label} data-done={index < step} style={{ "--item-order": index } as CSSProperties}>{index < step ? <Check size={12} aria-hidden="true"/> : <span className="thinking-dot" aria-hidden="true"/>}<span>{label}{index < step ? "" : "…"}</span></li>)}
    </ol></div>
    <button type="button" className="text-button" onClick={onCancel}>Batalkan analisis</button>
  </article>;
}
