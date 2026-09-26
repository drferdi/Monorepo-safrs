import { NextResponse } from 'next/server'
import { isCrewAuthorizedRequest } from '@/lib/server/crew-access-auth'

export const runtime = 'nodejs'

interface BodyPayload {
  year: number
  month: number
  mode?: string
}

function parsePayload(raw: unknown): BodyPayload {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid JSON body.')
  const body = raw as Record<string, unknown>
  const year = Number(body.year)
  const month = Number(body.month)
  if (!Number.isInteger(year) || year < 2020 || year > 2100) throw new Error('year tidak valid.')
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error('month tidak valid.')
  return { year, month, mode: String(body.mode || 'full-cycle') }
}

export async function POST(request: Request) {
  if (!isCrewAuthorizedRequest(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let year = 0
  let month = 0

  try {
    const payload = parsePayload(await request.json())
    year = payload.year
    month = payload.month

    // full-cycle = paksa export live via RPA, pipeline = pakai file yang sudah ada.
    const forceRmeExport = payload.mode !== 'pipeline'

    const [{ runLb1Engine }, { appendRunHistory }] = await Promise.all([
      import('@/lib/lb1/engine'),
      import('@/lib/lb1/history'),
    ])

    // Jalankan engine TypeScript — no Python needed
    const result = await runLb1Engine(year, month, { forceRmeExport })

    await appendRunHistory({
      mode: 'ts-engine',
      year,
      month,
      status: result.ok ? 'success' : 'failed',
      command: 'ts-engine',
      code: result.ok ? 0 : 1,
      outputFile: '',
      summaryFile: '',
      validRows: result.validCount,
      invalidRows: result.invalidCount,
      rawatJalan: result.summary.rawatJalan,
      rawatInap: result.summary.rawatInap,
      error: result.error || '',
    })

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      durationMs: result.durationMs,
      totalKunjungan: result.summary.totalKunjungan,
      rawatJalan: result.summary.rawatJalan,
      rawatInap: result.summary.rawatInap,
      rujukan: result.summary.rujukan,
      unmappedCount: result.summary.unmappedDx.length,
      rowCount: result.rows.length,
    })
  } catch (error) {
    const { appendRunHistory } = await import('@/lib/lb1/history')

    await appendRunHistory({
      mode: 'ts-engine',
      year,
      month,
      status: 'failed',
      command: 'ts-engine',
      code: -1,
      outputFile: '',
      summaryFile: '',
      validRows: 0,
      invalidRows: 0,
      rawatJalan: 0,
      rawatInap: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }).catch(() => null)

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to run LB1 engine',
      },
      { status: 400 }
    )
  }
}
