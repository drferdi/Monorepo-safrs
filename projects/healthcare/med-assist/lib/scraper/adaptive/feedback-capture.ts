// Designed and constructed by Drferdi.
/**
 * Precision-Architected. Future-Built by Docsyanpse
 * Sentra Healthcare Artificial Intelligence
 */

/**
 * DAS Phase 3: Feedback Capture
 *
 * Captures user interactions to track fill success/failure.
 * Monitors field changes and reports outcomes to learning store.
 *
 * @module lib/scraper/adaptive/feedback-capture
 */

import { scanPageFields } from './dom-scanner';
import { recordLearning } from './learning-store';
import { computePageHash } from './mapping-cache';
import type { FieldMapping, FillOutcome, LearningEntry, PageType } from './types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const FEEDBACK_CONFIG = {
  /** Time to wait for user interaction before marking as success (ms) */
  interactionTimeout: 30000, // 30 seconds
  /** Debounce time for change detection (ms) */
  changeDebounce: 500,
  /** Maximum tracked fields per session */
  maxTrackedFields: 100,
};

// ============================================================================
// TRACKING STATE
// ============================================================================

interface TrackedField {
  mapping: FieldMapping;
  element: HTMLElement | null;
  originalValue: string;
  filledValue: string;
  fillTime: number;
  interactionDetected: boolean;
  timeoutId: ReturnType<typeof setTimeout> | null;
  changeListener: ((e: Event) => void) | null;
}

const trackedFields = new Map<string, TrackedField>();
let currentPageHash: string | null = null;
let currentPageType: PageType = 'unknown';

// ============================================================================
// FIELD TRACKING
// ============================================================================

/**
 * Start tracking a filled field for feedback
 *
 * @param mapping - The field mapping that was used
 * @param filledValue - The value that was filled
 */
export function trackFilledField(mapping: FieldMapping, filledValue: string): void {
  // Limit tracked fields
  if (trackedFields.size >= FEEDBACK_CONFIG.maxTrackedFields) {
    console.warn('[DAS:Feedback] Max tracked fields reached');
    return;
  }

  const trackingKey = `${mapping.payloadKey}:${mapping.targetField.selector}`;

  // Find the DOM element
  const element = document.querySelector(mapping.targetField.selector) as HTMLElement | null;

  // Get original value before fill
  const originalValue = element
    ? (element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value || ''
    : '';

  const tracked: TrackedField = {
    mapping,
    element,
    originalValue,
    filledValue,
    fillTime: Date.now(),
    interactionDetected: false,
    timeoutId: null,
    changeListener: null,
  };

  // Set up change listener
  if (element) {
    tracked.changeListener = createChangeListener(trackingKey, tracked);
    element.addEventListener('change', tracked.changeListener);
    element.addEventListener('input', tracked.changeListener);
    element.addEventListener('blur', tracked.changeListener);
  }

  // Set up timeout for success
  tracked.timeoutId = setTimeout(() => {
    if (!tracked.interactionDetected) {
      // No changes detected - mark as success
      reportOutcome(trackingKey, 'success');
    }
  }, FEEDBACK_CONFIG.interactionTimeout);

  trackedFields.set(trackingKey, tracked);

  console.warn(`[DAS:Feedback] Tracking field: ${mapping.payloadKey}`);
}

/**
 * Create debounced change listener for a tracked field
 */
function createChangeListener(trackingKey: string, tracked: TrackedField): (e: Event) => void {
  let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

  return (_e: Event) => {
    tracked.interactionDetected = true;

    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    debounceTimeout = setTimeout(() => {
      const element = tracked.element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      if (!element) return;

      const currentValue = element.value || '';

      if (currentValue !== tracked.filledValue) {
        // User changed the value - auto-corrected
        reportOutcome(trackingKey, 'auto_corrected', currentValue);
      }
    }, FEEDBACK_CONFIG.changeDebounce);
  };
}

// ============================================================================
// OUTCOME REPORTING
// ============================================================================

/**
 * Report fill outcome to learning store
 */
async function reportOutcome(
  trackingKey: string,
  outcome: FillOutcome,
  correctedValue?: string
): Promise<void> {
  const tracked = trackedFields.get(trackingKey);
  if (!tracked) return;

  // Clean up tracking
  cleanupTracking(trackingKey);

  // Calculate interaction time
  const interactionTime = tracked.interactionDetected ? Date.now() - tracked.fillTime : null;

  // Compute page hash if not cached
  if (!currentPageHash) {
    const scanResult = scanPageFields();
    currentPageHash = computePageHash(window.location.href, scanResult.fields);
  }

  // Record learning entry
  const entry: Omit<LearningEntry, 'id' | 'timestamp' | 'sessionId'> = {
    pageType: currentPageType,
    pageHash: currentPageHash,
    payloadKey: tracked.mapping.payloadKey,
    fieldSelector: tracked.mapping.targetField.selector,
    confidence: tracked.mapping.confidence,
    outcome,
    interactionTime,
    correctedValue: correctedValue || null,
  };

  try {
    await recordLearning(entry);
    console.warn(`[DAS:Feedback] Recorded ${outcome} for ${tracked.mapping.payloadKey}`);
  } catch (error) {
    console.error('[DAS:Feedback] Failed to record learning:', error);
  }
}

/**
 * Clean up tracking for a field
 */
function cleanupTracking(trackingKey: string): void {
  const tracked = trackedFields.get(trackingKey);
  if (!tracked) return;

  // Clear timeout
  if (tracked.timeoutId) {
    clearTimeout(tracked.timeoutId);
  }

  // Remove listeners
  if (tracked.element && tracked.changeListener) {
    tracked.element.removeEventListener('change', tracked.changeListener);
    tracked.element.removeEventListener('input', tracked.changeListener);
    tracked.element.removeEventListener('blur', tracked.changeListener);
  }

  trackedFields.delete(trackingKey);
}

// ============================================================================
// MANUAL REPORTING
// ============================================================================

/**
 * Manually report a fill as successful
 *
 * Call this when form is submitted successfully
 */
export async function reportFillSuccess(mapping: FieldMapping): Promise<void> {
  const trackingKey = `${mapping.payloadKey}:${mapping.targetField.selector}`;
  await reportOutcome(trackingKey, 'success');
}

/**
 * Manually report a fill as failed
 *
 * Call this when fill operation failed (element not found, etc.)
 */
export async function reportFillFailed(mapping: FieldMapping, reason?: string): Promise<void> {
  const trackingKey = `${mapping.payloadKey}:${mapping.targetField.selector}`;

  // If not tracked, create temporary entry
  if (!trackedFields.has(trackingKey)) {
    trackedFields.set(trackingKey, {
      mapping,
      element: null,
      originalValue: '',
      filledValue: '',
      fillTime: Date.now(),
      interactionDetected: false,
      timeoutId: null,
      changeListener: null,
    });
  }

  await reportOutcome(trackingKey, 'failed');
  console.warn(`[DAS:Feedback] Fill failed: ${reason || 'unknown'}`);
}

/**
 * Manually report a mapping as rejected by user
 */
export async function reportMappingRejected(mapping: FieldMapping): Promise<void> {
  const trackingKey = `${mapping.payloadKey}:${mapping.targetField.selector}`;

  if (!trackedFields.has(trackingKey)) {
    trackedFields.set(trackingKey, {
      mapping,
      element: null,
      originalValue: '',
      filledValue: '',
      fillTime: Date.now(),
      interactionDetected: true,
      timeoutId: null,
      changeListener: null,
    });
  }

  await reportOutcome(trackingKey, 'rejected');
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Track multiple filled fields at once
 *
 * @param mappings - Array of mappings with filled values
 */
export function trackBatchFill(
  mappings: Array<{ mapping: FieldMapping; filledValue: string }>
): void {
  for (const { mapping, filledValue } of mappings) {
    trackFilledField(mapping, filledValue);
  }
}

/**
 * Report batch fill success (e.g., form submitted)
 */
export async function reportBatchSuccess(): Promise<void> {
  const keys = Array.from(trackedFields.keys());

  for (const key of keys) {
    await reportOutcome(key, 'success');
  }
}

/**
 * Cancel all tracking (e.g., page navigation)
 */
export function cancelAllTracking(): void {
  const keys = Array.from(trackedFields.keys());

  for (const key of keys) {
    const tracked = trackedFields.get(key);
    if (tracked && !tracked.interactionDetected) {
      // Report as timeout if no interaction
      reportOutcome(key, 'timeout');
    } else {
      cleanupTracking(key);
    }
  }
}

// ============================================================================
// PAGE CONTEXT
// ============================================================================

/**
 * Set current page context for feedback tracking
 */
export function setPageContext(pageType: PageType, pageHash?: string): void {
  currentPageType = pageType;
  if (pageHash) {
    currentPageHash = pageHash;
  }
}

/**
 * Get current tracking status
 */
export function getTrackingStatus(): {
  trackedCount: number;
  fields: string[];
} {
  return {
    trackedCount: trackedFields.size,
    fields: Array.from(trackedFields.keys()),
  };
}

// ============================================================================
// CLEANUP ON PAGE UNLOAD
// ============================================================================

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    cancelAllTracking();
  });
}
