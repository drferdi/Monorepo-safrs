import { listEncounterSummaries } from '@/lib/intelligence/server'
import { getCrewSessionFromRequest } from '@/lib/server/crew-access-auth'
import { getRequestIp, writeSecurityAuditLog } from '@/lib/server/security-audit'
import { createEncountersGetHandler } from '../handlers'

export const runtime = 'nodejs'

export const GET = createEncountersGetHandler({
  getSession: getCrewSessionFromRequest,
  getIp: getRequestIp,
  listEncounterSummaries,
  writeSecurityAuditLog,
})
