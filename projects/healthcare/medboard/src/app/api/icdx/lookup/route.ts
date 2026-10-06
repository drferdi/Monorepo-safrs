import 'server-only'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// ── Route Handler ──────────────────────────────────────────────────────────────

/**
 * @summary Search and lookup ICD-10 codes with hybrid intelligence.
 * @description
 * High-performance lookup covering:
 * 1. Local Indonesian database (penyakit.json) for 171 common KKI diseases.
 * 2. PCare Mapping (BPJS compatibility).
 * 3. NLM ICD-10-CM online API (A-Z comprehensive coverage).
 * 
 * Includes version conversion logic to ensure compatibility between modern 
 * diagnostic codes and legacy 2010/2016 reporting standards.
 * 
 * @queryParam {string} q - The search query (disease name or partial code).
 * 
 * @example {
 *   "q": "Demam berdarah",
 *   "results": [
 *     { "code": "A91", "name": "Dengue haemorrhagic fever", "category": "CHAPTER A" }
 *   ]
 * }
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') ?? ''
    const { lookupDashboardIcd } = await import('@/lib/clinical-adapter/icd')
    const lookup = await lookupDashboardIcd(q)
    return NextResponse.json({ ok: true, ...lookup })
  } catch (error) {
    console.error('[ICDx]', error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to load ICD database',
      },
      { status: 500 }
    )
  }
}
