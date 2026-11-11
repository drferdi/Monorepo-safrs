// Drferdi — vision, brought to life.
import 'server-only'

import { NextResponse } from 'next/server'

import { ClinicalReportDraftInputSchema } from '@/lib/report/clinical-report'
import {
  clinicalReportAuthor,
  deleteClinicalReport,
  listClinicalReports,
  saveClinicalReport,
} from '@/lib/report/clinical-report-store'
import { getCrewSessionFromRequest, isCrewAuthorizedRequest } from '@/lib/server/crew-access-auth'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  if (!isCrewAuthorizedRequest(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const dokterFilter = url.searchParams.get('dokter')
  const limitParam = url.searchParams.get('limit')
  const parsedLimit = limitParam ? Math.max(1, Number.parseInt(limitParam, 10)) : null

  const { reports, nextNumber } = await listClinicalReports({
    dokter: dokterFilter,
    limit: Number.isFinite(parsedLimit ?? Number.NaN) ? parsedLimit : null,
  })

  return NextResponse.json({ ok: true, reports, nextNumber })
}

export async function POST(request: Request) {
  if (!isCrewAuthorizedRequest(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = ClinicalReportDraftInputSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Validation failed', issues: parsed.error.issues },
      { status: 400 }
    )
  }

  const report = await saveClinicalReport(
    parsed.data,
    clinicalReportAuthor(getCrewSessionFromRequest(request))
  )

  return NextResponse.json({ ok: true, report })
}

export async function DELETE(request: Request) {
  if (!isCrewAuthorizedRequest(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ ok: false, error: 'Missing id parameter' }, { status: 400 })
  }
  const deleted = await deleteClinicalReport(id)
  if (!deleted) {
    return NextResponse.json({ ok: false, error: 'Report tidak ditemukan' }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}
