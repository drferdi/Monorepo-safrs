import 'server-only'

import { awardsFor, summarizeRank, type CrewAward, type CrewRankSummary } from '@/lib/crew-rank'
import { prisma } from '@/lib/prisma'

function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim())
}

// Two grouped queries for any number of members: report counts by author, seconds by user.
export async function loadCrewRankSummaries(
  usernames: readonly string[]
): Promise<Map<string, CrewRankSummary>> {
  const cases = new Map<string, number>()
  const seconds = new Map<string, number>()
  if (hasDatabase() && usernames.length > 0) {
    const list = [...usernames]
    const [reports, activity] = await Promise.all([
      prisma.clinicalReport.groupBy({
        by: ['authorUsername'],
        where: { authorUsername: { in: list } },
        _count: { _all: true },
      }),
      prisma.crewActivityDay.groupBy({
        by: ['username'],
        where: { username: { in: list } },
        _sum: { seconds: true },
      }),
    ])
    for (const row of reports) if (row.authorUsername) cases.set(row.authorUsername, row._count._all)
    for (const row of activity) seconds.set(row.username, row._sum.seconds ?? 0)
  }
  return new Map(
    usernames.map((username) => [
      username,
      summarizeRank(cases.get(username) ?? 0, seconds.get(username) ?? 0),
    ])
  )
}

export async function loadCrewAwards(username: string): Promise<CrewAward[]> {
  if (!hasDatabase()) return awardsFor([])
  const rows = await prisma.clinicalReport.findMany({
    where: { authorUsername: username },
    select: { createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
  return awardsFor(rows.map((row) => row.createdAt))
}
