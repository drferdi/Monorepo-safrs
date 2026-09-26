// Drferdi — vision, brought to life.
import { NextResponse } from 'next/server'
import { readEMRHistory } from '@/lib/emr/history'
import { readRunHistory } from '@/lib/lb1/history'
import { getCrewSessionFromRequest, listCrewAccessUsers } from '@/lib/server/crew-access-auth'
import { listAllCrewProfiles } from '@/lib/server/crew-access-profile'
import { listPendingRegistrations } from '@/lib/server/crew-access-registration'
import { getOnlineTodayCount } from '@/lib/server/online-today-tracker'
import { getRecentLogins, getTodayUsageData, getTopUsers } from '@/lib/server/usage-tracker'

export const runtime = 'nodejs'

const ALLOWED_ROLES = new Set(['CEO', 'CEO_SENTRA', 'ADMINISTRATOR', 'CHIEF_EXECUTIVE_OFFICER'])

export async function GET(request: Request) {
  const session = getCrewSessionFromRequest(request)
  if (!session || !ALLOWED_ROLES.has(session.role)) {
    return NextResponse.json(
      { ok: false, error: 'Akses ditolak. Hanya CEO dan Administrator.' },
      { status: 403 }
    )
  }

  try {
    const users = await listCrewAccessUsers()
    const profiles = listAllCrewProfiles()
    const pendingRegistrations = listPendingRegistrations()

    const crew = users.map(u => ({
      username: u.username,
      displayName: u.displayName,
      profession: u.profession,
      role: u.role,
      avatarUrl: profiles.get(u.username)?.avatarUrl || null,
    }))

    let lb1History: Awaited<ReturnType<typeof readRunHistory>> = []
    try {
      lb1History = await readRunHistory(50)
    } catch {
      /* no history yet */
    }

    let emrHistory: Awaited<ReturnType<typeof readEMRHistory>> = []
    try {
      emrHistory = await readEMRHistory(50)
    } catch {
      /* no history yet */
    }

    const lb1Success = lb1History.filter(r => r.status === 'success')
    const lb1Failed = lb1History.filter(r => r.status === 'failed')
    const lb1TotalVisits = lb1Success.reduce(
      (sum, r) => sum + (r.rawatJalan || 0) + (r.rawatInap || 0),
      0
    )

    const emrSuccess = emrHistory.filter(r => r.state === 'success').length
    const emrPartial = emrHistory.filter(r => r.state === 'partial').length
    const emrFailed = emrHistory.filter(r => r.state === 'failed' || r.state === 'cancelled').length
    const emrAvgLatency =
      emrHistory.length > 0
        ? Math.round(
            emrHistory.reduce((sum, r) => sum + (r.totalLatencyMs || 0), 0) / emrHistory.length
          )
        : 0

    /* Module health derivation */
    const lastLb1 = lb1History[0] || null
    const lastEmr = emrHistory[0] || null
    const lb1Status = !lastLb1 ? 'unknown' : lastLb1.status === 'success' ? 'ok' : 'error'
    const emrStatus = !lastEmr
      ? 'unknown'
      : lastEmr.state === 'success'
        ? 'ok'
        : lastEmr.state === 'partial'
          ? 'warning'
          : 'error'

    return NextResponse.json({
      ok: true,
      kpi: {
        totalCrew: users.length,
        pendingRegistrations: pendingRegistrations.length,
        onlineToday: getOnlineTodayCount(),
        lb1Runs: lb1History.length,
        lb1SuccessRuns: lb1Success.length,
        lb1FailedRuns: lb1Failed.length,
        lb1TotalVisits,
        emrTransfers: emrHistory.length,
        emrSuccess,
        emrPartial,
        emrFailed,
        emrAvgLatencyMs: emrAvgLatency,
        serverUptimeSeconds: Math.floor(process.uptime()),
      },
      moduleHealth: {
        lb1: {
          status: lb1Status,
          lastRun: lastLb1?.timestamp || null,
          lastStatus: lastLb1?.status || null,
        },
        emr: {
          status: emrStatus,
          lastRun: lastEmr?.timestamp || null,
          lastStatus: lastEmr?.state || null,
        },
      },
      serverMetrics: (() => {
        const mem = process.memoryUsage()
        return {
          memoryRssMb: Math.round(mem.rss / 1048576),
          heapUsedMb: Math.round(mem.heapUsed / 1048576),
          heapTotalMb: Math.round(mem.heapTotal / 1048576),
          externalMb: Math.round(mem.external / 1048576),
          uptimeSeconds: Math.floor(process.uptime()),
        }
      })(),
      serverTime: new Date().toISOString(),
      lb1Recent: lb1History.slice(0, 20).map(r => ({
        id: r.id,
        timestamp: r.timestamp,
        status: r.status,
        year: r.year,
        month: r.month,
        rawatJalan: r.rawatJalan,
        rawatInap: r.rawatInap,
        validRows: r.validRows,
        invalidRows: r.invalidRows,
      })),
      emrRecent: emrHistory.slice(0, 20).map(r => ({
        id: r.id,
        timestamp: r.timestamp,
        state: r.state,
        totalLatencyMs: r.totalLatencyMs,
        error: r.error || null,
      })),
      crew,
      pendingRegistrations: pendingRegistrations.map(r => ({
        id: r.id,
        username: r.username,
        displayName: r.displayName,
        profession: r.profession,
        institution: r.institution,
        createdAt: r.createdAt,
        status: r.status,
      })),
      usageToday: (() => {
        try {
          return getTodayUsageData()
        } catch {
          return { hours: [], dashboardCounts: [], emrClinicalCounts: [] }
        }
      })(),
      recentLogins: (() => {
        try {
          return getRecentLogins()
        } catch {
          return []
        }
      })(),
      topUsers: (() => {
        try {
          return getTopUsers(10)
        } catch {
          return []
        }
      })(),
    })
  } catch (error) {
    console.error('[Admin] Overview error:', error)
    return NextResponse.json({ ok: false, error: 'Gagal memuat data overview.' }, { status: 500 })
  }
}
