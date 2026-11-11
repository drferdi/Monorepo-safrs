import 'server-only'

import { Prisma } from '@prisma/client'

import { FIRST_BEAT_SECONDS, activityDayKey, creditForBeat } from '@/lib/crew-activity'
import { prisma } from '@/lib/prisma'

// One row per user per WIB day. The update is conditional on the lastBeatAt it read, so two tabs
// beating at once credit the minute once.
export async function recordActivityBeat(username: string, now: Date): Promise<boolean> {
  const day = activityDayKey(now)
  const row = await prisma.crewActivityDay.findUnique({ where: { username_day: { username, day } } })
  if (!row) {
    try {
      await prisma.crewActivityDay.create({
        data: { username, day, seconds: FIRST_BEAT_SECONDS, lastBeatAt: now },
      })
      return true
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return false
      throw error
    }
  }
  const credit = creditForBeat(row.lastBeatAt, now)
  if (credit === null) return false
  const { count } = await prisma.crewActivityDay.updateMany({
    where: { username, day, lastBeatAt: row.lastBeatAt },
    data: { seconds: { increment: credit }, lastBeatAt: now },
  })
  return count === 1
}
