
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

  const { searchParams } = new URL(request.url)
  const filename = searchParams.get('file')

  if (!filename || !filename.endsWith('.xlsx')) {
    return NextResponse.json({ ok: false, error: 'Nama file tidak valid' }, { status: 400 })
  }

  // Sanitasi: hanya izinkan nama file, tidak boleh ada path traversal
  const basename = path.basename(filename)
  if (basename !== filename) {
    return NextResponse.json({ ok: false, error: 'Nama file tidak valid' }, { status: 400 })
  }

  const outputDir = resolveRuntimeDataFile('lb1-output')
  const filePath = path.join(outputDir, basename)

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ ok: false, error: 'File tidak ditemukan' }, { status: 404 })
  }

  const buffer = fs.readFileSync(filePath)

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${basename}"`,
      'Content-Length': String(buffer.length),
      'Cache-Control': 'no-store',
    },
  })
}
