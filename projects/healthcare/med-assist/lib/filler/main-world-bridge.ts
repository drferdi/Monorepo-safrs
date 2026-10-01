// Designed and constructed by Drferdi.
/**
 * Main World Fill Bridge
 *
 * Sends fill commands from content script (isolated world) to inject.content.ts (main world)
 * via window.postMessage. The main world bridge has access to jQuery and can properly
 * trigger jQuery UI autocomplete, select changes, and other framework-specific events.
 *
 * This solves the fundamental problem: content scripts can't access page's jQuery,
 * so native DOM events don't trigger jQuery event handlers that populate hidden fields.
 */

import { createLogger } from '@/utils/logger';

const bridgeLog = createLogger('FillBridge', 'filler');

/**
 * MainWorldFieldMapping interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-03-12
 */

export interface MainWorldFieldMapping {
  selector: string;
  value: string;
  type: 'text' | 'select' | 'autocomplete';
  autocompleteTimeout?: number;
  requireExactMatch?: boolean;
  /** 'exact': choose only the item that is exactly the value (`pickExactSuggestion`), never the first. */
  /** 'medication': search the leading words, then choose the item that is the medication (`pickMedicationSuggestion`). */
  matchMode?: 'exact' | 'medication';
}

/**
 * MainWorldFillResult interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-03-12
 */

export interface MainWorldFillResult {
  success: boolean;
  field: string;
  value: string;
  error?: string;
  method: string;
}

interface FillResponseMessage {
  type: 'sentra-fill-fields-response';
  requestId: string;
  results: MainWorldFillResult[];
  successCount: number;
  failCount: number;
}

/**
 * Fill fields via the MAIN WORLD bridge (inject.content.ts)
 *
 * Sends field mappings to the main world script which uses jQuery
 * to fill fields and trigger proper framework events.
 *
 * @param fields - Array of field mappings to fill
 * @param timeoutMs - Max wait time for response (default: 30s)
 * @param delayBetweenFields - Delay between filling each field (default: 150ms)
 * @returns Promise with fill results
 */
/**
 * Ping main world to verify inject.content.ts is loaded and responsive
 * @param timeoutMs - Max wait time for ping response (default: 2s)
 * @returns Promise with ping result (null if timeout)
 */
async function pingMainWorld(
  timeoutMs: number = 2000
): Promise<{ hasJQueryAjax?: boolean; hasShowRiwayat?: boolean } | null> {
  bridgeLog.debug('[Bridge] Pinging main world...');

  return new Promise((resolve) => {
    const handler = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.data?.type === 'sentra-main-world-ready') {
        bridgeLog.debug('[Bridge] Main world responded:', event.data);
        window.removeEventListener('message', handler);
        resolve(event.data);
      }
    };

    window.addEventListener('message', handler);
    window.postMessage({ type: 'sentra-ping-main-world' }, '*');

    setTimeout(() => {
      window.removeEventListener('message', handler);
      resolve(null);
    }, timeoutMs);
  });
}

/**
 * fillViaMainWorld
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-03-12
 */

export async function fillViaMainWorld(
  fields: MainWorldFieldMapping[],
  timeoutMs: number = 30000,
  delayBetweenFields: number = 150
): Promise<{
  success: MainWorldFillResult[];
  failed: MainWorldFillResult[];
}> {
  const requestId = `fill-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // PHASE 1 DIAGNOSTIC: Verify main world bridge is loaded
  const pingResult = await pingMainWorld(2000);
  if (!pingResult) {
    bridgeLog.error(
      '[Bridge] ❌ Main world bridge not responding - inject.content.ts may not be loaded'
    );
    return {
      success: [],
      failed: fields.map((f) => ({
        success: false,
        field: f.selector,
        value: f.value,
        error: 'Main world bridge not responding - inject.content.ts not loaded or not ready',
        method: 'bridge-ping-failed',
      })),
    };
  }

  bridgeLog.debug('[Bridge] ✅ Main world bridge alive:', {
    hasJQuery: pingResult.hasJQueryAjax,
    hasShowRiwayat: pingResult.hasShowRiwayat,
  });

  bridgeLog.debug(`[FillBridge] Sending ${fields.length} fields to main world, id=${requestId}`);

  return new Promise((resolve) => {
    let resolved = false;

    // Listen for response from main world
    const listener = (event: MessageEvent) => {
      if (event.source !== window) return;
      const msg = event.data as FillResponseMessage;
      if (msg?.type === 'sentra-fill-fields-response' && msg.requestId === requestId) {
        window.removeEventListener('message', listener);
        if (!resolved) {
          resolved = true;
          const success = msg.results.filter((r) => r.success);
          const failed = msg.results.filter((r) => !r.success);
          bridgeLog.debug(
            `[FillBridge] Response: ${success.length} success, ${failed.length} failed`
          );
          resolve({ success, failed });
        }
      }
    };
    window.addEventListener('message', listener);

    // Send fill request to main world
    window.postMessage(
      {
        type: 'sentra-fill-fields',
        requestId,
        fields,
        delayBetweenFields,
      },
      '*'
    );

    // Timeout fallback
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        window.removeEventListener('message', listener);
        bridgeLog.error(`[FillBridge] Timeout waiting for main world response (${timeoutMs}ms)`);
        resolve({
          success: [],
          failed: fields.map((f) => ({
            success: false,
            field: f.selector,
            value: f.value,
            error: 'Main world bridge timeout',
            method: 'bridge-timeout',
          })),
        });
      }
    }, timeoutMs);
  });
}
