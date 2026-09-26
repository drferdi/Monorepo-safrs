/**
 * Trajectory Alert Service
 *
 * Emits trajectory-based alerts to the /intelligence Socket.IO namespace.
 * Called from server.ts after vital sign triage is processed.
 *
 * Alert flow:
 * 1. Vital received via socket (emr:triage-send)
 * 2. Momentum computed from patient history
 * 3. Alert decision generated
 * 4. If shouldPush → emit to /intelligence namespace
 * 5. Cooldown tracked in memory (per patient + level)
 *
 * SAFETY: This service only handles TRAJECTORY alerts.
 * Instant single-encounter red flags (NEWS2, AVPU) are handled
 * synchronously in the main triage handler — they are NEVER delayed.
 *
 * Clinical Momentum Engine — Phase 3 (Predictive Intelligence)
 */

import 'server-only'

import type { ConvergenceResult } from './convergence-detector'
import type { MomentumLevel } from './momentum-engine'
import type { AlertDecision, TimeToCriticalResult } from './prediction-engine'

// ── Types ────────────────────────────────────────────────────────────────────

export interface TrajectoryAlertPayload {
  type: 'trajectory_alert'
  patientIdentifier: string
  encounterId?: string
  alertLevel: AlertDecision['level']
  momentumLevel: MomentumLevel
  reasons: string[]
  convergence: {
    score: number
    pattern: ConvergenceResult['pattern']
    worseningParams: string[]
  }
  timeToCritical: TimeToCriticalResult[]
  narrative: string
  timestamp: string
  /** Only populated if specific unit is known */
  recordedByUserId?: string
}

// ── Cooldown Store ───────────────────────────────────────────────────────────
// In-memory cooldown per (patientIdentifier + cooldownKey).
// Reset on server restart. Future: persist to Redis.

const COOLDOWN_MS: Record<AlertDecision['level'], number> = {
  none: 0,
  info: 0, // info level → not pushed
  warning: 24 * 3_600_000, // 24h cooldown
  urgent: 8 * 3_600_000, // 8h cooldown (more pressing)
  critical: 2 * 3_600_000, // 2h cooldown
  emergency: 0, // no cooldown — always emit
}

const cooldownStore = new Map<string, number>()

function isInCooldown(patientIdentifier: string, cooldownKey: string): boolean {
  const key = `${patientIdentifier}:${cooldownKey}`
  const lastEmittedAt = cooldownStore.get(key)
  if (!lastEmittedAt) return false

  const level = cooldownKey.split('_').pop() as AlertDecision['level']
  const cooldownMs = COOLDOWN_MS[level] ?? COOLDOWN_MS.warning
  return Date.now() - lastEmittedAt < cooldownMs
}

function markCooldown(patientIdentifier: string, cooldownKey: string): void {
  const key = `${patientIdentifier}:${cooldownKey}`
  cooldownStore.set(key, Date.now())
}

// ── Socket.IO Emission ────────────────────────────────────────────────────────

/** Type-safe reference to Socket.IO namespace — injected via initialize() */
type IntelligenceNamespace = {
  emit(event: string, payload: unknown): void
}

let intelligenceNs: IntelligenceNamespace | null = null

/**
 * Initialize the alert service with the Socket.IO /intelligence namespace.
 * Called once from server.ts during startup.
 */
export function initializeTrajectoryAlertService(ns: IntelligenceNamespace): void {
  intelligenceNs = ns
}

// ── Main Export ──────────────────────────────────────────────────────────────

/**
 * Evaluate and optionally emit a trajectory alert.
 *
 * @returns Whether an alert was emitted.
 */
export function evaluateAndEmitTrajectoryAlert(
  patientIdentifier: string,
  alertDecision: AlertDecision,
  payload: Omit<TrajectoryAlertPayload, 'type' | 'patientIdentifier' | 'timestamp'>
): boolean {
  if (!alertDecision.shouldPush) return false
  if (!intelligenceNs) return false // service not initialized (dev/test context)

  if (isInCooldown(patientIdentifier, alertDecision.cooldownKey)) {
    return false // In cooldown — suppress duplicate alert
  }

  const alertPayload: TrajectoryAlertPayload = {
    type: 'trajectory_alert',
    patientIdentifier,
    timestamp: new Date().toISOString(),
    ...payload,
    alertLevel: alertDecision.level,
  }

  try {
    intelligenceNs.emit('trajectory:alert', alertPayload)
    markCooldown(patientIdentifier, alertDecision.cooldownKey)
    return true
  } catch {
    // Emission failure is non-critical — triage flow must not be interrupted
    return false
  }
}

/**
 * Clear cooldown for a patient (useful for testing or manual override).
 */
export function clearCooldown(patientIdentifier: string): void {
  const keysToDelete: string[] = []
  for (const key of cooldownStore.keys()) {
    if (key.startsWith(`${patientIdentifier}:`)) {
      keysToDelete.push(key)
    }
  }
  keysToDelete.forEach(k => cooldownStore.delete(k))
}

/**
 * Get current cooldown store size (for monitoring/debugging).
 */
export function getCooldownStoreSize(): number {
  return cooldownStore.size
}
