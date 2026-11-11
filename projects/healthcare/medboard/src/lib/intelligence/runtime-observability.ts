import * as Sentry from '@sentry/nextjs'

import { initializeAbysLangfuseTracing } from './langfuse.config'
import { getAbysSentryConfig, scrubAbysSentryEvent } from './sentry.config'

const DASHBOARD_SENTRY_APP = 'intelligenceboard'
let initialized = false
let sentryInitialized = false

function ensureDashboardSentryInitialized(): boolean {
  if (sentryInitialized) {
    return true
  }

  const config = getAbysSentryConfig(DASHBOARD_SENTRY_APP)
  if (!config.dsn) {
    return false
  }

  Sentry.init(config)
  sentryInitialized = true
  return true
}

export async function initializeDashboardObservability(): Promise<void> {
  if (initialized) {
    return
  }

  try {
    ensureDashboardSentryInitialized()

    await initializeAbysLangfuseTracing()
    initialized = true
  } catch (error) {
    initialized = false
    throw error
  }
}

export async function captureDashboardObservabilityError(
  error: unknown,
  extra: Record<string, unknown> = {}
): Promise<void> {
  if (!ensureDashboardSentryInitialized()) {
    return
  }

  Sentry.captureException(error, {
    extra: scrubAbysSentryEvent(extra),
  })
}
