import { recordIntelligenceInteractionAudit } from '@/lib/intelligence/server'
import { getCrewSessionFromRequest } from '@/lib/server/crew-access-auth'
import { getRequestIp, writeSecurityAuditLog } from '@/lib/server/security-audit'
import { createObservabilityPostHandler } from '../observability-handler'

export const runtime = 'nodejs'

export const POST = createObservabilityPostHandler({
  getSession: getCrewSessionFromRequest,
  getIp: getRequestIp,
  recordInteraction: recordIntelligenceInteractionAudit,
  writeSecurityAuditLog,
})
