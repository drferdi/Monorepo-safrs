import 'server-only'
import { NextResponse } from 'next/server'

import { icdCodeDetail } from '@/lib/icd/dynamic-db'

export const runtime = 'nodejs'

/**
 * @summary One ICD-10 2010 code with its parent category and subcodes.
 * @queryParam {string} code - e.g. A00 or A00.1
 */
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get('code') ?? ''
  const detail = code.trim() ? icdCodeDetail(code) : null
  if (!detail) {
    return NextResponse.json({ ok: false, error: 'Kode tidak ada di ICD-10 2010.' }, { status: 404 })
  }
  return NextResponse.json({ ok: true, detail })
}
