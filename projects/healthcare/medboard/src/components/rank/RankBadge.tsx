import Image from 'next/image'

import { accessLevelFor, accessLevelLabel } from '@/lib/access-level'
import { summarizeRank, type CrewRankSummary } from '@/lib/crew-rank'

// Clinical rank badge (Chief 2026-10-07): everyone has one, from Intern; the name is written under
// the image so the rank never depends on recognising the artwork. Styles live in src/app/rank.css.
export function RankBadge({ rank, size }: { rank: CrewRankSummary | null | undefined; size: number }) {
  const shown = rank ?? summarizeRank(0, 0)
  return (
    <figure
      className={shown.level === 9 ? 'rank-badge rank-badge--legendary' : 'rank-badge'}
      style={{ width: size }}
    >
      <Image src={shown.badgeSrc} alt={`Lencana ${shown.name}`} width={size} height={size} />
      <figcaption className="rank-badge__caption">{`Lv.${shown.level} · ${shown.name}`}</figcaption>
    </figure>
  )
}

// CEO and Administrator are authority, not experience: coloured text at the card edge.
export function LevelEdge({ role }: { role: string }) {
  const level = accessLevelFor(role)
  if (level === 'USER') return null
  return (
    <span className={level === 'CEO' ? 'level-edge level-edge--ceo' : 'level-edge'}>
      {accessLevelLabel(level)}
    </span>
  )
}
