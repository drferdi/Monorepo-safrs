import type { ICD10Result } from '../../types.js'

import {
  InvalidClinicalOutputError,
  parseDiagnosisOutput,
  type InvalidClinicalOutputReason,
} from './diagnosisContract.js'

export interface DiagnosisValidationFailure {
  reason: InvalidClinicalOutputReason
  rejectedCode?: string
}

export interface DiagnosisCompletionRequest {
  query: string
  attempt: 1 | 2
  isRetry: boolean
  previousFailure?: DiagnosisValidationFailure
  timeoutMs?: number
}

export interface DiagnosisCompletionResult {
  content: string | null | undefined
  finishReason?: string | null
}

export type DiagnosisCompletion = (
  request: DiagnosisCompletionRequest
) => Promise<DiagnosisCompletionResult>

export interface DiagnosisGenerationOptions {
  deadlineMs?: number
  now?: () => number
}

export class DiagnosisDeadlineExceededError extends Error {
  constructor() {
    super('Diagnosis generation deadline exceeded')
    this.name = 'DiagnosisDeadlineExceededError'
  }
}

function isProviderTimeout(error: unknown) {
  if (error instanceof DiagnosisDeadlineExceededError) return true
  if (typeof error !== 'object' || error === null || !('name' in error)) return false
  return error.name === 'APIConnectionTimeoutError' || error.name === 'TimeoutError'
}

async function awaitCompletionWithinBudget(
  completion: Promise<DiagnosisCompletionResult>,
  timeoutMs?: number
) {
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    if (timeoutMs === undefined) return await completion

    return await Promise.race([
      completion,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new DiagnosisDeadlineExceededError()), timeoutMs)
      }),
    ])
  } catch (error) {
    if (isProviderTimeout(error)) throw new DiagnosisDeadlineExceededError()
    throw error
  } finally {
    if (timeout !== undefined) clearTimeout(timeout)
  }
}

export async function generateValidatedDiagnosis(
  query: string,
  complete: DiagnosisCompletion,
  onInvalid?: (attempt: 1 | 2, error: InvalidClinicalOutputError) => void,
  options: DiagnosisGenerationOptions = {}
): Promise<ICD10Result> {
  const now = options.now || Date.now
  const startedAt = now()
  let previousFailure: DiagnosisValidationFailure | undefined
  for (const attempt of [1, 2] as const) {
    const timeoutMs =
      options.deadlineMs === undefined
        ? undefined
        : Math.max(0, options.deadlineMs - (now() - startedAt))
    if (timeoutMs === 0) throw new DiagnosisDeadlineExceededError()

    const completion = await awaitCompletionWithinBudget(
      complete({
        query,
        attempt,
        isRetry: attempt === 2,
        previousFailure,
        timeoutMs,
      }),
      timeoutMs
    )
    try {
      return parseDiagnosisOutput(completion.content || '', completion.finishReason)
    } catch (error) {
      if (!(error instanceof InvalidClinicalOutputError)) throw error
      onInvalid?.(attempt, error)
      if (attempt === 2) throw error
      if (options.deadlineMs !== undefined && options.deadlineMs - (now() - startedAt) <= 0) {
        throw new DiagnosisDeadlineExceededError()
      }
      previousFailure = {
        reason: error.reason,
        ...(error.rejectedCode && { rejectedCode: error.rejectedCode }),
      }
    }
  }

  throw new InvalidClinicalOutputError('invalid_json')
}
