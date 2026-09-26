import 'server-only'

import { type NextRequest, NextResponse } from 'next/server'
import { readEMRHistory } from '@/lib/emr/history'
import { handleCorsPreflight, jsonWithCors } from '@/lib/server/api-cors'
import { isCrewAuthorizedRequest } from '@/lib/server/crew-access-auth'

const CORS_METHODS = ['GET', 'OPTIONS'] as const

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request, CORS_METHODS)
}

export async function GET(req: NextRequest) {
  if (!isCrewAuthorizedRequest(req)) {
    return jsonWithCors(req, CORS_METHODS, { error: 'Unauthorized' }, { status: 401 })
  }

  const limit = Math.min(100, Number.parseInt(req.nextUrl.searchParams.get('limit') || '20', 10))

  const history = await readEMRHistory(limit)
  return jsonWithCors(req, CORS_METHODS, { history, count: history.length })
}
