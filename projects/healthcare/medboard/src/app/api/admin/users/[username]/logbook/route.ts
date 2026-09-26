import { NextResponse } from 'next/server'
import { getCrewSessionFromRequest } from '@/lib/server/crew-access-auth'

export const runtime = 'nodejs'

const ALLOWED_ROLES = new Set(['CEO', 'CEO_SENTRA', 'ADMINISTRATOR', 'CHIEF_EXECUTIVE_OFFICER'])
const MAX_PAGE_SIZE = 50

interface AuditRow {
  id: string
  timestamp: Date
  action: string
  validationStatus: string
  metadata: unknown
  outputSummary: unknown
}

export async function GET(request: Request, { params }: { params: Promise<{ username: string }> }) {
  const session = getCrewSessionFromRequest(request)
  if (!session || !ALLOWED_ROLES.has(session.role)) {
    return NextResponse.json({ ok: false, error: 'Akses ditolak.' }, { status: 403 })
  }

  try {
    const { username } = await params
    const url = new URL(request.url)
    const page = Math.max(1, Number.parseInt(url.searchParams.get('page') || '1', 10))
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number.parseInt(url.searchParams.get('pageSize') || '5', 10))
    )

    if (!process.env.DATABASE_URL?.trim()) {
      return NextResponse.json({
        ok: true,
        entries: [],
        total: 0,
        page,
        pageSize,
      })
    }

    const { prisma } = await import('@/lib/prisma')
    const delegate = (
      prisma as unknown as {
        cDSSAuditLog?: {
          findMany: (args: unknown) => Promise<AuditRow[]>
          count: (args: unknown) => Promise<number>
        }
      }
    ).cDSSAuditLog

    if (!delegate) {
      return NextResponse.json({
        ok: true,
        entries: [],
        total: 0,
        page,
        pageSize,
      })
    }

    const where = {
      metadata: { path: ['userId'], equals: username },
    }

    const [rows, total] = await Promise.all([
      delegate.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          timestamp: true,
          action: true,
          validationStatus: true,
          metadata: true,
          outputSummary: true,
        },
      }),
      delegate.count({ where }),
    ])

    const entries = (rows as AuditRow[]).map(row => {
      const meta = row.metadata as Record<string, unknown> | null
      const output = row.outputSummary as Record<string, unknown> | null
      return {
        id: row.id,
        action: row.action,
        endpoint: (meta?.endpoint as string) || (output?.endpoint as string) || '-',
        result: row.validationStatus,
        timestamp: row.timestamp,
      }
    })

    return NextResponse.json({ ok: true, entries, total, page, pageSize })
  } catch {
    return NextResponse.json({ ok: false, error: 'Gagal memuat logbook.' }, { status: 500 })
  }
}
