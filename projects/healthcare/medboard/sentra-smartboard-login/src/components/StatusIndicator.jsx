import React from 'react';

/** Understated two-part status line for the dark field. */
export default function StatusIndicator({ label, state, className = '' }) {
  return (
    <p
      className={`flex items-center gap-3 font-mono text-[10.5px] font-medium tracking-[0.18em] text-white/55 uppercase ${className}`}
    >
      <span aria-hidden="true" className="relative flex size-1.5">
        <span className="absolute -inset-1 animate-breathe rounded-full bg-glow/25" />
        <span className="relative size-1.5 rounded-full bg-glow" />
      </span>
      <span>{label}</span>
      <span aria-hidden="true" className="h-px w-5 bg-white/25" />
      <span className="text-white/85">{state}</span>
    </p>
  );
}
