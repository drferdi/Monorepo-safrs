import 'server-only'

import { createHash, randomUUID } from 'node:crypto'

type SecurityAuditResult = 'success' | 'unauthenticated' | 'forbidden' | 'failure'

interface SecurityAuditInput {
  endpoint: string
  action: string
  result: SecurityAuditResult
  userId?: string | null
  role?: string | null
  ip?: string | null
  metadata?: Record<string, unknown>
}

function hashText(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function shouldTrustProxyHeaders(): boolean {
  const explicit = process.env.TRUST_PROXY_HEADERS?.trim().toLowerCase()
  if (explicit === 'true') return true
  if (explicit === 'false') return false
  return Boolean(process.env.RAILWAY_ENVIRONMENT_ID?.trim())
}

export function getRequestIp(request: Request): string | null {
  if (!shouldTrustProxyHeaders()) return null

  const forwarded = request.headers.get('x-forwarded-for')?.trim()
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? null

  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp

  return null
}

export async function writeSecurityAuditLog({
  endpoint,
  action,
  result,
  userId = null,
  role = null,
  ip = null,
  metadata = {},
}: SecurityAuditInput): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return

  try {
    const { prisma } = await import('@/lib/prisma')
    const delegate = (
      prisma as unknown as {
        cDSSAuditLog?: { create: (args: unknown) => Promise<unknown> }
      }
    ).cDSSAuditLog
    if (!delegate?.create) return

    const sessionHash = hashText(`${endpoint}:${userId ?? 'anonymous'}:${ip ?? 'unknown'}`)
    const inputHash = hashText(`${endpoint}:${action}:${result}`)

    await delegate.create({
      data: {
        id: randomUUID(),
        sessionHash,
        action,
        inputHash,
        outputSummary: { endpoint, result },
        modelVersion: 'AUTH-HARDENING-V1',
        latencyMs: 0,
        validationStatus: result,
        metadata: {
          endpoint,
          userId,
          role,
          ip,
          ...metadata,
        },
      },
    })
  } catch {
    // Audit write failure — silent to avoid leaking info to stdout
  }
}
