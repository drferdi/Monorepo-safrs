// Designed and constructed by Drferdi.
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
} from '@/utils/types';

type StepPayloadMap = {
  anamnesa: AnamnesaFillPayload;
  diagnosa: DiagnosaFillPayload;
  resep: ResepFillPayload;
};

interface NormalizedStepExecution {
  successCount: number;
  failedCount: number;
  skippedCount: number;
  errors: string[];
}

/**
 * RMETransferStepExecutor type
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-03-12
 */

export type RMETransferStepExecutor = <TStep extends RMETransferStepStatus>(
  step: TStep,
  payload: StepPayloadMap[TStep]
) => Promise<unknown>;

/**
 * RMETransferRunOptions interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-03-12
 */

export interface RMETransferRunOptions {
  now?: () => number;
  dedupeWindowMs?: number;
  timeoutMs?: Partial<Record<RMETransferStepStatus, number>>;
  retryByStep?: Partial<Record<RMETransferStepStatus, number>>;
  retryDelayMs?: number;
  onProgress?: (event: RMETransferProgressEvent) => void;
  onStepFinal?: (step: RMETransferStepResult) => void | Promise<void>;
}

const DEFAULT_DEDUPE_WINDOW_MS = 7000;
const DEFAULT_TIMEOUT_MS: Record<RMETransferStepStatus, number> = {
  anamnesa: 45000,
  diagnosa: 18000,
  resep: 30000,
};
const DEFAULT_RETRY_BY_STEP: Record<RMETransferStepStatus, number> = {
  anamnesa: 1,
  diagnosa: 1,
  resep: 1,
};
const DEFAULT_RETRY_DELAY_MS = 900;
const DEFAULT_STEP_ORDER: RMETransferStepStatus[] = ['anamnesa', 'diagnosa', 'resep'];

function nowIso(): string {
  return new Date().toISOString();
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
  };
}

function createInitialSteps(): Record<RMETransferStepStatus, RMETransferStepResult> {
  return {
    anamnesa: createStepResult('anamnesa'),
    diagnosa: createStepResult('diagnosa'),
    resep: createStepResult('resep'),
  };
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b)
  );
  return `{${entries.map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`).join(',')}}`;
}

function hashString(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return `fp-${(hash >>> 0).toString(16)}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function unwrapExecutionResponse(raw: unknown): unknown {
  const direct = asRecord(raw);
  if (!direct) return raw;

  const envelopeCandidates = ['res', 'result', 'data', 'payload'] as const;
  for (const key of envelopeCandidates) {
    const nested = asRecord(direct[key]);
    if (nested) return nested;
  }
  return raw;
}

function isSkippableFailureMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('readonly') ||
    normalized.includes('read only') ||
    normalized.includes('disabled') ||
    normalized.includes('csrf') ||
    normalized.includes('protected')
  );
}

function normalizeExecutionResult(raw: unknown): NormalizedStepExecution {
  const unwrappedRaw = unwrapExecutionResponse(raw);
  if (!unwrappedRaw || typeof unwrappedRaw !== 'object') {
    return {
      successCount: 0,
      failedCount: 1,
      skippedCount: 0,
      errors: ['Invalid step response'],
    };
  }

  const candidate = unwrappedRaw as Record<string, unknown>;
  const successItems = Array.isArray(candidate.success) ? candidate.success : [];
  const failedItems = Array.isArray(candidate.failed) ? candidate.failed : [];
  const skippedItems = Array.isArray(candidate.skipped) ? candidate.skipped : [];
  const errors: string[] = [];
  let skippedFromFailed = 0;

  for (const item of failedItems) {
    if (typeof item === 'string' && item.trim()) {
      const normalizedError = item.trim();
      if (isSkippableFailureMessage(normalizedError)) {
        skippedFromFailed += 1;
      } else {
        errors.push(normalizedError);
      }
      continue;
    }
    if (item && typeof item === 'object' && 'error' in item) {
      const errorValue = (item as { error?: unknown }).error;
      if (typeof errorValue === 'string' && errorValue.trim()) {
        const normalizedError = errorValue.trim();
        if (isSkippableFailureMessage(normalizedError)) {
          skippedFromFailed += 1;
        } else {
          errors.push(normalizedError);
        }
      }
      continue;
    }
    if (item && typeof item === 'object' && 'message' in item) {
      const messageValue = (item as { message?: unknown }).message;
      if (typeof messageValue === 'string' && messageValue.trim()) {
        const normalizedMessage = messageValue.trim();
        if (isSkippableFailureMessage(normalizedMessage)) {
          skippedFromFailed += 1;
        } else {
          errors.push(normalizedMessage);
        }
      }
    }
  }

  if (typeof candidate.error === 'string' && candidate.error.trim()) {
    errors.push(candidate.error.trim());
  }
  if (typeof candidate.message === 'string' && candidate.message.trim()) {
    errors.push(candidate.message.trim());
  }
  if (Array.isArray(candidate.errors)) {
    for (const item of candidate.errors) {
      if (typeof item === 'string' && item.trim()) {
        errors.push(item.trim());
      }
    }
  }

  let successCount = successItems.length;
  let failedCount = Math.max(0, failedItems.length - skippedFromFailed);
  let skippedCount = skippedItems.length + skippedFromFailed;

  if (
    successCount === 0 &&
    failedCount === 0 &&
    skippedCount === 0 &&
    typeof candidate.success === 'boolean'
  ) {
    if (candidate.success) {
      successCount = 1;
    } else {
      failedCount = 1;
    }
  }

  if (successCount === 0 && failedCount === 0 && skippedCount === 0 && errors.length > 0) {
    failedCount = 1;
  }

  if (successCount === 0 && failedCount > 0 && errors.length > 0) {
    const nonSkippable = errors.filter((message) => !isSkippableFailureMessage(message));
    if (nonSkippable.length === 0) {
      skippedCount += failedCount;
      failedCount = 0;
      errors.length = 0;
    } else if (nonSkippable.length !== errors.length) {
      errors.length = 0;
      errors.push(...nonSkippable);
      const downgradedCount = failedCount - nonSkippable.length;
      if (downgradedCount > 0) {
        skippedCount += downgradedCount;
      }
      failedCount = nonSkippable.length;
    }
  }

  if (successCount === 0 && failedCount === 0 && skippedCount === 0 && errors.length === 0) {
    return {
      successCount: 0,
      failedCount: 1,
      skippedCount: 0,
      errors: ['No fields were filled by handler'],
    };
  }

  return { successCount, failedCount, skippedCount, errors };
}

function classifyFailure(message: string): {
  reasonCode: RMETransferReasonCode;
  recoverable: boolean;
} {
  const normalized = message.toLowerCase();

  if (normalized.includes('cancel')) {
    return { reasonCode: 'USER_CANCELLED', recoverable: false };
  }
  if (normalized.includes('timeout')) {
    return { reasonCode: 'STEP_TIMEOUT', recoverable: true };
  }
  if (
    normalized.includes('receiving end does not exist') ||
    normalized.includes('no content-script receiver') ||
    normalized.includes('belum siap')
  ) {
    return { reasonCode: 'PAGE_NOT_READY', recoverable: true };
  }
  if (normalized.includes('no active tab')) {
    return { reasonCode: 'NO_ACTIVE_TAB', recoverable: true };
  }
  if (
    normalized.includes('not found') ||
    normalized.includes('no fields found') ||
    normalized.includes('input not found') ||
    normalized.includes('tidak ditemukan')
  ) {
    return { reasonCode: 'FIELD_NOT_FOUND', recoverable: true };
  }
  if (normalized.includes('no fields were filled')) {
    return { reasonCode: 'NO_FIELDS_FILLED', recoverable: true };
  }
  if (isSkippableFailureMessage(normalized)) {
    return { reasonCode: 'NO_FIELDS_FILLED', recoverable: false };
  }
  return { reasonCode: 'UNKNOWN_STEP_FAILURE', recoverable: false };
}

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function withTimeout<T>(task: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Step timeout after ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([task, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function resolveResultState(
  steps: Record<RMETransferStepStatus, RMETransferStepResult>
): RMETransferState {
  const values = Object.values(steps);
  if (values.some((step) => step.state === 'cancelled')) return 'cancelled';
  if (values.some((step) => step.state === 'failed')) {
    const hasSuccessLike = values.some(
      (step) => step.state === 'success' || step.state === 'partial'
    );
    return hasSuccessLike ? 'partial' : 'failed';
  }
  if (values.some((step) => step.state === 'partial' || step.state === 'skipped')) return 'partial';
  return 'success';
}

function resolveStepOrder(
  startFromStep?: RMETransferStepStatus,
  onlyStep?: RMETransferStepStatus
): RMETransferStepStatus[] {
  if (onlyStep) return [onlyStep];
  if (!startFromStep) return DEFAULT_STEP_ORDER;
  const startIndex = DEFAULT_STEP_ORDER.indexOf(startFromStep);
  if (startIndex < 0) return DEFAULT_STEP_ORDER;
  return DEFAULT_STEP_ORDER.slice(startIndex);
}

/**
 * RMETransferOrchestrator class
 *
 * @remarks
 * TODO: Add class description and usage examples
 * Auto-generated on 2026-03-12
 */

export class RMETransferOrchestrator {
  private readonly recentFingerprints = new Map<string, { runId: string; timestampMs: number }>();
  private readonly activeRuns = new Map<string, { fingerprint: string; cancelled: boolean }>();

  cancelRun(runId: string): boolean {
    const run = this.activeRuns.get(runId);
    if (!run) return false;
    run.cancelled = true;
    return true;
  }

  private emitProgress(
    onProgress: RMETransferRunOptions['onProgress'],
    payload: Omit<RMETransferProgressEvent, 'updatedAt'>
  ): void {
    if (!onProgress) return;
    onProgress({
      ...payload,
      updatedAt: nowIso(),
    });
  }

  private isCancelled(runId: string): boolean {
    return this.activeRuns.get(runId)?.cancelled === true;
  }

  private pruneFingerprints(nowMs: number, dedupeWindowMs: number): void {
    for (const [fingerprint, item] of this.recentFingerprints.entries()) {
      if (nowMs - item.timestampMs > dedupeWindowMs * 2) {
        this.recentFingerprints.delete(fingerprint);
      }
    }
  }

  async run(
    transferPayload: RMETransferPayload,
    executeStep: RMETransferStepExecutor,
    options: RMETransferRunOptions = {}
  ): Promise<RMETransferResult> {
    const now = options.now || (() => Date.now());
    const startedMs = now();
    const startedAt = new Date(startedMs).toISOString();
    const dedupeWindowMs =
      transferPayload.options?.idempotencyWindowMs ||
      options.dedupeWindowMs ||
      DEFAULT_DEDUPE_WINDOW_MS;
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
                // Ignore volatile no_resep so rapid duplicate-clicks are deduped reliably.
                no_resep: '__fingerprint_stable__',
              },
            }
          : null,
      })
    );
    const runId =
      transferPayload.options?.requestId ||
      `rme-${startedMs}-${Math.random().toString(36).slice(2, 8)}`;
    const steps = createInitialSteps();
    const reasonCodes = new Set<RMETransferReasonCode>(transferPayload.meta?.reasonCodes || []);

    this.pruneFingerprints(startedMs, dedupeWindowMs);
    const latest = this.recentFingerprints.get(fingerprint);
    const isDuplicate =
      !transferPayload.options?.forceRun &&
      latest &&
      startedMs - latest.timestampMs < dedupeWindowMs;

    if (isDuplicate) {
      reasonCodes.add('DUPLICATE_SUPPRESSED');
      return {
        runId,
        fingerprint,
        state: 'failed',
        startedAt,
        completedAt: nowIso(),
        totalLatencyMs: 0,
        reasonCodes: Array.from(reasonCodes),
        steps,
      };
    }

    this.activeRuns.set(runId, { fingerprint, cancelled: false });
    this.emitProgress(options.onProgress, {
      runId,
      state: 'running',
      transferState: 'partial',
      steps,
      reasonCodes: Array.from(reasonCodes),
    });

    const stepOrder = resolveStepOrder(
      transferPayload.options?.startFromStep,
      transferPayload.options?.onlyStep
    );
    const timeoutMs = {
      ...DEFAULT_TIMEOUT_MS,
      ...(options.timeoutMs || {}),
    };
    const retryByStep = {
      ...DEFAULT_RETRY_BY_STEP,
      ...(options.retryByStep || {}),
    };
    const retryDelayMs = options.retryDelayMs || DEFAULT_RETRY_DELAY_MS;

    for (const step of stepOrder) {
      if (this.isCancelled(runId)) {
        steps[step] = {
          ...steps[step],
          state: 'cancelled',
          reasonCode: 'USER_CANCELLED',
          errorClass: 'fatal',
          message: 'Transfer dibatalkan oleh pengguna',
        };
        reasonCodes.add('USER_CANCELLED');
        break;
      }

      const payload = transferPayload[step];
      if (!payload) {
        const reasonCode: RMETransferReasonCode =
          step === 'diagnosa' ? 'DIAGNOSA_PAYLOAD_EMPTY' : 'RESEP_PAYLOAD_EMPTY';
        steps[step] = {
          ...steps[step],
          state: 'skipped',
          reasonCode,
          errorClass: 'recoverable',
          message:
            step === 'diagnosa'
              ? 'Payload diagnosa kosong, step dilewati'
              : 'Payload resep kosong, step dilewati',
        };
        reasonCodes.add(reasonCode);
        this.emitProgress(options.onProgress, {
          runId,
          state: 'running',
          transferState: resolveResultState(steps),
          activeStep: step,
          steps,
          reasonCodes: Array.from(reasonCodes),
        });
        continue;
      }

      const maxRetries = Math.max(0, retryByStep[step]);
      let stepResult: RMETransferStepResult | null = null;
      let lastError = '';

      for (let attempt = 1; attempt <= maxRetries + 1; attempt += 1) {
        if (this.isCancelled(runId)) {
          steps[step] = {
            ...steps[step],
            state: 'cancelled',
            attempt,
            reasonCode: 'USER_CANCELLED',
            errorClass: 'fatal',
            message: 'Transfer dibatalkan oleh pengguna',
          };
          reasonCodes.add('USER_CANCELLED');
          break;
        }

        steps[step] = {
          ...steps[step],
          state: 'running',
          attempt,
        };
        this.emitProgress(options.onProgress, {
          runId,
          state: 'running',
          transferState: resolveResultState(steps),
          activeStep: step,
          steps,
          reasonCodes: Array.from(reasonCodes),
        });

        const startedStepMs = now();
        try {
          const raw = await withTimeout(
            executeStep(step, payload as StepPayloadMap[typeof step]),
            timeoutMs[step]
          );
          const normalized = normalizeExecutionResult(raw);
          const latencyMs = now() - startedStepMs;

          if (normalized.failedCount === 0 && normalized.successCount > 0) {
            stepResult = {
              step,
              state: 'success',
              attempt,
              latencyMs,
              successCount: normalized.successCount,
              failedCount: 0,
              skippedCount: normalized.skippedCount,
            };
            break;
          }

          if (normalized.successCount > 0 && normalized.failedCount > 0) {
            const message = normalized.errors[0] || 'Sebagian field gagal diisi';
            const classified = classifyFailure(message);
            stepResult = {
              step,
              state: 'partial',
              attempt,
              latencyMs,
              successCount: normalized.successCount,
              failedCount: normalized.failedCount,
              skippedCount: normalized.skippedCount,
              reasonCode: classified.reasonCode,
              errorClass: classified.recoverable ? 'recoverable' : 'fatal',
              message,
            };
            reasonCodes.add(classified.reasonCode);
            break;
          }

          if (
            normalized.successCount === 0 &&
            normalized.failedCount === 0 &&
            normalized.skippedCount > 0
          ) {
            stepResult = {
              step,
              state: 'skipped',
              attempt,
              latencyMs,
              successCount: 0,
              failedCount: 0,
              skippedCount: normalized.skippedCount,
              reasonCode: 'NO_FIELDS_FILLED',
              errorClass: 'recoverable',
              message: 'Semua field dilewati (readonly/terproteksi/opsional).',
            };
            reasonCodes.add('NO_FIELDS_FILLED');
            break;
          }

          lastError = normalized.errors[0] || 'Step gagal tanpa detail';
          const classified = classifyFailure(lastError);
          reasonCodes.add(classified.reasonCode);
          const exhausted = attempt > maxRetries;
          if (exhausted) {
            stepResult = {
              step,
              state: 'failed',
              attempt,
              latencyMs,
              successCount: normalized.successCount,
              failedCount: Math.max(1, normalized.failedCount),
              skippedCount: normalized.skippedCount,
              reasonCode: 'RETRY_EXHAUSTED',
              errorClass: classified.recoverable ? 'recoverable' : 'fatal',
              message: `${lastError}. Retry habis.`,
            };
            reasonCodes.add('RETRY_EXHAUSTED');
            break;
          }
          if (!classified.recoverable) {
            stepResult = {
              step,
              state: 'failed',
              attempt,
              latencyMs,
              successCount: normalized.successCount,
              failedCount: Math.max(1, normalized.failedCount),
              skippedCount: normalized.skippedCount,
              reasonCode: classified.reasonCode,
              errorClass: 'fatal',
              message: lastError,
            };
            break;
          }
        } catch (error) {
          const latencyMs = now() - startedStepMs;
          const message = error instanceof Error ? error.message : String(error);
          lastError = message;
          const classified = classifyFailure(message);
          reasonCodes.add(classified.reasonCode);
          const exhausted = attempt > maxRetries;
          if (exhausted) {
            stepResult = {
              step,
              state: 'failed',
              attempt,
              latencyMs,
              successCount: 0,
              failedCount: 1,
              skippedCount: 0,
              reasonCode: 'RETRY_EXHAUSTED',
              errorClass: classified.recoverable ? 'recoverable' : 'fatal',
              message: `${message}. Retry habis.`,
            };
            reasonCodes.add('RETRY_EXHAUSTED');
            break;
          }
          if (!classified.recoverable) {
            stepResult = {
              step,
              state: 'failed',
              attempt,
              latencyMs,
              successCount: 0,
              failedCount: 1,
              skippedCount: 0,
              reasonCode: classified.reasonCode,
              errorClass: 'fatal',
              message,
            };
            break;
          }
        }

        await wait(retryDelayMs * attempt);
      }

      if (!stepResult) {
        stepResult = {
          ...steps[step],
          state: 'failed',
          reasonCode: 'UNKNOWN_STEP_FAILURE',
          errorClass: 'fatal',
          message: lastError || 'Step gagal',
        };
        reasonCodes.add('UNKNOWN_STEP_FAILURE');
      }

      steps[step] = stepResult;
      await options.onStepFinal?.(stepResult);
      this.emitProgress(options.onProgress, {
        runId,
        state: 'running',
        transferState: resolveResultState(steps),
        activeStep: step,
        steps,
        reasonCodes: Array.from(reasonCodes),
      });
    }

    const completedAt = nowIso();
    const totalLatencyMs = Math.max(0, now() - startedMs);
    let transferState = resolveResultState(steps);
    const partialReasonCodes = new Set<RMETransferReasonCode>([
      'RESEP_TRIAD_INCOMPLETE',
      'RESEP_PAYLOAD_EMPTY',
      'RESEP_EMPTY_AFTER_SAFETY',
      'DIAGNOSA_PAYLOAD_EMPTY',
      'PREGNANCY_UNKNOWN_DEFAULT_FALSE',
    ]);
    if (
      transferState === 'success' &&
      Array.from(reasonCodes).some((code) => partialReasonCodes.has(code))
    ) {
      transferState = 'partial';
    }

    this.activeRuns.delete(runId);
    this.recentFingerprints.set(fingerprint, { runId, timestampMs: now() });

    const finalResult: RMETransferResult = {
      runId,
      fingerprint,
      state: transferState,
      startedAt,
      completedAt,
      totalLatencyMs,
      reasonCodes: Array.from(reasonCodes),
      steps,
    };

    this.emitProgress(options.onProgress, {
      runId,
      state: transferState === 'cancelled' ? 'cancelled' : 'completed',
      transferState,
      steps,
      reasonCodes: finalResult.reasonCodes,
    });

    return finalResult;
  }
}
