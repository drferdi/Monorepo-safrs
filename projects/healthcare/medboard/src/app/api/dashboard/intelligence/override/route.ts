import { recordOverrideAudit } from '@/lib/intelligence/server'
import { getCrewSessionFromRequest } from '@/lib/server/crew-access-auth'
import { getRequestIp, writeSecurityAuditLog } from '@/lib/server/security-audit'
import { createOverridePostHandler } from '../handlers'

export const runtime = 'nodejs'

export const POST = createOverridePostHandler({
  getSession: getCrewSessionFromRequest,
  getIp: getRequestIp,
  recordOverride: recordOverrideAudit,
  writeSecurityAuditLog,
})
