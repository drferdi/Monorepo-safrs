/**
 * Sentra EMR Auto-Fill Engine — Main Entry Point
 * Pattern Playwright dari src/lib/lb1/rme-export.ts
 *
 * Flow:
 * 1. Buka browser (reuse storageState jika session valid < 30 menit)
 * 2. Login ke ePuskesmas jika belum authenticated
 * 3. Navigate ke halaman yang diperlukan
 * 4. Panggil RMETransferOrchestrator
 * 5. Emit progress via socket-bridge
 * 6. Tulis hasil ke history
 */

import 'server-only'

import fs from 'node:fs'
import path from 'node:path'
import { getEMRCredentials } from './config'
import { appendEMRHistory } from './history'
import { emitEMRProgress } from './socket-bridge'
import { RMETransferOrchestrator } from './transfer-orchestrator'
import { resolveRuntimeDataFile } from '@/lib/server/runtime-data-path'
import type {
  EMRProgressEvent,
  EMRTransferConfig,
  RMETransferPayload,
  RMETransferResult,
} from './types'

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

const SESSION_TTL_MS = 30 * 60 * 1000 // 30 minutes

interface SessionMeta {
  savedAt: number
  username: string
}

function getSessionMetaPath(storagePath: string): string {
  return storagePath.replace(/\.json$/, '.meta.json')
}

function isSessionValid(storagePath: string, username: string, ttlMs: number): boolean {
  try {
    if (!fs.existsSync(storagePath)) return false
    const metaPath = getSessionMetaPath(storagePath)
    if (!fs.existsSync(metaPath)) return false
    const meta: SessionMeta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
    if (meta.username !== username) return false
    return Date.now() - meta.savedAt < ttlMs
  } catch {
    return false
  }
}

function saveSessionMeta(storagePath: string, username: string): void {
  try {
    const metaPath = getSessionMetaPath(storagePath)
    const meta: SessionMeta = { savedAt: Date.now(), username }
    fs.mkdirSync(path.dirname(metaPath), { recursive: true })
    fs.writeFileSync(metaPath, JSON.stringify(meta), 'utf-8')
  } catch {
    // non-fatal
  }
}

// ============================================================================
// LOGIN HELPER
// ============================================================================

async function loginToEPuskesmas(
  page: import('playwright').Page,
  config: EMRTransferConfig,
  credentials: { username: string; password: string }
): Promise<void> {
  await page.goto(config.loginUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  })

  // Wait for login form
  await page.waitForSelector("input[name='email'], input[name='username']", {
    timeout: 10000,
  })

  // Fill credentials — read directly from env, never from config object
  const usernameSel = "input[name='email'], input[name='username']"
  const passwordSel = "input[name='password']"
  const submitSel = "button[type='submit'], input[type='submit']"

  await page.locator(usernameSel).first().fill(credentials.username)
  await page.locator(passwordSel).first().fill(credentials.password)
  await page.locator(submitSel).first().click()

  // Wait for redirect after login
  await page.waitForNavigation({
    waitUntil: 'domcontentloaded',
    timeout: 20000,
  })
}

// ============================================================================
// NAVIGATE TO EMR PAGE
// ============================================================================

async function navigateToEMRPage(
  page: import('playwright').Page,
  config: EMRTransferConfig,
  step: string,
  pelayananId?: string
): Promise<void> {
  const base = config.baseUrl.replace(/\/$/, '')
  let url: string

  switch (step) {
    case 'anamnesa':
      url = pelayananId ? `${base}/rajal/anamnesa/${pelayananId}` : `${base}/rajal/anamnesa`
      break
    case 'diagnosa':
      url = pelayananId ? `${base}/rajal/diagnosa/${pelayananId}` : `${base}/rajal/diagnosa`
      break
    case 'resep':
      url = pelayananId ? `${base}/rajal/resep/${pelayananId}` : `${base}/rajal/resep`
      break
    default:
      url = base
  }

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })
  await page.waitForTimeout(500)
}

// ============================================================================
// MAIN ENGINE
// ============================================================================

const orchestrator = new RMETransferOrchestrator()

export interface RunEMRTransferOptions {
  pelayananId?: string
  headless?: boolean
}

export async function runEMRTransfer(
  payload: RMETransferPayload,
  config: EMRTransferConfig,
  opts: RunEMRTransferOptions = {}
): Promise<RMETransferResult> {
  const transferId =
    payload.options?.requestId || `emr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const ttlMs = config.sessionTtlMs ?? SESSION_TTL_MS

  const emit = (
    step: EMRProgressEvent['step'],
    status: EMRProgressEvent['status'],
    message: string
  ) => {
    emitEMRProgress({
      transferId,
      step,
      status,
      message,
      timestamp: new Date().toISOString(),
    })
  }

  emit('init', 'running', 'Memulai EMR transfer...')

  // Lazy import playwright
  const { chromium } = await import('playwright')
  const headless = opts.headless ?? config.headless ?? true

  const sessionStoragePath = config.sessionStoragePath
    ? path.resolve(config.sessionStoragePath)
    : resolveRuntimeDataFile('emr-session.json')
  const credentials = getEMRCredentials()
  const hasValidSession = isSessionValid(sessionStoragePath, credentials.username, ttlMs)

  let browser: import('playwright').Browser | null = null
  let result: RMETransferResult | null = null

  try {
    browser = await chromium.launch({ headless })

    const contextOptions: import('playwright').BrowserContextOptions = {
      storageState: hasValidSession ? sessionStoragePath : undefined,
    }
    const context = await browser.newContext(contextOptions)
    const page = await context.newPage()
    page.setDefaultTimeout(45000)

    // Login if needed
    if (!hasValidSession) {
      emit('login', 'running', 'Login ke ePuskesmas...')
      await loginToEPuskesmas(page, config, credentials)

      // Save session state
      await context.storageState({ path: sessionStoragePath })
      saveSessionMeta(sessionStoragePath, credentials.username)
      emit('login', 'success', 'Login berhasil')
    } else {
      emit('login', 'success', 'Session valid, skip login')
    }

    // Navigate to anamnesa page first (initial)
    if (opts.pelayananId) {
      await navigateToEMRPage(page, config, 'anamnesa', opts.pelayananId)
    }

    // Run orchestrator
    result = await orchestrator.run(page, payload, {
      onProgress: event => {
        const step = event.activeStep ?? 'init'
        const status =
          event.state === 'running'
            ? 'running'
            : event.transferState === 'failed'
              ? 'failed'
              : 'success'
        emit(
          step,
          status,
          `Step ${step}: ${Object.values(event.steps).find(s => s.step === step)?.state ?? 'running'}`
        )
      },
      onStepFinal: async stepResult => {
        // Navigate to next page between steps
        if (
          opts.pelayananId &&
          (stepResult.state === 'success' || stepResult.state === 'partial')
        ) {
          const nextStepMap: Record<string, string> = {
            anamnesa: 'diagnosa',
            diagnosa: 'resep',
          }
          const nextStep = nextStepMap[stepResult.step]
          if (nextStep) {
            await navigateToEMRPage(page, config, nextStep, opts.pelayananId).catch(() => null)
          }
        }
      },
    })

    // Save updated session
    await context.storageState({ path: sessionStoragePath }).catch(() => null)
    await context.close()

    emit(
      'done',
      result.state === 'success' ? 'success' : 'failed',
      `Transfer selesai: ${result.state} (${result.totalLatencyMs}ms)`
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    emit('done', 'failed', `Transfer gagal: ${message}`)

    if (!result) {
      const steps = {
        anamnesa: {
          step: 'anamnesa' as const,
          state: 'failed' as const,
          attempt: 1,
          latencyMs: 0,
          successCount: 0,
          failedCount: 1,
          skippedCount: 0,
          message,
        },
        diagnosa: {
          step: 'diagnosa' as const,
          state: 'skipped' as const,
          attempt: 0,
          latencyMs: 0,
          successCount: 0,
          failedCount: 0,
          skippedCount: 1,
        },
        resep: {
          step: 'resep' as const,
          state: 'skipped' as const,
          attempt: 0,
          latencyMs: 0,
          successCount: 0,
          failedCount: 0,
          skippedCount: 1,
        },
      }
      result = {
        runId: transferId,
        fingerprint: 'error',
        state: 'failed',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        totalLatencyMs: 0,
        reasonCodes: ['UNKNOWN_STEP_FAILURE'],
        steps,
      }
    }
  } finally {
    if (browser) await browser.close().catch(() => null)
  }

  // Write history
  await appendEMRHistory({
    transferId,
    state: result?.state ?? 'failed',
    steps: Object.fromEntries(Object.entries(result?.steps ?? {}).map(([k, v]) => [k, v.state])),
    totalLatencyMs: result?.totalLatencyMs ?? 0,
    reasonCodes: result?.reasonCodes ?? [],
  }).catch(() => null)

  return result!
}

export { orchestrator }
