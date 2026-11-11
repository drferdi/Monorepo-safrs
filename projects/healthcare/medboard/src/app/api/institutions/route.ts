import { NextResponse } from 'next/server'
import { getInstitutionNames } from '@/lib/server/crew-access-institutions'

export const runtime = 'nodejs'

/** Public endpoint — returns institution names for registration form */
export async function GET() {
  try {
    const names = getInstitutionNames()
    return NextResponse.json({ ok: true, institutions: names })
  } catch (error) {
    console.error('[Institutions] Failed to list:', error)
    return NextResponse.json({ ok: true, institutions: [] })
  }
}
