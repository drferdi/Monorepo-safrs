import type { ReactNode } from 'react';

import { cleanClinicalSummary, formatClinicalText } from './diagnosisDisplayUtils';

/**
 * The reasons behind a diagnosis card, opened from "Lihat alasan", drawn as the "Activity timeline"
 * on lab.xevrion.dev (Chief's reference): one entry per reason group, an icon node on the left,
 * a hairline joining the nodes, the group name, then the items.
 *
 * No motion (Chief, 2026-09-29: steady like a console, "gak suka ... gerak gerak kaya karet"): the
 * panel and its entries appear in place when opened and are gone when closed.
 */
export type ReasonGroup = { key: string; title: string; items: string[] };

const ICONS: Record<string, string> = {
  supports: 'M3.5 8.5l3 3 6-7',
  against: 'M4.5 4.5l7 7M11.5 4.5l-7 7',
  missing: 'M6 6.2a2 2 0 1 1 2.9 1.8c-.6.3-.9.7-.9 1.3v.4M8 12.2h.01',
  review: 'M4 4.5h8M4 8h8M4 11.5h5',
  history: 'M8 4.5V8l2.2 1.4M13.25 8a5.25 5.25 0 1 1-10.5 0 5.25 5.25 0 0 1 10.5 0Z',
  why: 'M8 5.5v3.2M8 11h.01M7.1 2.6 1.9 11.6a1 1 0 0 0 .9 1.5h10.4a1 1 0 0 0 .9-1.5L8.9 2.6a1 1 0 0 0-1.8 0Z',
};

export function ReasonTimeline({ groups, footer }: { groups: ReasonGroup[]; footer?: ReactNode }) {
  const shown = groups
    .map((group) => ({ ...group, items: group.items.map(cleanClinicalSummary).filter(Boolean) }))
    .filter((group) => group.items.length > 0);
  // A footer (a MUST NOT MISS card's checks) still shows when no reason group has items.
  if (shown.length === 0 && !footer) return null;

  return (
    <div>
      {shown.length > 0 ? (
        <ol className="dx-timeline pt-2" aria-label="Alasan">
          {shown.map((group, index) => (
            <li key={group.key} className="dx-timeline__item">
              {index < shown.length - 1 ? <span aria-hidden="true" className="dx-timeline__line" /> : null}
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
            </li>
          ))}
        </ol>
      ) : null}
      {footer ? <div className="flex pt-3">{footer}</div> : null}
    </div>
  );
}
