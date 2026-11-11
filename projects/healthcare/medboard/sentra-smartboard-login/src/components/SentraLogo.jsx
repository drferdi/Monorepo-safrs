import React from 'react';
import { SENTRA_LOGO } from '../assets/sentraLogo.js';

/** Official Sentra mark. Inherits its colour from the surrounding text colour. */
export default function SentraLogo({ className = '' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${SENTRA_LOGO.width} ${SENTRA_LOGO.height}`}
      fill="currentColor"
      className={className}
    >
      {SENTRA_LOGO.paths.map((d) => (
        <path key={d.slice(0, 24)} d={d} />
      ))}
    </svg>
  );
}
