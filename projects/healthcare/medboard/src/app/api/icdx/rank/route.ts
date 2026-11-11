import 'server-only'
import { NextResponse } from 'next/server'

import { pickBestIcd } from '@/lib/icd/ai-pick'
import { icdCandidates } from '@/lib/icd/dynamic-db'
import { isCrewAuthorizedRequest } from '@/lib/server/crew-access-auth'

export const runtime = 'nodejs'

const CODE = /^[A-Z]\d{2}(\.\d{1,2})?$/

/**
 * @summary AI picks the best ICD-10 codes among the search results.
 * @description Signed-in crew only. Takes the typed text and up to 30 result codes; names come from
 * the server's own catalogue, never from the request. Answers at most three codes from that list.
 */
export async function POST(request: Request) {
  if (!isCrewAuthorizedRequest(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Permintaan tidak terbaca.' }, { status: 400 })
  }
  const query = body && typeof body === 'object' && 'query' in body && typeof body.query === 'string' ? body.query : ''
  const codes =
    body && typeof body === 'object' && 'codes' in body && Array.isArray(body.codes)
      ? body.codes.filter((code): code is string => typeof code === 'string' && CODE.test(code.trim().toUpperCase()))
      : []
  if (!query.trim() || codes.length === 0) {
    return NextResponse.json({ ok: false, error: 'Teks dan daftar kode wajib diisi.' }, { status: 400 })
  }

  const result = await pickBestIcd(query, icdCandidates(codes.slice(0, 30)))
  return NextResponse.json({ ok: true, ...result })
}
