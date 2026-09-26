/**
 * sentry/sentry.config.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Abys Sentry Observability Configuration — Phase 6: Digital Pulse
 * Sentra Healthcare AI
 *
 * PURPOSE: Error tracking, performance monitoring, and release management
 * for all Abys applications.
 *
 * REQUIRED SECRETS (set in GitHub Repository Secrets AND in Vercel env vars):
 *   SENTRY_DSN           — Your Sentry project DSN (from Sentry project settings)
 *   SENTRY_AUTH_TOKEN    — Source map upload token (from Sentry account settings)
 *   SENTRY_ORG           — Your Sentry organization slug
 *   SENTRY_PROJECT       — Your Sentry project slug
 *
 * DO NOT hardcode any of these values. Reference them via process.env only.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface SentryConfig {
  dsn: string
  environment: string
  release?: string
  tracesSampleRate: number
  replaysSessionSampleRate?: number
  replaysOnErrorSampleRate?: number
  /** Clinical safety: never send PHI to Sentry. */
  beforeSend?: (event: unknown) => unknown | null
}

interface SentryCaptureModule {
  init: (config: SentryConfig) => void
  captureException: (error: unknown, context?: { extra?: Record<string, unknown> }) => void
}

const initializedApps = new Set<string>()
const missingDsnWarnedApps = new Set<string>()

const PHI_FIELD_PATTERNS = [
  /patientid/i,
  /patientname/i,
  /patientlabel/i,
  /fullname/i,
  /displayname/i,
  /medicalrecordnumber/i,
  /\bmrn\b/i,
  /\bnik\b/i,
]

const NIK_VALUE_PATTERN = /\b\d{16}\b/g
const MEDICAL_RECORD_PATTERN = /\b(?:rm|mrn)[-:\s]?\d+\b/gi

function shouldScrubPhiField(key: string): boolean {
  return PHI_FIELD_PATTERNS.some(pattern => pattern.test(key))
}

function scrubPhiValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return value
      .replace(NIK_VALUE_PATTERN, '[REDACTED-NIK]')
      .replace(MEDICAL_RECORD_PATTERN, '[REDACTED-MRN]')
  }

  if (Array.isArray(value)) {
    return value.map(item => scrubPhiValue(item))
  }

  if (value && typeof value === 'object') {
    const scrubbedEntries = Object.entries(value).flatMap(([key, nestedValue]) => {
      if (shouldScrubPhiField(key)) {
        return []
      }

      return [[key, scrubPhiValue(nestedValue)] as const]
    })

    return Object.fromEntries(scrubbedEntries)
  }

  return value
}

export function scrubAbysSentryEvent<T>(event: T): T {
  return scrubPhiValue(event) as T
}

export function hasAbysSentryDsn(): boolean {
  return Boolean(process.env.SENTRY_DSN?.trim())
}

function warnMissingAbysSentryDsn(appName: string): void {
  if (process.env.NODE_ENV !== 'production') {
    return
  }

  if (missingDsnWarnedApps.has(appName)) {
    return
  }

  missingDsnWarnedApps.add(appName)
  console.warn(
    `[Abys/Sentry] SENTRY_DSN is not set for app "${appName}". ` +
      'Sentry will not capture events. Set this secret in GitHub Repository Secrets and Vercel.'
  )
}

/**
 * Returns the Sentry configuration for a given Abys application.
 *
 * Pass the result to Sentry.init() in each app's instrumentation entry point.
 * Example: apps/puskesmas/sentry.client.config.ts
 *
 * @param appName - The name of the Abys app (e.g. "puskesmas", "medlink")
 */
export function getAbysSentryConfig(appName: string): SentryConfig {
  const dsn = process.env.SENTRY_DSN

  if (!dsn) {
    warnMissingAbysSentryDsn(appName)
  }

  return {
    dsn: dsn ?? '',
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.VERCEL_GIT_COMMIT_SHA ?? undefined,

    // Adjust sample rate per environment. Production should be lower for cost control.
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Session replay — disabled by default to protect patient privacy.
    // Only enable after confirming no PHI is rendered in replayed sessions.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    /**
     * CLINICAL SAFETY: PHI scrubbing hook.
     *
     * This function is called before every event is sent to Sentry.
     * It must prevent any Protected Health Information (PHI) from being
     * transmitted. Add scrubbing logic here as clinical data structures grow.
     *
     * TODO (compliance team): Review and expand PHI scrubbing rules as
     * clinical data models in @abyss/types evolve.
     */
    beforeSend(event) {
      return scrubAbysSentryEvent(event)
    },
  }
}

async function getAbysSentryModule(): Promise<SentryCaptureModule | null> {
  try {
    return (await import('@sentry/nextjs')) as unknown as SentryCaptureModule
  } catch (error) {
    console.warn('[Abys/Sentry] Failed to load @sentry/nextjs', {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

export async function initializeAbysSentry(appName: string): Promise<boolean> {
  if (initializedApps.has(appName)) {
    return true
  }

  if (!hasAbysSentryDsn()) {
    warnMissingAbysSentryDsn(appName)
    return false
  }

  const sentry = await getAbysSentryModule()
  if (!sentry) {
    return false
  }

  sentry.init(getAbysSentryConfig(appName))
  initializedApps.add(appName)
  return true
}

export async function captureAbysSentryException(
  appName: string,
  error: unknown,
  extra: Record<string, unknown> = {}
): Promise<void> {
  if (!hasAbysSentryDsn()) {
    warnMissingAbysSentryDsn(appName)
    return
  }

  const sentry = await getAbysSentryModule()
  if (!sentry) {
    return
  }

  if (!initializedApps.has(appName)) {
    const initialized = await initializeAbysSentry(appName)
    if (!initialized) {
      return
    }
  }

  sentry.captureException(error, {
    extra: scrubAbysSentryEvent(extra),
  })
}

/**
 * Emit a smoke-test event to verify Sentry connectivity.
 * Call this during Phase 6 observability setup verification.
 *
 * Usage: import { emitSentrySmokTest } from 'sentry/sentry.config';
 *        await emitSentrySmokeTest('puskesmas');
 */
export async function emitSentrySmokeTest(appName: string): Promise<void> {
  // TODO: Import Sentry SDK and call Sentry.captureMessage() here.
  // Example:
  //   const Sentry = await import('@sentry/nextjs');
  //   Sentry.captureMessage(`[Abys/Smoke] ${appName} observability test — ${new Date().toISOString()}`);
  console.log(
    `[Abys/Sentry] Smoke test stub for app "${appName}". Configure Sentry SDK to activate.`
  )
}
