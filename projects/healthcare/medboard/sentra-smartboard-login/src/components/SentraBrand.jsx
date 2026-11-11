import React from 'react';
import SentraLogo from './SentraLogo.jsx';

/** Sentra lockup: official mark, wordmark, and optional product line. */
export default function SentraBrand({ tone = 'dark', showProduct = true, className = '', style }) {
  const onDark = tone === 'light';
  return (
    <div
      className={`flex items-center gap-3 ${onDark ? 'text-white' : 'text-ink'} ${className}`}
      style={style}
    >
      <SentraLogo className={`w-auto shrink-0 ${showProduct ? 'h-7' : 'h-6'}`} />
      <span className="flex flex-col gap-1 leading-none">
        <span className="font-sans text-[15px] font-bold tracking-[0.3em]">SENTRA</span>
        {showProduct && (
          <span
            className={`font-mono text-[10px] font-medium tracking-[0.22em] ${
              onDark ? 'text-white/60' : 'text-muted'
            }`}
          >
            MEDICAL SMARTBOARD
          </span>
        )}
      </span>
    </div>
  );
}
