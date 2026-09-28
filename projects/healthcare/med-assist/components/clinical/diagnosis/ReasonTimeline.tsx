import { motion, useReducedMotion, type Transition, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';

import { cleanClinicalSummary, formatClinicalText } from './diagnosisDisplayUtils';

/**
 * The reasons behind a diagnosis card, opened from "Lihat alasan", drawn as the "Activity timeline"
 * on lab.xevrion.dev (Chief's reference): one entry per reason group, an icon node on the left,
 * a hairline joining the nodes, the group name, then the items.
 *
 * Motion: the panel opens on a spring with no bounce (height and opacity), the entries follow
 * one after another, each settling from a 4 px blur and a 6 px lift, and each connecting line
 * grows down to the next node once its entry has landed. Closing folds the panel on a shorter
 * spring. Reduced motion keeps only the fades.
 */
export type ReasonGroup = { key: string; title: string; items: string[] };

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const STAGGER = 0.07;
export const PANEL_OPEN: Transition = { type: 'spring', bounce: 0, duration: 0.5 };
export const PANEL_CLOSE: Transition = { type: 'spring', bounce: 0, duration: 0.32 };

const entry: Variants = {
  hidden: { opacity: 0, y: -6, filter: 'blur(4px)' },
  shown: (index: number) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.38, ease: EASE_OUT, delay: 0.06 + index * STAGGER },
    transitionEnd: { filter: 'none' },
  }),
};
const entryReduced: Variants = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { duration: 0.2 } },
};

const ICONS: Record<string, string> = {
  supports: 'M3.5 8.5l3 3 6-7',
  against: 'M4.5 4.5l7 7M11.5 4.5l-7 7',
  missing: 'M6 6.2a2 2 0 1 1 2.9 1.8c-.6.3-.9.7-.9 1.3v.4M8 12.2h.01',
  review: 'M4 4.5h8M4 8h8M4 11.5h5',
  history: 'M8 4.5V8l2.2 1.4M13.25 8a5.25 5.25 0 1 1-10.5 0 5.25 5.25 0 0 1 10.5 0Z',
  why: 'M8 5.5v3.2M8 11h.01M7.1 2.6 1.9 11.6a1 1 0 0 0 .9 1.5h10.4a1 1 0 0 0 .9-1.5L8.9 2.6a1 1 0 0 0-1.8 0Z',
};

export function ReasonTimeline({ groups, footer }: { groups: ReasonGroup[]; footer?: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const shown = groups
    .map((group) => ({ ...group, items: group.items.map(cleanClinicalSummary).filter(Boolean) }))
    .filter((group) => group.items.length > 0);
  // A footer (a MUST NOT MISS card's checks) still shows when no reason group has items.
  if (shown.length === 0 && !footer) return null;

  return (
    <motion.div
      className="overflow-hidden"
      initial={{ height: 0, opacity: 0 }}
      animate={{
        height: 'auto',
        opacity: 1,
        transition: reduceMotion ? { duration: 0.2 } : { height: PANEL_OPEN, opacity: { duration: 0.25 } },
      }}
      exit={{
        height: 0,
        opacity: 0,
        transition: reduceMotion ? { duration: 0.15 } : { height: PANEL_CLOSE, opacity: { duration: 0.18 } },
      }}
    >
      {shown.length > 0 ? (
        <ol className="dx-timeline pt-2" aria-label="Alasan">
          {shown.map((group, index) => (
            <motion.li
              key={group.key}
              className="dx-timeline__item"
              custom={index}
              variants={reduceMotion ? entryReduced : entry}
              initial="hidden"
              animate="shown"
            >
              {index < shown.length - 1 ? (
                <motion.span
                  aria-hidden="true"
                  className="dx-timeline__line"
                  initial={{ scaleY: reduceMotion ? 1 : 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.42, ease: EASE_OUT, delay: 0.16 + index * STAGGER }}
                />
              ) : null}
              <span aria-hidden="true" className="dx-timeline__node">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d={ICONS[group.key] ?? ICONS.review} />
                </svg>
              </span>
              <div className="min-w-0 flex-1 pt-1">
                {/* No count: the card's tally row, just above, already carries it. */}
                <div className="diagnosis-list-title">{group.title}</div>
                <ul className="mt-1 flex flex-col gap-0.5">
                  {group.items.map((item) => (
                    <li key={item} className="diagnosis-row-meta">
                      {formatClinicalText(item)}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.li>
          ))}
        </ol>
      ) : null}
      {footer ? <div className="flex pt-3">{footer}</div> : null}
    </motion.div>
  );
}
