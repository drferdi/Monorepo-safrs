// Drferdi — vision, brought to life.
import 'server-only'

import type { NextRequest } from 'next/server'

import { getTransferStatus } from '../run/route'

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

  const transferId = req.nextUrl.searchParams.get('transferId')
  if (!transferId) {
    return jsonWithCors(req, CORS_METHODS, { error: 'transferId diperlukan' }, { status: 400 })
  }

  const status = getTransferStatus(transferId)
  if (!status) {
    return jsonWithCors(req, CORS_METHODS, { error: 'Transfer tidak ditemukan' }, { status: 404 })
  }

  return jsonWithCors(req, CORS_METHODS, { transferId, ...status })
}
