import { getOperationalMetrics } from '@/lib/intelligence/server'
import { getCrewSessionFromRequest } from '@/lib/server/crew-access-auth'
import { getRequestIp, writeSecurityAuditLog } from '@/lib/server/security-audit'
import { createMetricsGetHandler } from '../handlers'

export const runtime = 'nodejs'

export const GET = createMetricsGetHandler({
  getSession: getCrewSessionFromRequest,
  getIp: getRequestIp,
  getOperationalMetrics,
  writeSecurityAuditLog,
})
