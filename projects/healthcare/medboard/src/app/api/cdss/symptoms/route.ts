// Drferdi — vision, brought to life.
/**
 * GET /api/cdss/symptoms
 * Kembalikan daftar semua gejala unik dari KB untuk autocomplete.
 * Di-cache oleh Next.js (static response).
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const revalidate = 3600 // cache 1 jam

interface PenyakitEntry {
  gejala?: string[]
  gejala_klinis?: string[]
}

export function GET() {
  try {
    const raw = readFileSync(join(process.cwd(), 'public', 'data', 'penyakit.json'), 'utf-8')
    const db = JSON.parse(raw) as { penyakit: PenyakitEntry[] }

    const seen = new Set<string>()
    const symptoms: string[] = []

    for (const d of db.penyakit ?? []) {
      for (const g of (d.gejala ?? d.gejala_klinis ?? [])) {
        const clean = g.trim()
        if (clean && !seen.has(clean.toLowerCase())) {
          seen.add(clean.toLowerCase())
          symptoms.push(clean)
        }
      }
    }

    return NextResponse.json({ symptoms, total: symptoms.length })
  } catch {
    return NextResponse.json({ symptoms: [], total: 0 })
  }
}
