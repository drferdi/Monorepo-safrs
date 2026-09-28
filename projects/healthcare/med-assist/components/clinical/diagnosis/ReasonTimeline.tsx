import { motion, useReducedMotion, type Transition, type Variants } from 'framer-motion';

import { cleanClinicalSummary, formatClinicalText } from './diagnosisDisplayUtils';

/**
 * The reasons behind a diagnosis card, opened from "Tap here", drawn as the "Activity timeline"
 * on lab.xevrion.dev (Chief's reference): one entry per reason group, an icon node on the left,
 * a hairline joining the nodes, the group name with its count, then the items.
 *
 * Motion: the panel opens on a spring with no bounce (height and opacity), the entries follow
 * one after another, each settling from a 4 px blur and a 6 px lift, and each connecting line
 * grows down to the next node once its entry has landed. Closing folds the panel on a shorter
 * spring. Reduced motion keeps only the fades.
 */
export type ReasonGroup = { key: string; title: string; items: string[] };

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const STAGGER = 0.07;
const OPEN: Transition = { type: 'spring', bounce: 0, duration: 0.5 };
const CLOSE: Transition = { type: 'spring', bounce: 0, duration: 0.32 };

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
};

export function ReasonTimeline({ groups }: { groups: ReasonGroup[] }) {
  const reduceMotion = useReducedMotion();
  const shown = groups
    .map((group) => ({ ...group, items: group.items.map(cleanClinicalSummary).filter(Boolean) }))
    .filter((group) => group.items.length > 0);
  if (shown.length === 0) return null;

  return (
    <motion.div
      className="overflow-hidden"
      initial={{ height: 0, opacity: 0 }}
      animate={{
        height: 'auto',
        opacity: 1,
        transition: reduceMotion ? { duration: 0.2 } : { height: OPEN, opacity: { duration: 0.25 } },
      }}
      exit={{
        height: 0,
        opacity: 0,
        transition: reduceMotion ? { duration: 0.15 } : { height: CLOSE, opacity: { duration: 0.18 } },
      }}
    >
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
              <div className="flex items-baseline justify-between gap-3">
                <span className="diagnosis-list-title">{group.title}</span>
                <span className="ttv-label">{group.items.length}</span>
              </div>
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
    </motion.div>
  );
}
