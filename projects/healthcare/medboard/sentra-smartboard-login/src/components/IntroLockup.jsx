import React from 'react';
import { SENTRA_LOGO } from '../assets/sentraLogo.js';

const delay = (ms) => ({ animationDelay: `${ms}ms` });

/**
 * Opening lockup: construction lines draw the mark, the wordmark is traced as
 * outlines and then filled, and the descriptor resolves beneath it.
 *
 * The mark is the official Sentra logo (see src/assets/sentraLogo.js).
 */
export default function IntroLockup({
  descriptor = 'ARTIFICIAL TECHNOLOGY',
  credit = 'Architect & Built by dr Ferdi Iskandar',
  leaving = false,
}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-[opacity,filter] duration-700 ease-calm ${
        leaving ? 'opacity-0 blur-[2px]' : 'opacity-100'
      }`}
    >
      <div className="flex w-[min(420px,78vw)] flex-col items-center">
        <svg
          viewBox={`0 0 ${SENTRA_LOGO.width} ${SENTRA_LOGO.height}`}
          className="h-[84px] w-auto overflow-visible sm:h-[100px]"
          fill="none"
        >
          {/* guide lines along the three strokes of the mark */}
          <g stroke="#fff" strokeWidth="4">
            <path className="intro-guide" pathLength="1" d="M-223 667L964 -187" style={delay(300)} />
            <path className="intro-guide" pathLength="1" d="M903 110L-150 870" style={delay(420)} />
            <path className="intro-guide" pathLength="1" d="M-42 1077L1098 327" style={delay(540)} />
          </g>
          {SENTRA_LOGO.paths.map((d, index) => (
            <g key={d.slice(0, 24)}>
              <path
                className="intro-stroke"
                pathLength="1"
                d={d}
                stroke="#fff"
                strokeWidth="7"
                strokeLinejoin="round"
                style={{ ...delay(650 + index * 180), animationDuration: '1400ms' }}
              />
              <path className="intro-fade" d={d} fill="#fff" style={delay(1650 + index * 120)} />
            </g>
          ))}
        </svg>

        <svg viewBox="0 0 420 70" className="mt-5 w-full overflow-visible" role="presentation">
          <text
            className="intro-word font-sans"
            x="217"
            y="54"
            textAnchor="middle"
            fontSize="50"
            fontWeight="700"
            letterSpacing="0.3em"
            fill="#fff"
            stroke="#fff"
            strokeWidth="0.8"
            style={{ animationDelay: '900ms, 1750ms' }}
          >
            SENTRA
          </text>
        </svg>

        <span className="intro-rule mt-2 block h-px w-full bg-white/30" style={delay(1500)} />
        <p
          className="intro-fade mt-4 pl-[0.42em] text-center font-mono text-[10px] font-medium tracking-[0.42em] text-white/75 sm:text-[12px]"
          style={delay(1900)}
        >
          {descriptor}
        </p>
        {credit && (
          <p
            className="intro-fade mt-7 text-center text-[11.5px] tracking-[0.04em] text-white/60 sm:text-[13px]"
            style={delay(2500)}
          >
            {credit}
          </p>
        )}
      </div>
    </div>
  );
}
