// Clinical rank ladder (Chief 2026-10-07): a level needs both its clinical-report count and its
// active dashboard hours. Rank and awards are derived on read and never stored.

export interface CrewRank {
  level: number
  slug: string
  name: string
  minCases: number
  minHours: number
  badgeSrc: string
}

export const CREW_RANKS: readonly CrewRank[] = [
  { level: 1, slug: 'intern', name: 'Intern', minCases: 0, minHours: 0, badgeSrc: '/ranks/intern.png' },
  { level: 2, slug: 'residen_yunior', name: 'Residen Yunior', minCases: 25, minHours: 50, badgeSrc: '/ranks/residen_yunior.png' },
  { level: 3, slug: 'residen_senior', name: 'Residen Senior', minCases: 75, minHours: 150, badgeSrc: '/ranks/residen_senior.png' },
  { level: 4, slug: 'residen_kepala', name: 'Residen Kepala', minCases: 150, minHours: 300, badgeSrc: '/ranks/residen_kepala.png' },
  { level: 5, slug: 'fellow', name: 'Fellow', minCases: 300, minHours: 600, badgeSrc: '/ranks/fellow.png' },
  { level: 6, slug: 'konsulen_muda', name: 'Konsulen Muda', minCases: 500, minHours: 1000, badgeSrc: '/ranks/konsulen_muda.png' },
  { level: 7, slug: 'konsulen_madya', name: 'Konsulen Madya', minCases: 1000, minHours: 2000, badgeSrc: '/ranks/konsulen_madya.png' },
  { level: 8, slug: 'konsulen_utama', name: 'Konsulen Utama', minCases: 2000, minHours: 4000, badgeSrc: '/ranks/konsulen_utama.png' },
  // No Legendary artwork yet: it borrows Konsulen Utama and the badge draws a ring around it.
  { level: 9, slug: 'legendary', name: 'Legendary', minCases: 5000, minHours: 10000, badgeSrc: '/ranks/konsulen_utama.png' },
]

export const CREW_AWARD_MILESTONES: readonly number[] = [25, 75, 150, 300, 500, 1000, 2000, 5000]

export interface CrewAward {
  cases: number
  achievedAt: string | null
}

export interface CrewRankSummary {
  level: number
  name: string
  badgeSrc: string
  cases: number
  hours: number
  next: { level: number; name: string; minCases: number; minHours: number } | null
}

export function rankFor(cases: number, hours: number): CrewRank {
  for (let i = CREW_RANKS.length - 1; i > 0; i -= 1) {
    const rank = CREW_RANKS[i]
    if (cases >= rank.minCases && hours >= rank.minHours) return rank
  }
  return CREW_RANKS[0]
}

export function summarizeRank(cases: number, seconds: number): CrewRankSummary {
  const hours = Math.floor(seconds / 3600)
  const rank = rankFor(cases, hours)
  const next = CREW_RANKS.find((candidate) => candidate.level === rank.level + 1)
  return {
    level: rank.level,
    name: rank.name,
    badgeSrc: rank.badgeSrc,
    cases,
    hours,
    next: next
      ? { level: next.level, name: next.name, minCases: next.minCases, minHours: next.minHours }
      : null,
  }
}

export function awardsFor(reportDates: readonly Date[]): CrewAward[] {
  const sorted = [...reportDates].sort((left, right) => left.getTime() - right.getTime())
  return CREW_AWARD_MILESTONES.map((cases) => ({
    cases,
    achievedAt: sorted[cases - 1]?.toISOString() ?? null,
  }))
}
