import 'server-only'

import { NextResponse } from 'next/server'

import { activitySince, buildActivityDays } from '@/lib/report/clinical-activity'
import { listClinicalReportDates } from '@/lib/report/clinical-report-store'
import { isCrewAuthorizedRequest } from '@/lib/server/crew-access-auth'

export const runtime = 'nodejs'

// Counts only: how many clinical reports a doctor wrote per WIB day over the last year.
export async function GET(request: Request) {
  if (!isCrewAuthorizedRequest(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const dokter = new URL(request.url).searchParams.get('dokter')
  if (!dokter) {
    return NextResponse.json({ ok: false, error: 'Missing dokter parameter' }, { status: 400 })
  }

  const today = new Date()
  const dates = await listClinicalReportDates(dokter, activitySince(today))
  return NextResponse.json({ ok: true, days: buildActivityDays(dates, today) })
}
