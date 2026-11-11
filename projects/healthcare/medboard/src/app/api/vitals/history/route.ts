/**
 * GET /api/vitals/history
 *
 * Returns vital sign history for a patient, ordered oldest→newest.
 * Used by the trajectory analyzer to load DB-persisted visit history.
 *
 * Query params:
 *   patient  - Hashed patient identifier (required)
 *   limit    - Max records (default 10, max 20)
 *
 * Authentication: HMAC crew cookie (any authenticated staff).
 * PHI guard: patient identifier is a hash — no plaintext patient data is
 * returned beyond what was stored in the vitals JSON payload.
 *
 * Clinical Momentum Engine — Phase 1B (Data Foundation)
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { isCrewAuthorizedRequest } from '@/lib/server/crew-access-auth'
import { getPatientVitalHistory } from '@/lib/vitals/vital-record-service'

export const runtime = 'nodejs'

const MAX_LIMIT = 20

/**
 * @summary Retrieve patient vital signs history.
 * @description
 * Returns a time-series trajectory of clinical vitals (BP, HR, RR, Temp, SpO2) 
 * for a specific patient.
 * 
 * PHI SAFE: This endpoint uses a hashed patient identifier. No plaintext PII 
 * (Name, NIK) is accepted or returned.
 * 
 * @pathParam {string} patient - SHA-256 hashed patient identifier.
 * @pathParam {number} [limit=10] - Number of historical records to return (max 20).
 * 
 * @example {
 *   "success": true,
 *   "count": 2,
 *   "data": [
 *     { "vitals": { "systolic": 120, "diastolic": 80 }, "timestamp": "2023-10-01T10:00:00Z" },
 *     { "vitals": { "systolic": 130, "diastolic": 85 }, "timestamp": "2023-09-25T09:30:00Z" }
 *   ]
 * }
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  // Auth check
  const isAuthorized = isCrewAuthorizedRequest(req)
  if (!isAuthorized) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  // Parse query params
  const { searchParams } = req.nextUrl
  const patientIdentifier = searchParams.get('patient')

  if (!patientIdentifier || patientIdentifier.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: 'Missing required query param: patient' },
      { status: 400 }
    )
  }

  // Validate patient identifier is a 64-char hex SHA-256 hash
  if (!/^[0-9a-f]{64}$/.test(patientIdentifier)) {
    return NextResponse.json(
      { success: false, error: 'Invalid patient identifier format' },
      { status: 400 }
    )
  }

  const rawLimit = searchParams.get('limit')
  const limit = Math.min(
    rawLimit ? Math.max(1, Number.parseInt(rawLimit, 10) || 10) : 10,
    MAX_LIMIT
  )

  // Retrieve
  const result = await getPatientVitalHistory(patientIdentifier, limit)

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve vital history' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    data: result.data,
    count: result.data.length,
  })
}
