// POST /api/consult/reject — dokter tolak konsult dari Assist
import { type NextRequest } from 'next/server'
import { emitEncounterUpdated } from '@/lib/intelligence/socket-bridge'
import { prisma } from '@/lib/prisma'
import { handleCorsPreflight, jsonWithCors } from '@/lib/server/api-cors'
import { getCrewSessionFromRequest } from '@/lib/server/crew-access-auth'

export const runtime = 'nodejs'

const CORS_METHODS = ['POST', 'OPTIONS'] as const

function buildPatientLabel(consultId: string): string {
  return `Pasien #${consultId.slice(-6).toUpperCase()}`
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request, CORS_METHODS)
}

export async function POST(req: NextRequest) {
  const session = getCrewSessionFromRequest(req)
  if (!session) {
    return jsonWithCors(req, CORS_METHODS, { ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json() as { consultId?: string }
    if (!body.consultId) {
      return jsonWithCors(req, CORS_METHODS, { ok: false, error: 'consultId wajib' }, { status: 400 })
    }

    await prisma.consultLog.update({
      where: { consultId: body.consultId },
      data: { status: 'rejected' },
    }).catch(() => { /* silent jika tidak ada */ })

    emitEncounterUpdated({
      encounterId: body.consultId,
      status: 'completed',
      timestamp: new Date().toISOString(),
      data: {
        patientLabel: buildPatientLabel(body.consultId),
        note: 'Consult ditolak oleh dokter.',
        source: 'assist-consult',
      },
    })

    return jsonWithCors(req, CORS_METHODS, { ok: true, consultId: body.consultId })
  } catch (err) {
    console.error('[Consult] reject error:', err)
    return jsonWithCors(req, CORS_METHODS, { ok: false, error: 'Server error' }, { status: 500 })
  }
}
