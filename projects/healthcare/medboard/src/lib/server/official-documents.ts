import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { OFFICIAL_DOCUMENTS } from '@/lib/hub/organisation'
import { getCrewSessionFromRequest } from '@/lib/server/crew-access-auth'

// Kept out of git; each server is given the PDFs by hand (see OFFICIAL_DOCUMENTS).
export const OFFICIAL_DOCUMENTS_DIR = path.join(process.cwd(), 'runtime', 'organisation-documents')

// Only a signed-in person may download: the automation token is not enough, because two of the
// documents carry the founder's personal data. The id must be one of the listed documents, so a
// request can never name a path of its own.
export async function serveOfficialDocument(
  request: Request,
  id: string,
  dir: string = OFFICIAL_DOCUMENTS_DIR
): Promise<Response> {
  if (!getCrewSessionFromRequest(request)) {
    return Response.json({ ok: false, error: 'Masuk dulu untuk mengunduh dokumen.' }, { status: 401 })
  }

  const doc = OFFICIAL_DOCUMENTS.find((candidate) => candidate.id === id)
  if (!doc) return Response.json({ ok: false, error: 'Dokumen tidak ditemukan.' }, { status: 404 })

  let bytes: Buffer
  try {
    bytes = await readFile(path.join(dir, doc.file))
  } catch {
    return Response.json({ ok: false, error: 'Dokumen belum tersedia di server ini.' }, { status: 404 })
  }

  return new Response(new Uint8Array(bytes), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="${doc.file}"`,
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
    },
  })
}
