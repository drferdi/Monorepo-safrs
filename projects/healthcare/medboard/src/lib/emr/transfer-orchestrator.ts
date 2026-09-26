/**
 * Sentra EMR Auto-Fill Engine — Transfer Orchestrator
 * Ported dari assist/lib/rme/transfer-orchestrator.ts
 *
 * Adaptasi: Tidak ada message passing (Extension), langsung panggil handlers.
 * Diagnosis engine TIDAK diport — Chief sedang menulis engine baru.
 */

import type { Page } from 'playwright'
import { fillAnamnesa } from './handlers/anamnesa'
import { fillDiagnosa } from './handlers/diagnosa'
import { fillResep } from './handlers/resep'
import type {
  AnamnesaFillPayload,
  DiagnosaFillPayload,
  ResepFillPayload,
  RMETransferPayload,
  RMETransferProgressEvent,
  RMETransferReasonCode,
  RMETransferResult,
  RMETransferState,
  RMETransferStepResult,
  RMETransferStepStatus,
} from './types'

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_DEDUPE_WINDOW_MS = 7000
const DEFAULT_TIMEOUT_MS: Record<RMETransferStepStatus, number> = {
  anamnesa: 45000,
  diagnosa: 18000,
  resep: 30000,
}
const DEFAULT_RETRY_BY_STEP: Record<RMETransferStepStatus, number> = {
  anamnesa: 1,
  diagnosa: 1,
  resep: 1,
}
const DEFAULT_RETRY_DELAY_MS = 900
const DEFAULT_STEP_ORDER: RMETransferStepStatus[] = ['anamnesa', 'diagnosa', 'resep']

// ============================================================================
// HELPERS
// ============================================================================

function nowIso(): string {
  return new Date().toISOString()
}

function createStepResult(step: RMETransferStepStatus): RMETransferStepResult {
  return {
    step,
    state: 'pending',
    attempt: 0,
    latencyMs: 0,
    successCount: 0,
    failedCount: 0,
    skippedCount: 0,
  }
}

function createInitialSteps(): Record<RMETransferStepStatus, RMETransferStepResult> {
  return {
    anamnesa: createStepResult('anamnesa'),
    diagnosa: createStepResult('diagnosa'),
    resep: createStepResult('resep'),
  }
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b)
  )
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`
}

function hashString(value: string): string {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
  }
  return `fp-${(hash >>> 0).toString(16)}`
}

function resolveResultState(
  steps: Record<RMETransferStepStatus, RMETransferStepResult>
): RMETransferState {
  const values = Object.values(steps)
  if (values.some(s => s.state === 'cancelled')) return 'cancelled'
  if (values.some(s => s.state === 'failed')) {
    return values.some(s => s.state === 'success' || s.state === 'partial') ? 'partial' : 'failed'
  }
  if (values.some(s => s.state === 'partial' || s.state === 'skipped')) return 'partial'
  return 'success'
}

function resolveStepOrder(
  startFromStep?: RMETransferStepStatus,
  onlyStep?: RMETransferStepStatus
): RMETransferStepStatus[] {
  if (onlyStep) return [onlyStep]
  if (!startFromStep) return DEFAULT_STEP_ORDER
  const idx = DEFAULT_STEP_ORDER.indexOf(startFromStep)
  return idx >= 0 ? DEFAULT_STEP_ORDER.slice(idx) : DEFAULT_STEP_ORDER
}

async function withTimeout<T>(task: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Step timeout after ${timeoutMs}ms`)), timeoutMs)
  })
  try {
    return await Promise.race([task, timeout])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ============================================================================
// STEP EXECUTOR — calls Playwright handlers directly
// ============================================================================

async function executeStep(
  page: Page,
  step: RMETransferStepStatus,
  payload: AnamnesaFillPayload | DiagnosaFillPayload | ResepFillPayload
): Promise<{
  success: boolean
  filledFields: string[]
  failedFields: string[]
}> {
  switch (step) {
    case 'anamnesa':
      return fillAnamnesa(page, payload as AnamnesaFillPayload)
    case 'diagnosa':
      return fillDiagnosa(page, payload as DiagnosaFillPayload)
    case 'resep': {
      const r = await fillResep(page, payload as ResepFillPayload)
      return {
        success: r.success,
        filledFields: Array.from({ length: r.filledRows }, (_, i) => `row_${i}`),
        failedFields: r.failedRows.map(fr => `row_${fr.index}:${fr.nama_obat}`),
      }
    }
  }
}

function normalizeHandlerResult(raw: {
  success: boolean
  filledFields: string[]
  failedFields: string[]
}) {
  return {
    successCount: raw.filledFields.length,
    failedCount: raw.failedFields.length,
    skippedCount: 0,
    errors: raw.failedFields,
  }
}

// ============================================================================
// ORCHESTRATOR CLASS
// ============================================================================

export interface RMETransferRunOptions {
  now?: () => number
  dedupeWindowMs?: number
  timeoutMs?: Partial<Record<RMETransferStepStatus, number>>
  retryByStep?: Partial<Record<RMETransferStepStatus, number>>
  retryDelayMs?: number
  onProgress?: (event: RMETransferProgressEvent) => void
  onStepFinal?: (step: RMETransferStepResult) => void | Promise<void>
}

export class RMETransferOrchestrator {
  private readonly recentFingerprints = new Map<string, { runId: string; timestampMs: number }>()
  private readonly activeRuns = new Map<string, { fingerprint: string; cancelled: boolean }>()

  cancelRun(runId: string): boolean {
    const run = this.activeRuns.get(runId)
    if (!run) return false
    run.cancelled = true
    return true
  }

  private isCancelled(runId: string): boolean {
    return this.activeRuns.get(runId)?.cancelled === true
  }

  private emitProgress(
    onProgress: RMETransferRunOptions['onProgress'],
    payload: Omit<RMETransferProgressEvent, 'updatedAt'>
  ): void {
    if (!onProgress) return
    onProgress({ ...payload, updatedAt: nowIso() })
  }

  private pruneFingerprints(nowMs: number, windowMs: number): void {
    for (const [fp, item] of this.recentFingerprints.entries()) {
      if (nowMs - item.timestampMs > windowMs * 2) this.recentFingerprints.delete(fp)
    }
  }

  async run(
    page: Page,
    transferPayload: RMETransferPayload,
    options: RMETransferRunOptions = {}
  ): Promise<RMETransferResult> {
    const now = options.now || (() => Date.now())
    const startedMs = now()
    const startedAt = new Date(startedMs).toISOString()
    const dedupeWindowMs =
      transferPayload.options?.idempotencyWindowMs ||
      options.dedupeWindowMs ||
      DEFAULT_DEDUPE_WINDOW_MS
    const fingerprint = hashString(
      stableStringify({
        startFromStep: transferPayload.options?.startFromStep || 'anamnesa',
        onlyStep: transferPayload.options?.onlyStep || null,
        anamnesa: transferPayload.anamnesa,
        diagnosa: transferPayload.diagnosa || null,
        resep: transferPayload.resep
          ? {
              ...transferPayload.resep,
              static: {
                ...transferPayload.resep.static,
                no_resep: '__stable__',
              },
            }
          : null,
      })
    )
    const runId =
      transferPayload.options?.requestId ||
      `rme-${startedMs}-${Math.random().toString(36).slice(2, 8)}`
    const steps = createInitialSteps()
    const reasonCodes = new Set<RMETransferReasonCode>(transferPayload.meta?.reasonCodes || [])

    this.pruneFingerprints(startedMs, dedupeWindowMs)
    const latest = this.recentFingerprints.get(fingerprint)
    const isDuplicate =
      !transferPayload.options?.forceRun &&
      latest &&
      startedMs - latest.timestampMs < dedupeWindowMs

    if (isDuplicate) {
      reasonCodes.add('DUPLICATE_SUPPRESSED')
      return {
        runId,
        fingerprint,
        state: 'failed',
        startedAt,
        completedAt: nowIso(),
        totalLatencyMs: 0,
        reasonCodes: Array.from(reasonCodes),
        steps,
      }
    }

    this.activeRuns.set(runId, { fingerprint, cancelled: false })
    this.emitProgress(options.onProgress, {
      runId,
      state: 'running',
      transferState: 'partial',
      steps,
      reasonCodes: Array.from(reasonCodes),
    })

    const stepOrder = resolveStepOrder(
      transferPayload.options?.startFromStep,
      transferPayload.options?.onlyStep
    )
    const timeoutMs = { ...DEFAULT_TIMEOUT_MS, ...(options.timeoutMs || {}) }
    const retryByStep = {
      ...DEFAULT_RETRY_BY_STEP,
      ...(options.retryByStep || {}),
    }
    const retryDelayMs = options.retryDelayMs || DEFAULT_RETRY_DELAY_MS

    for (const step of stepOrder) {
      if (this.isCancelled(runId)) {
        steps[step] = {
          ...steps[step],
          state: 'cancelled',
          reasonCode: 'USER_CANCELLED',
          errorClass: 'fatal',
          message: 'Transfer dibatalkan',
        }
        reasonCodes.add('USER_CANCELLED')
        break
      }

      const payload = transferPayload[step]
      if (!payload) {
        const rc: RMETransferReasonCode =
          step === 'diagnosa' ? 'DIAGNOSA_PAYLOAD_EMPTY' : 'RESEP_PAYLOAD_EMPTY'
        steps[step] = {
          ...steps[step],
          state: 'skipped',
          reasonCode: rc,
          errorClass: 'recoverable',
          message: `Payload ${step} kosong`,
        }
        reasonCodes.add(rc)
        this.emitProgress(options.onProgress, {
          runId,
          state: 'running',
          transferState: resolveResultState(steps),
          activeStep: step,
          steps,
          reasonCodes: Array.from(reasonCodes),
        })
        continue
      }

      const maxRetries = Math.max(0, retryByStep[step] ?? 1)
      let stepResult: RMETransferStepResult | null = null

      for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        if (this.isCancelled(runId)) {
          steps[step] = {
            ...steps[step],
            state: 'cancelled',
            attempt,
            reasonCode: 'USER_CANCELLED',
            errorClass: 'fatal',
          }
          reasonCodes.add('USER_CANCELLED')
          break
        }

        steps[step] = { ...steps[step], state: 'running', attempt }
        this.emitProgress(options.onProgress, {
          runId,
          state: 'running',
          transferState: resolveResultState(steps),
          activeStep: step,
          steps,
          reasonCodes: Array.from(reasonCodes),
        })

        const startedStepMs = now()
        try {
          const raw = await withTimeout(executeStep(page, step, payload), timeoutMs[step] ?? 30000)
          const normalized = normalizeHandlerResult(raw)
          const latencyMs = now() - startedStepMs

          if (normalized.successCount > 0 && normalized.failedCount === 0) {
            stepResult = {
              step,
              state: 'success',
              attempt,
              latencyMs,
              successCount: normalized.successCount,
              failedCount: 0,
              skippedCount: 0,
            }
            break
          }
          if (normalized.successCount > 0) {
            stepResult = {
              step,
              state: 'partial',
              attempt,
              latencyMs,
              successCount: normalized.successCount,
              failedCount: normalized.failedCount,
              skippedCount: 0,
              reasonCode: 'NO_FIELDS_FILLED',
              errorClass: 'recoverable',
              message: normalized.errors[0],
            }
            break
          }

          if (attempt > maxRetries) {
            stepResult = {
              step,
              state: 'failed',
              attempt,
              latencyMs,
              successCount: 0,
              failedCount: Math.max(1, normalized.failedCount),
              skippedCount: 0,
              reasonCode: 'RETRY_EXHAUSTED',
              errorClass: 'recoverable',
              message: normalized.errors[0] || 'Step gagal',
            }
            reasonCodes.add('RETRY_EXHAUSTED')
            break
          }
        } catch (error) {
          const latencyMs = now() - startedStepMs
          const message = error instanceof Error ? error.message : String(error)
          const isTimeout = message.includes('timeout')
          if (attempt > maxRetries) {
            stepResult = {
              step,
              state: 'failed',
              attempt,
              latencyMs,
              successCount: 0,
              failedCount: 1,
              skippedCount: 0,
              reasonCode: isTimeout ? 'STEP_TIMEOUT' : 'RETRY_EXHAUSTED',
              errorClass: 'recoverable',
              message,
            }
            reasonCodes.add(isTimeout ? 'STEP_TIMEOUT' : 'RETRY_EXHAUSTED')
            break
          }
        }

        await wait(retryDelayMs * attempt)
      }

      if (!stepResult) {
        stepResult = {
          ...steps[step],
          state: 'failed',
          reasonCode: 'UNKNOWN_STEP_FAILURE',
          errorClass: 'fatal',
          message: 'Step gagal',
        }
        reasonCodes.add('UNKNOWN_STEP_FAILURE')
      }

      steps[step] = stepResult
      await options.onStepFinal?.(stepResult)
      this.emitProgress(options.onProgress, {
        runId,
        state: 'running',
        transferState: resolveResultState(steps),
        activeStep: step,
        steps,
        reasonCodes: Array.from(reasonCodes),
      })
    }

    const completedAt = nowIso()
    const totalLatencyMs = Math.max(0, now() - startedMs)
    const transferState = resolveResultState(steps)

    this.activeRuns.delete(runId)
    this.recentFingerprints.set(fingerprint, { runId, timestampMs: now() })

    const finalResult: RMETransferResult = {
      runId,
      fingerprint,
      state: transferState,
      startedAt,
      completedAt,
      totalLatencyMs,
      reasonCodes: Array.from(reasonCodes),
      steps,
    }
    this.emitProgress(options.onProgress, {
      runId,
      state: transferState === 'cancelled' ? 'cancelled' : 'completed',
      transferState,
      steps,
      reasonCodes: finalResult.reasonCodes,
    })

    return finalResult
  }
}
