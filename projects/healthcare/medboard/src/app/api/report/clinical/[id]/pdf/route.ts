// Drferdi — vision, brought to life.
import 'server-only'

import { existsSync } from 'fs'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { NextResponse } from 'next/server'
import { join } from 'path'
import { renderClinicalReportHtml } from '@/lib/report/clinical-report'
import {
  findClinicalReportById,
  markClinicalReportPdfGenerated,
  REPORTS_PDF_DIR,
} from '@/lib/report/clinical-report-store'
import { isCrewAuthorizedRequest } from '@/lib/server/crew-access-auth'

export const runtime = 'nodejs'

async function ensurePdfDir(): Promise<void> {
  if (!existsSync(REPORTS_PDF_DIR)) {
    await mkdir(REPORTS_PDF_DIR, { recursive: true })
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  if (!isCrewAuthorizedRequest(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const report = await findClinicalReportById(id)
  if (!report) {
    return NextResponse.json({ ok: false, error: 'Report tidak ditemukan' }, { status: 404 })
  }

  await ensurePdfDir()
  const pdfPath = join(REPORTS_PDF_DIR, `${id}.pdf`)

  if (existsSync(pdfPath)) {
    const fileBuffer = await readFile(pdfPath)
    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${id}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  }

  try {
    const { chromium } = await import('playwright')
    const browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()
    await page.setContent(renderClinicalReportHtml(report), {
      waitUntil: 'networkidle',
    })
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '12mm',
        right: '10mm',
        bottom: '12mm',
        left: '10mm',
      },
    })
    await browser.close()

    await writeFile(pdfPath, pdfBuffer)
    await markClinicalReportPdfGenerated(id, pdfPath)

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${id}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Gagal membuat PDF',
      },
      { status: 500 }
    )
  }
}
