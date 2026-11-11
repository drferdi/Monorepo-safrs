
import fs from 'node:fs'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { isCrewAuthorizedRequest } from '@/lib/server/crew-access-auth'
import { resolveRuntimeDataFile } from '@/lib/server/runtime-data-path'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  if (!isCrewAuthorizedRequest(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const outputDir = resolveRuntimeDataFile('lb1-output')

  if (!fs.existsSync(outputDir)) {
    return NextResponse.json({ ok: true, files: [], outputDir })
  }

  const entries = fs.readdirSync(outputDir)
  const files = entries
    .filter(f => (f.startsWith('LB1_') || f.startsWith('REGIS_')) && f.endsWith('.xlsx'))
    .map(f => {
      const fullPath = path.join(outputDir, f)
      const stat = fs.statSync(fullPath)
      return {
        name: f,
        path: fullPath,
        sizeKb: Math.round(stat.size / 1024),
        generatedAt: stat.mtime.toISOString(),
      }
    })
    .sort((a, b) => b.name.localeCompare(a.name))

  return NextResponse.json({ ok: true, files, outputDir })
}
