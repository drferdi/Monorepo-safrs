// Designed and constructed by Drferdi.
/**
 * Sentra Assist — MAIN World Bridge Script
 *
 * This content script runs in the PAGE's main world (not isolated).
 * It can directly access ePuskesmas JavaScript functions like showRiwayatPelayanan().
 *
 * Communication with the isolated-world content script (content.ts) is via window.postMessage.
 * Chrome injects this script natively — NOT via <script> tag — so CSP does NOT block it.
 *
 * @module entrypoints/inject.content
 */

import { pickExactStaffMatch, staffSearchTerm } from '@/lib/filler/staff-match';
import { pickExactSuggestion } from '@/lib/filler/suggestion-match';
import { riwayatDebugLog, riwayatDebugWarn } from '@/utils/debug-flags';
import { createLogger } from '@/utils/logger';

const mainWorldLog = createLogger('SentraMainWorld', 'content');

export default defineContentScript({
  matches: ['*://*.epuskesmas.id/*'],
  world: 'MAIN',
  runAt: 'document_idle',

  main() {
    riwayatDebugLog('[SentraMainWorld] Bridge script loaded in MAIN world');

    // PHASE 1 DIAGNOSTIC: Check jQuery availability
    const win = window as unknown as Record<string, unknown>;
    const hasJQuery = typeof win.$ === 'function';
    const hasJQueryUI = hasJQuery && typeof (win.$ as { ui?: unknown }).ui === 'object';

    mainWorldLog.debug('jQuery availability', { hasJQuery, hasJQueryUI });

    if (!hasJQuery) {
      mainWorldLog.error(
        '[MainWorld] ❌ CRITICAL: jQuery not available! Autocomplete filling will fail.'
      );
    }
    if (!hasJQueryUI) {
      mainWorldLog.warn(
        '[MainWorld] ⚠️  WARNING: jQuery UI not detected. Autocomplete may not work properly.'
      );
    }

    const getPanelTextLength = (): number => {
      const panel =
        document.querySelector('#modal .modal-form') ||
        document.querySelector('.modal .modal-form') ||
        document.querySelector('#print_area_anamnesa') ||
        document.querySelector('#anamnesa_riwayat');
      return panel?.textContent?.trim().length || 0;
    };

    const getModalFormHtml = (): string => {
      const form =
        document.querySelector('#modal .modal-form') ||
        document.querySelector('.modal .modal-form');
      return (form as HTMLElement | null)?.innerHTML || '';
    };

    // Listen for trigger messages from isolated world content script
    window.addEventListener('message', (event) => {
      // Only accept messages from same window (not iframes)
      if (event.source !== window) return;

      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;

      // ================================================================
      // DIAGNOSTIC: Ping bridge readiness from isolated world
      // ================================================================
      if (msg.type === 'sentra-ping-main-world') {
        const win = window as unknown as Record<string, unknown>;
        const appConfig = (win.AppLayoutConfig as Record<string, unknown> | undefined) || {};
        const urls = (appConfig.urls as Record<string, unknown> | undefined) || {};

        // Attempt to extract URL from function source
        let extractedUrl: string | undefined;
        if (typeof win.showRiwayatPelayanan === 'function') {
          try {
            const fnStr = win.showRiwayatPelayanan.toString();

            // Pattern 1: Object property "url: '...'" (standard $.ajax)
            // supports: url: "foo", url :"foo", url:'foo'
            const matchUrlProp = fnStr.match(/url\s*:\s*(['"`])(.*?)\1/);

            // Pattern 2: $.get('...') or $.post('...')
            // supports: $.get("foo", ...), $.post('foo', ...)
            const matchGet = fnStr.match(/\$\.(?:get|post|ajax)\s*\(\s*(['"`])(.*?)\1/);

            if (matchUrlProp && matchUrlProp[2]) {
              extractedUrl = matchUrlProp[2];
            } else if (matchGet && matchGet[2]) {
              extractedUrl = matchGet[2];
            }

            if (extractedUrl) {
              riwayatDebugLog(`[SentraMainWorld] Extracted URL candidate: ${extractedUrl}`);
            } else {
              riwayatDebugLog(
                `[SentraMainWorld] Regex failed to extract URL from: ${fnStr.substring(0, 100)}...`
              );
            }
          } catch (e) {
            riwayatDebugLog(`[SentraMainWorld] Failed to extract URL: ${e}`);
          }
        }

        window.postMessage(
          {
            type: 'sentra-main-world-ready',
            success: true,
            hasShowRiwayat: typeof win.showRiwayatPelayanan === 'function',
            showRiwayatUrl:
              typeof urls.showRiwayatPelayanan === 'string'
                ? (urls.showRiwayatPelayanan as string)
                : extractedUrl, // Use extracted URL as fallback if config is missing
            hasJQueryAjax: typeof win.$ === 'function',
          },
          '*'
        );
        return;
      }

      // ================================================================
      // TRIGGER: Call showRiwayatPelayanan() for a specific data-id
      // ================================================================
      if (msg.type === 'sentra-trigger-riwayat' && msg.dataId) {
        const dataId = String(msg.dataId);
        riwayatDebugLog(`[SentraMainWorld] Triggering showRiwayatPelayanan for data-id=${dataId}`);

        try {
          const el = document.querySelector(`a[data-id="${dataId}"]`);
          if (!el) {
            riwayatDebugWarn(`[SentraMainWorld] Element a[data-id="${dataId}"] not found`);
            window.postMessage(
              {
                type: 'sentra-riwayat-result',
                dataId,
                success: false,
                error: 'Element not found',
              },
              '*'
            );
            return;
          }

          const anchor = el as HTMLAnchorElement;
          const beforePanelLen = getPanelTextLength();
          const beforeModalHtmlLen = getModalFormHtml().length;

          // Prevent navigation when synthetic click is dispatched.
          const preventNav = (e: MouseEvent): void => {
            if (e.target === anchor || (e.target instanceof Node && anchor.contains(e.target))) {
              e.preventDefault();
              e.stopImmediatePropagation();
            }
          };
          document.addEventListener('click', preventNav, true);

          let methodUsed = 'none';
          const win = window as unknown as Record<string, unknown>;
          const maybeFn = win.showRiwayatPelayanan;
          const hasShowRiwayat = typeof maybeFn === 'function';

          if (hasShowRiwayat) {
            (maybeFn as (node: Element) => void)(anchor);
            methodUsed = 'window.showRiwayatPelayanan(el)';
          } else if (typeof anchor.onclick === 'function') {
            const evt = new PointerEvent('click', {
              bubbles: true,
              cancelable: true,
              view: window,
            });
            anchor.onclick.call(anchor, evt);
            methodUsed = 'anchor.onclick(event)';
          } else {
            methodUsed = 'no-supported-trigger';
          }

          setTimeout(() => {
            document.removeEventListener('click', preventNav, true);
          }, 1100);

          setTimeout(() => {
            const afterPanelLen = getPanelTextLength();
            const modalFormHtml = getModalFormHtml();
            const panelChanged = afterPanelLen > beforePanelLen;
            const modalChanged = modalFormHtml.length > beforeModalHtmlLen;
            riwayatDebugLog(
              `[SentraMainWorld] Trigger done data-id=${dataId} method=${methodUsed} before=${beforePanelLen} after=${afterPanelLen} modalLen=${modalFormHtml.length}`
            );

            window.postMessage(
              {
                type: 'sentra-riwayat-result',
                dataId,
                success: methodUsed !== 'no-supported-trigger',
                methodUsed,
                hasShowRiwayat,
                panelChanged,
                modalChanged,
                beforePanelLen,
                afterPanelLen,
                modalFormHtml,
              },
              '*'
            );
          }, 1200);
        } catch (err) {
          mainWorldLog.error('[SentraMainWorld] Error calling showRiwayatPelayanan', err);
          window.postMessage(
            {
              type: 'sentra-riwayat-result',
              dataId,
              success: false,
              error: String(err),
            },
            '*'
          );
        }
      }
      if (msg.type === 'sentra-native-fetch-request' && msg.dataId) {
        const dataId = String(msg.dataId);
        const puskesmas =
          typeof msg.puskesmas === 'string' && msg.puskesmas.trim().length > 0
            ? msg.puskesmas.trim()
            : undefined;

        const win = window as unknown as Record<string, unknown>;
        const appConfig = (win.AppLayoutConfig as Record<string, unknown> | undefined) || {};
        const urls = (appConfig.urls as Record<string, unknown> | undefined) || {};
        const csrfToken = (appConfig.csrfToken as string | undefined) || '';
        let targetUrl = '';

        // Primary URL source follows ePuskesmas runtime config.
        if (typeof urls.showRiwayatPelayanan === 'string' && urls.showRiwayatPelayanan) {
          targetUrl = urls.showRiwayatPelayanan;
        }

        // Fallback URL extraction from function source.
        if (!targetUrl && typeof win.showRiwayatPelayanan === 'function') {
          try {
            const fnStr = win.showRiwayatPelayanan.toString();
            const matchUrlProp = fnStr.match(/url\s*:\s*(['"`])(.*?)\1/);
            const matchGet = fnStr.match(/\$\.(?:get|post|ajax)\s*\(\s*(['"`])(.*?)\1/);
            if (matchUrlProp?.[2]) targetUrl = matchUrlProp[2];
            else if (matchGet?.[2]) targetUrl = matchGet[2];
          } catch {
            // ignore extraction failure
          }
        }

        if (!targetUrl) {
          window.postMessage(
            {
              type: 'sentra-native-fetch-response',
              dataId,
              success: false,
              error: 'showRiwayatPelayanan URL not found',
            },
            '*'
          );
          return;
        }

        const anchor = document.querySelector(`a[data-id="${dataId}"]`) as HTMLAnchorElement | null;
        const inferredPuskesmas =
          puskesmas || anchor?.getAttribute('data-puskesmas') || anchor?.dataset?.puskesmas || '';
        const requestData: Record<string, string> = { id: dataId };
        if (inferredPuskesmas) requestData.puskesmas = inferredPuskesmas;
        if (csrfToken) requestData._token = csrfToken;

        // Priority: jQuery AJAX to mirror host implementation, fallback native fetch.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const $ = (win.$ || win.jQuery) as any;
        if ($ && typeof $.ajax === 'function') {
          $.ajax({
            url: targetUrl,
            type: 'GET',
            data: requestData,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            success: (data: any) => {
              let content = '';
              if (typeof data === 'string') {
                content = data;
              } else if (typeof data === 'object' && data) {
                content =
                  data.form || data.html || data.data || data.content || JSON.stringify(data);
              }

              window.postMessage(
                {
                  type: 'sentra-native-fetch-response',
                  dataId,
                  success: true,
                  content,
                },
                '*'
              );
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            error: (_xhr: any, status: any, err: any) => {
              window.postMessage(
                {
                  type: 'sentra-native-fetch-response',
                  dataId,
                  success: false,
                  error: `${status || 'ajax-error'}:${String(err || '')}`,
                },
                '*'
              );
            },
          });
        } else {
          const urlObj = new URL(targetUrl, window.location.origin);
          Object.entries(requestData).forEach(([k, v]) => {
            if (v) urlObj.searchParams.set(k, v);
          });

          fetch(urlObj.toString(), { credentials: 'include' })
            .then((r) => r.text())
            .then((text) => {
              window.postMessage(
                {
                  type: 'sentra-native-fetch-response',
                  dataId,
                  success: true,
                  content: text,
                },
                '*'
              );
            })
            .catch((e) => {
              window.postMessage(
                {
                  type: 'sentra-native-fetch-response',
                  dataId,
                  success: false,
                  error: String(e),
                },
                '*'
              );
            });
        }
      }
    });

    // ================================================================
    // FILL: jQuery-powered form filling from isolated world
    // ================================================================

    /**
     * Fill a single field using jQuery (MAIN WORLD — has access to page's jQuery)
     * Supports: text, select, autocomplete (jQuery UI)
     */
    const fillFieldJQ = async (
      field: {
        selector: string;
        value: string;
        type: 'text' | 'select' | 'autocomplete';
        autocompleteTimeout?: number;
        requireExactMatch?: boolean;
        matchMode?: 'exact';
      },
      _requestId: string
    ): Promise<{
      success: boolean;
      field: string;
      value: string;
      error?: string;
      method: string;
    }> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const $ = (window as any).$ || (window as any).jQuery;
      if (!$ || typeof $ !== 'function') {
        return {
          success: false,
          field: field.selector,
          value: field.value,
          error: 'jQuery not available',
          method: 'jq-unavailable',
        };
      }

      const $el = $(field.selector);
      if (!$el.length) {
        return {
          success: false,
          field: field.selector,
          value: field.value,
          error: `Element not found: ${field.selector}`,
          method: 'jq-not-found',
        };
      }

      try {
        if (field.type === 'select') {
          // Strategy 1: Direct value match
          $el.val(field.value);
          if ($el.val() === field.value) {
            $el.trigger('change');
            return {
              success: true,
              field: field.selector,
              value: field.value,
              method: 'jq-select-value',
            };
          }

          // Strategy 2: Match by option text
          const $options = $el.find('option');
          let matched = false;
          $options.each(function (this: HTMLOptionElement) {
            const optText = ($(this).text() || '').trim().toUpperCase();
            const target = field.value.trim().toUpperCase();
            if (optText === target || optText.includes(target) || target.includes(optText)) {
              $el.val($(this).val());
              matched = true;
              return false; // break
            }
          });
          if (matched) {
            $el.trigger('change');
            return {
              success: true,
              field: field.selector,
              value: String($el.val()),
              method: 'jq-select-text',
            };
          }

          return {
            success: false,
            field: field.selector,
            value: field.value,
            error: 'No matching option',
            method: 'jq-select-fail',
          };
        }

        if (field.type === 'autocomplete') {
          const timeout = field.autocompleteTimeout || 3000;

          // Check if jQuery UI autocomplete is attached
          const hasAutocomplete =
            typeof $el.autocomplete === 'function' && $el.data('ui-autocomplete');

          if (hasAutocomplete) {
            // Clear and set value — the exact-match mode types only the core name so the
            // server-side search returns candidates, then matches those against the full name.
            const searchValue = field.requireExactMatch
              ? staffSearchTerm(field.value)
              : field.value;
            $el.val(searchValue);
            $el.autocomplete('search', searchValue);

            // Wait for dropdown to appear
            const result = await new Promise<{ success: boolean; selectedValue: string }>(
              (resolve) => {
                let resolved = false;

                // Listen for autocomplete select/response
                const checkDropdown = () => {
                  const $menu = $('.ui-autocomplete:visible .ui-menu-item');
                  if ($menu.length === 0) return;

                  // Find best match
                  let $best = $menu.first();
                  let hasMatch = true;

                  if (field.requireExactMatch) {
                    const itemTexts = $menu.toArray().map((el: HTMLElement) => $(el).text() || '');
                    const index = pickExactStaffMatch(itemTexts, field.value);
                    if (index < 0) {
                      // No single exact match yet — keep polling until one appears or timeout.
                      hasMatch = false;
                    } else {
                      $best = $menu.eq(index);
                    }
                  } else if (field.matchMode === 'exact') {
                    // Only the item that is exactly the value, e.g. signa "3X1" and not "3X1/2".
                    const itemTexts = $menu.toArray().map((el: HTMLElement) => $(el).text() || '');
                    const index = pickExactSuggestion(itemTexts, field.value);
                    if (index < 0) hasMatch = false;
                    else $best = $menu.eq(index);
                  } else {
                    const searchLower = field.value.toLowerCase();
                    $menu.each(function (this: HTMLElement) {
                      const text = ($(this).text() || '').toLowerCase();
                      if (text.includes(searchLower)) {
                        $best = $(this);
                        return false; // break — found match
                      }
                    });
                  }

                  if (!hasMatch) return;

                  // Click the item via jQuery UI menu
                  $best
                    .find('a, .ui-menu-item-wrapper')
                    .first()
                    .trigger('mouseenter')
                    .trigger('click');
                  if (!resolved) {
                    resolved = true;
                    // Give time for hidden fields to populate
                    setTimeout(() => {
                      resolve({ success: true, selectedValue: String($el.val()) });
                    }, 300);
                  }
                };

                // Poll for dropdown
                const interval = setInterval(checkDropdown, 200);

                // Timeout
                setTimeout(() => {
                  clearInterval(interval);
                  if (!resolved) {
                    resolved = true;
                    if (field.requireExactMatch) {
                      // No exact match found in time — clear the field rather than risk the
                      // wrong practitioner being written into the record.
                      $el.val('').trigger('change').trigger('blur');
                      resolve({ success: false, selectedValue: '' });
                    } else {
                      // Last resort: just trigger change on whatever we typed
                      $el.trigger('change').trigger('blur');
                      resolve({ success: false, selectedValue: String($el.val()) });
                    }
                  }
                }, timeout);
              }
            );

            if (result.success) {
              return {
                success: true,
                field: field.selector,
                value: result.selectedValue,
                method: 'jq-autocomplete',
              };
            }
            return {
              success: false,
              field: field.selector,
              value: field.requireExactMatch ? result.selectedValue : field.value,
              error: field.requireExactMatch
                ? 'Nama tenaga medis tidak cocok persis di ePuskesmas'
                : field.matchMode === 'exact'
                  ? 'Tidak ada saran yang cocok persis'
                  : 'Autocomplete dropdown not appeared',
              method: 'jq-autocomplete-fail',
            };
          }

          // Fallback: no jQuery UI autocomplete, try direct val + events
          $el.val(field.value).trigger('input').trigger('change').trigger('blur');
          return {
            success: true,
            field: field.selector,
            value: field.value,
            method: 'jq-text-fallback',
          };
        }

        // Default: text field
        $el.val(field.value).trigger('input').trigger('change').trigger('blur');
        return { success: true, field: field.selector, value: field.value, method: 'jq-text' };
      } catch (err) {
        return {
          success: false,
          field: field.selector,
          value: field.value,
          error: String(err),
          method: 'jq-error',
        };
      }
    };

    window.addEventListener('message', async (event) => {
      if (event.source !== window) return;
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;

      // ================================================================
      // FILL FIELDS: Batch fill request from isolated world
      // ================================================================
      if (msg.type === 'sentra-fill-fields' && Array.isArray(msg.fields)) {
        const requestId = msg.requestId || 'unknown';
        riwayatDebugLog(
          `[SentraMainWorld] Fill request: ${msg.fields.length} fields, id=${requestId}`
        );

        const results: Array<{
          success: boolean;
          field: string;
          value: string;
          error?: string;
          method: string;
        }> = [];
        const delayMs = msg.delayBetweenFields || 150;

        for (const field of msg.fields) {
          const result = await fillFieldJQ(field, requestId);
          results.push(result);
          riwayatDebugLog(
            `[SentraMainWorld] Fill ${result.success ? '✓' : '✗'} ${field.selector} = "${field.value}" (${result.method})`
          );

          // Delay between fields
          if (delayMs > 0) {
            await new Promise((r) => setTimeout(r, delayMs));
          }
        }

        const successCount = results.filter((r) => r.success).length;
        const failCount = results.filter((r) => !r.success).length;
        riwayatDebugLog(
          `[SentraMainWorld] Fill complete: ${successCount} success, ${failCount} failed`
        );

        window.postMessage(
          {
            type: 'sentra-fill-fields-response',
            requestId,
            results,
            successCount,
            failCount,
          },
          '*'
        );
      }
    });

    riwayatDebugLog(
      '[SentraMainWorld] Bridge ready — listening for sentra-trigger-riwayat + sentra-fill-fields messages'
    );
  },
});
