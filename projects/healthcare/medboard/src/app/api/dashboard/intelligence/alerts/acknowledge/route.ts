import { recordIntelligenceInteractionAudit } from '@/lib/intelligence/server'
import { getCrewSessionFromRequest } from '@/lib/server/crew-access-auth'
import { getRequestIp, writeSecurityAuditLog } from '@/lib/server/security-audit'
import { createAcknowledgePostHandler } from './acknowledge-handler'

export const runtime = 'nodejs'

export const POST = createAcknowledgePostHandler({
  getSession: getCrewSessionFromRequest,
  getIp: getRequestIp,
  recordInteraction: recordIntelligenceInteractionAudit,
  writeSecurityAuditLog,
})
