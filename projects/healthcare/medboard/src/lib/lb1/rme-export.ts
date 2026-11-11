// ─── RME Export: Login ke ePuskesmas + download Excel via Playwright ──────────
// Port dari Python app/automation/rme_export.py

import fs from 'node:fs'
import path from 'node:path'
import { resolveRuntimeDataFile } from '@/lib/server/runtime-data-path'
import type { RmeConfig } from './types'

// ─── Session State ─────────────────────────────────────────────────────────────

const DEFAULT_SESSION_PATH = 'runtime/rme-session.json'

interface SavedSession {
  saved_at: string
  expires_at: string
  ttl_hours: number
  base_url: string
  storage_state: object
}

function resolveRmeRuntimePath(rawPath: string, fallbackUnderRuntime: string): string {
  const normalized = String(rawPath ?? '').trim().replace(/\\/g, '/')
  if (!normalized) return resolveRuntimeDataFile(fallbackUnderRuntime)
  if (path.isAbsolute(normalized)) return normalized
  if (normalized.startsWith('runtime/')) {
    return resolveRuntimeDataFile(normalized.slice('runtime/'.length))
  }
  return resolveRuntimeDataFile(normalized)
}

function loadStoredSession(sessionPath: string): object | null {
  const absPath = resolveRmeRuntimePath(sessionPath, 'rme-session.json')
  if (!fs.existsSync(absPath)) return null
  try {
    const raw = JSON.parse(fs.readFileSync(absPath, 'utf-8')) as SavedSession
    if (!raw.storage_state || !raw.expires_at) return null
    const expiresAt = new Date(raw.expires_at).getTime()
    if (Date.now() > expiresAt) {
      console.warn(
        `[rme-export] Session expired (expired: ${raw.expires_at}). Jalankan save-rme-session.ps1 untuk login ulang.`
      )
      return null
    }
    const remainingMs = expiresAt - Date.now()
    const remainingHrs = (remainingMs / 3_600_000).toFixed(1)
    console.log(
      `[rme-export] Menggunakan stored session (valid ${remainingHrs} jam lagi, expires: ${raw.expires_at})`
    )
    return raw.storage_state
  } catch {
    return null
  }
}

// Format tanggal DD-MM-YYYY
function formatDate(d: Date, fmt: string): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = String(d.getFullYear())
  return fmt.replace('%d', dd).replace('%m', mm).replace('%Y', yyyy)
}

function buildExportParams(
  config: RmeConfig,
  periodYear: number,
  periodMonth: number
): Record<string, string> {
  const fromDate = new Date(periodYear, periodMonth - 1, 1)
  const toDate = new Date(periodYear, periodMonth - 1, 25)

  const context: Record<string, string> = {
    tgl_awal: formatDate(fromDate, config.export_date_format || '%d-%m-%Y'),
    tgl_akhir: formatDate(toDate, config.export_date_format || '%d-%m-%Y'),
    ruangan_id: config.poli_dewasa_id,
    status_periksa: config.status_periksa,
  }

  const params: Record<string, string> = {
    'search[dari_tanggal]': '{tgl_awal}',
    'search[sampai_tanggal]': '{tgl_akhir}',
    'search[ruangan_id]': '{ruangan_id}',
    'search[status_periksa]': '{status_periksa}',
    ...config.export_params,
  }

  const result: Record<string, string> = {}
  for (const [k, v] of Object.entries(params)) {
    result[k] = v.replace(/\{(\w+)\}/g, (_, key) => context[key] ?? v)
  }
  return result
}

function joinUrl(base: string, maybePath: string): string {
  if (maybePath.startsWith('http://') || maybePath.startsWith('https://')) return maybePath
  return base.replace(/\/$/, '') + '/' + maybePath.replace(/^\//, '')
}

function requireSelector(selectors: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    const val = (selectors[key] ?? '').trim()
    if (val) return val
  }
  throw new Error(`Missing selector. Required one of: ${keys.join(', ')}`)
}

function getUniqueOutputPath(downloadDir: string, fileName: string): string {
  const normalizedName = (fileName || '').replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim()
  const fallbackName = normalizedName || `rme_export_${Date.now()}.xlsx`

  const ext = path.extname(fallbackName) || '.xlsx'
  const base = path.basename(fallbackName, ext)
  let outputPath = path.join(downloadDir, fallbackName)
  if (!fs.existsSync(outputPath)) return outputPath

  const stamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15)
  let suffix = 1
  while (fs.existsSync(outputPath)) {
    outputPath = path.join(downloadDir, `${base}_${stamp}_${suffix}${ext}`)
    suffix++
  }
  return outputPath
}

// ─── Export via Playwright (async) ────────────────────────────────────────────

export async function exportRmeVisitData(
  config: RmeConfig,
  periodYear: number,
  periodMonth: number,
  downloadDir: string,
  evidenceDir: string = 'runtime/lb1-output/rpa'
): Promise<string> {
  if (!config.base_url?.trim()) throw new Error('RME base_url kosong.')

  const resolvedEvidenceDir = resolveRmeRuntimePath(
    evidenceDir,
    path.join('lb1-output', 'rpa')
  )

  fs.mkdirSync(downloadDir, { recursive: true })
  fs.mkdirSync(resolvedEvidenceDir, { recursive: true })

  // Lazy import playwright (tidak tersedia di semua env)
  const { chromium } = await import('playwright')

  const exportUrl = joinUrl(config.base_url, config.export_url)
  const exportParams = buildExportParams(config, periodYear, periodMonth)

  const retryCount = config.retry_count ?? 3
  const retryDelay = (config.retry_delay_seconds ?? 2) * 1000
  const timeout = config.timeout_ms ?? 45000

  // ── Coba load stored session (bypass login + CAPTCHA) ─────────────────────
  const sessionPath = config.session_path ?? DEFAULT_SESSION_PATH
  const storedSession = loadStoredSession(sessionPath)

  // ── Jika tidak ada session, pastikan credentials tersedia untuk login manual ─
  let username = ''
  let password = ''
  if (!storedSession) {
    username = process.env[config.username_env]?.trim() ?? ''
    password = process.env[config.password_env]?.trim() ?? ''
    if (!username || !password) {
      throw new Error(
        `Tidak ada stored session dan credentials kosong.\n` +
          `Opsi 1: Jalankan scripts/save-rme-session.ps1 untuk simpan session manual.\n` +
          `Opsi 2: Set env vars ${config.username_env} dan ${config.password_env} (tidak bisa bypass CAPTCHA).`
      )
    }
    console.log(
      '[rme-export] Tidak ada stored session — akan login via username/password (perlu no-CAPTCHA).'
    )
  }

  let lastError: Error = new Error('RME export gagal.')

  for (let attempt = 1; attempt <= retryCount; attempt++) {
    let browser = null
    try {
      browser = await chromium.launch({ headless: config.headless ?? true })

      // Buat context: gunakan storageState jika tersedia, kosong jika tidak
      const context = await browser.newContext(
        storedSession
          ? {
              acceptDownloads: true,
              storageState:
                storedSession as import('playwright').BrowserContextOptions['storageState'],
            }
          : { acceptDownloads: true }
      )
      const page = await context.newPage()
      page.setDefaultTimeout(timeout)

      if (!storedSession) {
        // ── Login manual jika tidak ada session ─────────────────────────────
        const loginTarget = joinUrl(config.base_url, config.login_url)
        const usernameSel = requireSelector(config.selectors, ['username_field', 'username'])
        const passwordSel = requireSelector(config.selectors, ['password_field', 'password'])
        const loginSel = requireSelector(config.selectors, ['login_button', 'submit_login'])

        await page.goto(loginTarget, { waitUntil: 'domcontentloaded' })
        await page.fill(usernameSel, username)
        await page.fill(passwordSel, password)
        await page.click(loginSel)

        if (config.post_login_wait_text?.trim()) {
          await page.getByText(config.post_login_wait_text).waitFor({ timeout })
        } else {
          await page.waitForTimeout(2000)
        }
      }

      // ── Navigasi ke URL export dengan params, tangkap download langsung ────
      // ePuskesmas langsung kirim file ketika session valid — tidak ada halaman HTML
      const fullUrlObj = new URL(exportUrl)
      for (const [k, v] of Object.entries(exportParams)) {
        fullUrlObj.searchParams.set(k, v)
      }

      // Race: tunggu download event, goto akan error "Download is starting" — itu normal
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout }),
        page.goto(fullUrlObj.toString(), { waitUntil: 'commit', timeout }).catch((err: Error) => {
          // "Download is starting" adalah expected behavior ketika server langsung kirim file
          if (!err.message.includes('Download is starting')) throw err
        }),
      ])

      // ── Simpan file ───────────────────────────────────────────────────────
      const suggestedName = download.suggestedFilename()
      const fileName = suggestedName?.trim()
        ? suggestedName
        : `rme_export_${periodYear}_${String(periodMonth).padStart(2, '0')}_01_25.xlsx`

      const outPath = getUniqueOutputPath(downloadDir, fileName)
      await download.saveAs(outPath)

      // ── Validasi — pastikan bukan HTML redirect ───────────────────────────
      const stat = fs.statSync(outPath)
      if (stat.size < 1000) {
        const preview = fs.readFileSync(outPath, 'utf-8').slice(0, 100).toLowerCase()
        if (preview.includes('<!doctype') || preview.includes('<html')) {
          fs.unlinkSync(outPath)
          throw new Error(
            'File yang didownload adalah HTML (session expired atau redirect login).\n' +
              'Jalankan scripts/save-rme-session.ps1 untuk memperbarui session.'
          )
        }
      }

      await context.close()
      await browser.close()

      writeEvidence(resolvedEvidenceDir, 'success', attempt, periodYear, periodMonth, outPath)
      return outPath
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      writeEvidence(
        resolvedEvidenceDir,
        'error',
        attempt,
        periodYear,
        periodMonth,
        '',
        lastError.message
      )
      if (browser) await browser.close().catch(() => null)
      if (attempt < retryCount) await new Promise(r => setTimeout(r, retryDelay))
    }
  }

  throw lastError
}

function writeEvidence(
  evidenceDir: string,
  status: string,
  attempt: number,
  periodYear: number,
  periodMonth: number,
  outputFile: string,
  errorMessage: string = ''
): void {
  const stamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15)
  const outFile = path.join(
    evidenceDir,
    `rme_${status}_${periodYear}_${String(periodMonth).padStart(2, '0')}_${stamp}_a${attempt}.json`
  )
  fs.writeFileSync(
    outFile,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        status,
        attempt,
        period_year: periodYear,
        period_month: periodMonth,
        output_file: outputFile,
        error_message: errorMessage,
      },
      null,
      2
    ),
    'utf-8'
  )
}
