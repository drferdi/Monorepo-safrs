import { Award } from 'lucide-react'

import type { CrewAward, CrewRankSummary } from '@/lib/crew-rank'

import { RankBadge } from './RankBadge'

const dateFormat = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Jakarta',
})

const count = (value: number) => value.toLocaleString('id-ID')

// Home profile card (Chief 2026-10-07): current rank, both needs for the next level, and the
// eight case awards; a reached award shows the day of the report that reached it.
export function RankAwardCard({ rank, awards }: { rank: CrewRankSummary | null; awards: CrewAward[] }) {
  return (
    <div className="rank-card">
      <RankBadge rank={rank} size={72} />
      <div className="rank-card__progress">
        {rank?.next ? (
          <>
            <span>{`${count(rank.cases)} / ${count(rank.next.minCases)} kasus`}</span>
            <span>{`${count(rank.hours)} / ${count(rank.next.minHours)} jam`}</span>
            <span className="rank-card__muted">{`menuju ${rank.next.name}`}</span>
          </>
        ) : rank ? (
          <span>Level tertinggi</span>
        ) : null}
      </div>
      <ul className="rank-card__awards">
        {awards.map((award) => (
          <li
            key={award.cases}
            className="rank-card__award"
            data-reached={award.achievedAt ? 'true' : 'false'}
          >
            <Award size={18} strokeWidth={1.75} aria-hidden="true" />
            <span>{`${count(award.cases)} kasus`}</span>
            {award.achievedAt ? (
              <span className="rank-card__muted">{dateFormat.format(new Date(award.achievedAt))}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
