// GET /api/doctors/contacts — active doctors with a WhatsApp number, for Assist's "Send to Doctors".
import { buildDoctorContacts } from '@/lib/server/doctor-contacts'
import { handleCorsPreflight, jsonWithCors } from '@/lib/server/api-cors'
import { isCrewAuthorizedRequest, listCrewAccessUsersAll } from '@/lib/server/crew-access-auth'
import { listAllCrewProfiles } from '@/lib/server/crew-access-profile'

export const runtime = 'nodejs'

const CORS_METHODS = ['GET', 'OPTIONS'] as const

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, CORS_METHODS)
}

export async function GET(request: Request) {
  if (!isCrewAuthorizedRequest(request)) {
    return jsonWithCors(request, CORS_METHODS, { ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const doctors = buildDoctorContacts(await listCrewAccessUsersAll(), listAllCrewProfiles())
    return jsonWithCors(request, CORS_METHODS, { ok: true, doctors })
  } catch {
    return jsonWithCors(request, CORS_METHODS, { ok: false, error: 'Server error' }, { status: 500 })
  }
}
