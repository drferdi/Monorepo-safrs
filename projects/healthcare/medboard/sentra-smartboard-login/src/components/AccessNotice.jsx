import React, { useEffect, useState } from 'react';
import { LockKeyhole } from 'lucide-react';

/** Roles that may be granted access. Edit here to change the notice. */
export const AUTHORIZED_ROLES = [
  'Clinicians',
  'Physicians',
  'Specialist physicians',
  'Healthcare institution administrators',
  'Pharmacists',
  'Nurses',
  'Midwives',
];

const CYCLE_MS = 2200;

/**
 * Access notice for the sign-in column. Roles enter one by one, then a soft
 * highlight travels through the list. Static under reduced motion.
 */
export default function AccessNotice({ roles = AUTHORIZED_ROLES, baseDelay = 0 }) {
  const [active, setActive] = useState(-1);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let interval;
    const start = setTimeout(() => {
      setActive(0);
      interval = setInterval(() => setActive((i) => (i + 1) % roles.length), CYCLE_MS);
    }, baseDelay + roles.length * 70 + 900);
    return () => {
      clearTimeout(start);
      clearInterval(interval);
    };
  }, [roles.length, baseDelay]);

  const rise = (ms) => ({ animationDelay: `${baseDelay + ms}ms` });

  return (
    <footer className="flex flex-col gap-3 border-t border-rule pt-5">
      <p
        className="flex animate-rise items-center gap-2 text-[11.5px] font-semibold tracking-[0.1em] text-ink uppercase"
        style={rise(0)}
      >
        <LockKeyhole aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={1.9} />
        Authorized clinical access only
      </p>
      <p id="access-roles-label" className="animate-rise text-[13px] leading-5 text-muted" style={rise(70)}>
        Access to this workspace is granted only to:
      </p>
      <ul
        aria-labelledby="access-roles-label"
        className="flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] leading-5"
      >
        {roles.map((role, index) => {
          const on = index === active;
          return (
            <li key={role} className="flex animate-rise items-center gap-2" style={rise(140 + index * 70)}>
              <span
                aria-hidden="true"
                className={`size-1 shrink-0 rounded-full transition-[background-color,transform] duration-700 ease-calm ${
                  on ? 'scale-150 bg-accent' : 'bg-field'
                }`}
              />
              <span
                className={`transition-colors duration-700 ease-calm ${on ? 'text-ink' : 'text-muted'}`}
              >
                {role}
              </span>
            </li>
          );
        })}
      </ul>
    </footer>
  );
}
