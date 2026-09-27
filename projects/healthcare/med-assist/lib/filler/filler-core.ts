// Designed and constructed by Drferdi.
/**
 * Precision-Architected. Future-Built by Docsyanpse
 * Sentra Healthcare Artificial Intelligence
 */

/**
 * Sentra Assist - Filler Core
 * Event dispatch engine for auto-fill form fields in ePuskesmas
 *
 * Event Chains (per PRD Section 9.2):
 * - Text fields: input → change → blur
 * - Select dropdowns: change only
 * - Checkboxes: click → change
 * - AJAX autocomplete: focus → input → keydown → wait → click item
 */

import { pickExactStaffMatch, staffSearchTerm } from '@/lib/filler/staff-match';
import { truncateRMEText } from '@/lib/rme/truncate';
import { waitForElement } from '@/lib/scraper/dom-utils';
import { createLogger } from '@/utils/logger';

const fillerLog = createLogger('Filler', 'filler');

// ============================================================================
// TYPES
// ============================================================================

export interface FillResult {
  success: boolean;
  field: string;
  value: string | number | boolean;
  method: 'direct' | 'autocomplete' | 'select' | 'checkbox' | 'radio';
  error?: string;
}

/**
 * AutocompleteOptions interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-02-04
 */

export interface AutocompleteOptions {
  timeout?: number;
  dropdownSelector?: string;
  retries?: number;
  typeDelay?: number;
  allowFirstItemFallback?: boolean;
  requireDropdownSelection?: boolean;
  ignoreExistingDropdown?: boolean;
  requireExactMatch?: boolean;
}

// ============================================================================
// SAFETY HELPERS
// ============================================================================

/**
 * Check if element is readonly or disabled
 */
export function isFieldReadonly(element: HTMLElement): boolean {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return element.readOnly || element.disabled;
  }
  if (element instanceof HTMLSelectElement) {
    return element.disabled;
  }
  return element.hasAttribute('readonly') || element.hasAttribute('disabled');
}

/**
 * Check if element is a CSRF token field (should never be modified)
 */
export function isFieldCsrf(element: HTMLElement): boolean {
  if (element instanceof HTMLInputElement) {
    const name = (element.name || '').toLowerCase();
    const id = (element.id || '').toLowerCase();
    return (
      name.includes('csrf') ||
      name.includes('token') ||
      name.includes('_token') ||
      id.includes('csrf') ||
      id.includes('token')
    );
  }
  return false;
}

// ============================================================================
// NATIVE VALUE SETTERS
// ============================================================================

const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype,
  'value'
)?.set;

const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
  HTMLTextAreaElement.prototype,
  'value'
)?.set;

/**
 * Set element value using native setter to bypass framework overrides.
 * Frameworks (React, jQuery plugins, ePuskesmas custom scripts) may override
 * the value setter — using the native prototype setter ensures the DOM value
 * is always updated and framework-level change detection fires correctly.
 */
function setNativeValue(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string
): void {
  if (element instanceof HTMLInputElement && nativeInputValueSetter) {
    nativeInputValueSetter.call(element, value);
  } else if (element instanceof HTMLTextAreaElement && nativeTextAreaValueSetter) {
    nativeTextAreaValueSetter.call(element, value);
  } else {
    element.value = value;
  }
}

// ============================================================================
// EVENT DISPATCH
// ============================================================================

/**
 * Create the correct Event subclass for each event type.
 * ePuskesmas / jQuery / framework handlers may check event properties
 * that only exist on the proper subclass (e.g. InputEvent.inputType).
 */
function createDomEvent(eventName: string): Event {
  switch (eventName) {
    case 'input':
      return new InputEvent('input', {
        bubbles: true,
        cancelable: false,
        inputType: 'insertText',
      });
    case 'focus':
    case 'blur':
    case 'focusin':
    case 'focusout':
      return new FocusEvent(eventName, { bubbles: true });
    case 'click':
    case 'mousedown':
    case 'mouseup':
      return new MouseEvent(eventName, { bubbles: true, cancelable: true });
    default:
      return new Event(eventName, { bubbles: true, cancelable: true });
  }
}

/**
 * Dispatch a chain of events on an element with proper timing
 * @param element Target DOM element
 * @param events Array of event names to dispatch
 * @param delayMs Delay between events (default: 10ms)
 */
export async function dispatchEventChain(
  element: HTMLElement,
  events: string[],
  delayMs: number = 10
): Promise<void> {
  for (const eventName of events) {
    const event = createDomEvent(eventName);
    element.dispatchEvent(event);

    fillerLog.debug(`[Filler] Dispatched: ${eventName}`);

    if (delayMs > 0) {
      await sleep(delayMs);
    }
  }
}

/**
 * Dispatch keyboard event (for autocomplete trigger)
 */
export function dispatchKeyboardEvent(
  element: HTMLElement,
  eventName: string,
  key: string = 'ArrowDown',
  keyCode: number = 40
): void {
  const event = new KeyboardEvent(eventName, {
    bubbles: true,
    cancelable: true,
    key,
    keyCode,
    which: keyCode,
  });
  element.dispatchEvent(event);
}

// ============================================================================
// FIELD FILLERS
// ============================================================================

/**
 * Fill a text input field
 * Event chain: input → change → blur
 * SKIP if field already has value (user manual input)
 * UNLESS forceOverride is true (for mandatory fields)
 */
export async function fillTextField(
  selector: string,
  value: string,
  forceOverride: boolean = false
): Promise<FillResult> {
  const field = 'text:' + selector;
  const safeValue = truncateRMEText(value);

  try {
    const element = await waitForElement(selector, 3000);

    if (
      !element ||
      !(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)
    ) {
      return {
        success: false,
        field,
        value: safeValue,
        method: 'direct',
        error: 'Element not found or wrong type',
      };
    }

    if (isFieldReadonly(element)) {
      fillerLog.warn(`[Filler] Skipped readonly: ${selector}`);
      return {
        success: false,
        field,
        value: safeValue,
        method: 'direct',
        error: 'Field is readonly',
      };
    }

    if (isFieldCsrf(element)) {
      fillerLog.warn(`[Filler] Skipped CSRF field: ${selector}`);
      return {
        success: false,
        field,
        value: safeValue,
        method: 'direct',
        error: 'CSRF field protected',
      };
    }

    // SKIP if field already has value (user manual input - don't overwrite)
    // UNLESS forceOverride is true (for mandatory fields like dokter, perawat, keluhan)
    if (element.value && element.value.trim().length > 0 && !forceOverride) {
      fillerLog.debug(
        `[Filler] Skipped (has value): ${selector} = "${element.value.substring(0, 20)}..."`
      );
      return { success: true, field, value: element.value, method: 'direct' };
    }

    // If forceOverride is true, log that we're overriding
    if (forceOverride && element.value && element.value.trim().length > 0) {
      fillerLog.debug(
        `[Filler] ⚠️ FORCE OVERRIDE: ${selector} - Old: "${element.value.substring(0, 20)}..." → New: "${safeValue.substring(0, 20)}..."`
      );
    }

    // Focus first so ePuskesmas registers the field as active
    element.focus();
    await dispatchEventChain(element, ['focus'], 0);

    // Set value via native setter (bypasses framework overrides)
    setNativeValue(element, safeValue);

    // Dispatch event chain with proper event types
    await dispatchEventChain(element, ['input', 'change', 'blur']);

    // Visual feedback - yellow highlight
    highlightField(element);

    fillerLog.debug(`[Filler] ✓ Text filled: ${selector} = "${safeValue}"`);
    return { success: true, field, value: safeValue, method: 'direct' };
  } catch (error) {
    fillerLog.error(`[Filler] Error filling text ${selector}:`, error);
    return { success: false, field, value: safeValue, method: 'direct', error: String(error) };
  }
}

/**
 * Fill a number input field
 * Event chain: input → change → blur
 * SKIP if field already has value (user manual input)
 */
export async function fillNumberField(selector: string, value: number): Promise<FillResult> {
  fillerLog.debug('fillNumberField called for', selector, '=', value);
  const field = 'number:' + selector;

  try {
    const element = await waitForElement(selector, 3000);

    if (!element || !(element instanceof HTMLInputElement)) {
      fillerLog.warn(`[Filler] Element NOT FOUND for: ${selector}`);
      return {
        success: false,
        field,
        value,
        method: 'direct',
        error: 'Element not found or wrong type',
      };
    }

    // DEBUG: Log which element was found
    fillerLog.debug(
      `[Filler] Found element: id="${element.id}", name="${element.name}", currentValue="${element.value}"`
    );

    if (isFieldReadonly(element)) {
      return { success: false, field, value, method: 'direct', error: 'Field is readonly' };
    }

    // SKIP if field already has value (user manual input - don't overwrite)
    const currentValue = element.value?.trim() || '';
    if (currentValue.length > 0) {
      fillerLog.debug(
        `[Filler] ⏭️ SKIPPED (has value): ${selector} = "${currentValue}" - NOT overwriting`
      );
      return { success: true, field, value: Number(currentValue), method: 'direct' };
    }

    // Set value (field is empty) via native setter
    fillerLog.debug(`[Filler] Field empty, filling: ${selector} = ${value}`);
    element.focus();
    await dispatchEventChain(element, ['focus'], 0);
    setNativeValue(element, String(value));

    // Dispatch event chain with proper event types
    await dispatchEventChain(element, ['input', 'change', 'blur']);

    highlightField(element);

    fillerLog.debug(`[Filler] ✓ Number filled: ${selector} = ${value}`);
    return { success: true, field, value, method: 'direct' };
  } catch (error) {
    fillerLog.error(`[Filler] Error filling number ${selector}:`, error);
    return { success: false, field, value, method: 'direct', error: String(error) };
  }
}

/**
 * Fill a textarea field
 * Event chain: input → change → blur
 * SKIP if field already has value (user manual input)
 * UNLESS forceOverride is true (for mandatory fields)
 */
export async function fillTextarea(
  selector: string,
  value: string,
  forceOverride: boolean = false
): Promise<FillResult> {
  return fillTextField(selector, value, forceOverride); // Same logic as text field
}

/**
 * Fill a select dropdown
 * Event chain: change only
 * SKIP if field already has non-default value (user manual selection)
 */
export async function fillSelect(selector: string, value: string): Promise<FillResult> {
  const field = 'select:' + selector;

  try {
    const element = await waitForElement(selector, 3000);

    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      if (isFieldReadonly(element)) {
        return { success: false, field, value, method: 'select', error: 'Field is readonly' };
      }

      const currentVal = element.value.trim();
      if (currentVal) {
        fillerLog.debug(
          `[Filler] Skipped text-backed select (has value): ${selector} = "${currentVal}"`
        );
        return { success: true, field, value: currentVal, method: 'select' };
      }

      element.focus();
      await dispatchEventChain(element, ['focus'], 0);
      setNativeValue(element, value);
      await dispatchEventChain(element, ['input', 'change', 'blur']);
      highlightField(element);

      fillerLog.debug(`[Filler] ✓ Text-backed select filled: ${selector} = "${value}"`);
      return { success: true, field, value, method: 'select' };
    }

    if (!element || !(element instanceof HTMLSelectElement)) {
      return {
        success: false,
        field,
        value,
        method: 'select',
        error: 'Element not found or wrong type',
      };
    }

    if (isFieldReadonly(element)) {
      return { success: false, field, value, method: 'select', error: 'Field is readonly' };
    }

    // SKIP if field already has value selected (not default/empty)
    // Check if current value is meaningful (not empty, not "0", not first option placeholder)
    const currentVal = element.value;
    const firstOption = element.options[0]?.value || '';
    if (currentVal && currentVal !== '' && currentVal !== '0' && currentVal !== firstOption) {
      fillerLog.debug(`[Filler] Skipped (has value): ${selector} = "${currentVal}"`);
      return { success: true, field, value: currentVal, method: 'select' };
    }

    // Set value via native setter (must match <option value="...">)
    setNativeValue(element, value);

    // Dispatch change event
    await dispatchEventChain(element, ['change']);

    highlightField(element);

    fillerLog.debug(`[Filler] ✓ Select filled: ${selector} = "${value}"`);
    return { success: true, field, value, method: 'select' };
  } catch (error) {
    fillerLog.error(`[Filler] Error filling select ${selector}:`, error);
    return { success: false, field, value, method: 'select', error: String(error) };
  }
}

/**
 * Fill a checkbox
 * Event chain: click → change
 */
export async function fillCheckbox(selector: string, checked: boolean): Promise<FillResult> {
  const field = 'checkbox:' + selector;

  try {
    const element = await waitForElement(selector, 3000);

    if (!element || !(element instanceof HTMLInputElement) || element.type !== 'checkbox') {
      return {
        success: false,
        field,
        value: checked,
        method: 'checkbox',
        error: 'Element not found or wrong type',
      };
    }

    // Skip if already in desired state
    if (element.checked === checked) {
      fillerLog.debug(
        `[Filler] Checkbox already ${checked ? 'checked' : 'unchecked'}: ${selector}`
      );
      return { success: true, field, value: checked, method: 'checkbox' };
    }

    // Set checked state
    element.checked = checked;

    // Dispatch click + change
    await dispatchEventChain(element, ['click', 'change']);

    fillerLog.debug(`[Filler] ✓ Checkbox ${checked ? 'checked' : 'unchecked'}: ${selector}`);
    return { success: true, field, value: checked, method: 'checkbox' };
  } catch (error) {
    fillerLog.error(`[Filler] Error filling checkbox ${selector}:`, error);
    return { success: false, field, value: checked, method: 'checkbox', error: String(error) };
  }
}

/**
 * Fill a radio button
 * The selector should include the value, e.g., input[name="field"][value="option"]
 * Event chain: click → change
 */
export async function fillRadio(selector: string, value: string): Promise<FillResult> {
  const field = 'radio:' + selector;

  try {
    const element = await waitForElement(selector, 3000);

    if (!element || !(element instanceof HTMLInputElement) || element.type !== 'radio') {
      return {
        success: false,
        field,
        value,
        method: 'radio',
        error: 'Element not found or wrong type',
      };
    }

    // Skip if already checked
    if (element.checked) {
      fillerLog.debug(`[Filler] Radio already checked: ${selector}`);
      return { success: true, field, value, method: 'radio' };
    }

    // Click to select radio
    element.checked = true;

    // Dispatch click + change
    await dispatchEventChain(element, ['click', 'change']);

    // Trigger any onchange handler
    if (typeof element.onchange === 'function') {
      element.onchange(new Event('change'));
    }

    fillerLog.debug(`[Filler] ✓ Radio selected: ${selector}`);
    return { success: true, field, value, method: 'radio' };
  } catch (error) {
    fillerLog.error(`[Filler] Error filling radio ${selector}:`, error);
    return { success: false, field, value, method: 'radio', error: String(error) };
  }
}

// ============================================================================
// AJAX AUTOCOMPLETE FILLER
// ============================================================================

/**
 * Fill an AJAX autocomplete field
 * Event chain: focus → input (typing) → keydown → wait for dropdown → click item
 *
 * This is the most complex filler as it needs to:
 * 1. Simulate typing character by character
 * 2. Wait for AJAX dropdown to appear
 * 3. Find and click the matching item
 */
export async function fillAutocomplete(
  selector: string,
  value: string,
  options: AutocompleteOptions = {}
): Promise<FillResult> {
  const safeValue = truncateRMEText(value);
  const {
    timeout = 1000,
    dropdownSelector = '.ui-autocomplete .ui-menu-item, .dropdown-menu .dropdown-item, .autocomplete-results li, .tt-suggestion',
    retries = 2,
    typeDelay = 50,
    allowFirstItemFallback = true,
    requireDropdownSelection = false,
    ignoreExistingDropdown = false,
    requireExactMatch = false,
  } = options;

  const field = 'autocomplete:' + selector;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // 1. Find input field
      const input = await waitForElement(selector, 3000);

      if (!input || !(input instanceof HTMLInputElement)) {
        return {
          success: false,
          field,
          value: safeValue,
          method: 'autocomplete',
          error: 'Input not found',
        };
      }

      if (isFieldReadonly(input)) {
        return {
          success: false,
          field,
          value: safeValue,
          method: 'autocomplete',
          error: 'Field is readonly',
        };
      }

      // 2. Clear existing value and focus
      setNativeValue(input, '');
      input.focus();
      await dispatchEventChain(input, ['focus'], 0);

      // 3. Simulate typing character by character
      const typedValue = requireExactMatch ? staffSearchTerm(safeValue) : safeValue;
      fillerLog.debug(`[Filler] Typing: "${typedValue}"`);
      for (let i = 0; i < typedValue.length; i++) {
        const current = typedValue.substring(0, i + 1);
        const typedChar = typedValue[i] || '';
        setNativeValue(input, current);
        await dispatchEventChain(input, ['input'], 0);
        dispatchKeyboardEvent(
          input,
          'keyup',
          typedChar || 'Unidentified',
          typedChar ? typedChar.toUpperCase().charCodeAt(0) : 0
        );
        if (typeDelay > 0) {
          await sleep(typeDelay);
        }
      }

      // 4. Trigger AJAX call with keydown
      dispatchKeyboardEvent(input, 'keydown', 'ArrowDown', 40);

      // 5. Wait for dropdown to appear
      fillerLog.debug(`[Filler] Waiting for dropdown (${timeout}ms)...`);
      const dropdown = await waitForDropdown(dropdownSelector, timeout, ignoreExistingDropdown);

      if (!dropdown) {
        if (requireDropdownSelection || requireExactMatch) {
          if (attempt < retries) {
            fillerLog.warn(
              `[Filler] Dropdown required but missing, retry ${attempt + 1}/${retries}...`
            );
            await sleep(300);
            continue;
          }
          if (requireExactMatch) {
            setNativeValue(input, '');
            await dispatchEventChain(input, ['input', 'change', 'blur']);
            return {
              success: false,
              field,
              value: safeValue,
              method: 'autocomplete',
              error: 'Nama tenaga medis tidak cocok persis di ePuskesmas',
            };
          }
          return {
            success: false,
            field,
            value: safeValue,
            method: 'autocomplete',
            error: 'Dropdown not appeared',
          };
        }

        if (attempt < retries) {
          fillerLog.warn(`[Filler] Dropdown not appeared, retry ${attempt + 1}/${retries}...`);
          await sleep(300);
          continue;
        }

        // Fallback: try direct value set if dropdown doesn't appear
        fillerLog.warn(`[Filler] Dropdown not appeared, using direct value`);
        await dispatchEventChain(input, ['change', 'blur']);
        highlightField(input, '#fef3c7'); // Yellow for fallback
        return { success: true, field, value: safeValue, method: 'autocomplete' };
      }

      // 6. Find matching item in dropdown
      const items = document.querySelectorAll(dropdownSelector);
      let matchedItem: HTMLElement | null = null;

      if (requireExactMatch) {
        const itemTexts = Array.from(items).map((item) => item.textContent ?? '');
        const matchIndex = pickExactStaffMatch(itemTexts, safeValue);
        matchedItem = matchIndex >= 0 ? (items[matchIndex] as HTMLElement) : null;
      } else {
        for (const item of items) {
          const text = item.textContent?.toLowerCase() || '';
          if (text.includes(safeValue.toLowerCase())) {
            matchedItem = item as HTMLElement;
            break;
          }
        }

        if (!matchedItem && allowFirstItemFallback && items.length > 0) {
          // Take first item if no exact match
          matchedItem = items[0] as HTMLElement;
          fillerLog.debug(`[Filler] No exact match, using first item`);
        }
      }

      if (!matchedItem) {
        if (attempt < retries) {
          fillerLog.warn(`[Filler] No matching dropdown item, retry ${attempt + 1}/${retries}...`);
          await sleep(250);
          continue;
        }
        if (requireExactMatch) {
          setNativeValue(input, '');
          await dispatchEventChain(input, ['input', 'change', 'blur']);
          return {
            success: false,
            field,
            value: safeValue,
            method: 'autocomplete',
            error: 'Nama tenaga medis tidak cocok persis di ePuskesmas',
          };
        }
        return {
          success: false,
          field,
          value: safeValue,
          method: 'autocomplete',
          error: 'No dropdown items found',
        };
      }

      // 7. Click matched item
      matchedItem.click();
      fillerLog.debug(`[Filler] Clicked: "${matchedItem.textContent?.trim()}"`);

      // 8. Wait for value to be set
      await sleep(200);

      // 9. Verify and dispatch final events
      await dispatchEventChain(input, ['change', 'blur']);
      highlightField(input, '#d1fae5'); // Green for success

      fillerLog.debug(`[Filler] ✓ Autocomplete filled: ${selector} = "${input.value}"`);
      return { success: true, field, value: input.value, method: 'autocomplete' };
    } catch (error) {
      fillerLog.error(`[Filler] Error in autocomplete attempt ${attempt + 1}:`, error);
      if (attempt === retries) {
        return {
          success: false,
          field,
          value: safeValue,
          method: 'autocomplete',
          error: String(error),
        };
      }
    }
  }

  return {
    success: false,
    field,
    value: safeValue,
    method: 'autocomplete',
    error: 'Max retries exceeded',
  };
}

/**
 * Wait for dropdown to appear using MutationObserver
 */
async function waitForDropdown(
  selector: string,
  timeout: number,
  ignoreExisting: boolean = false
): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    // Check if dropdown already visible
    if (!ignoreExisting) {
      const existing = document.querySelector(selector);
      if (existing && isVisible(existing as HTMLElement)) {
        resolve(existing as HTMLElement);
        return;
      }
    }

    // Setup MutationObserver
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        // Check added nodes
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            if (node.matches(selector) || node.querySelector(selector)) {
              observer.disconnect();
              resolve(
                node.matches(selector) ? node : (node.querySelector(selector) as HTMLElement)
              );
              return;
            }
          }
        }

        // Check for visibility changes
        const dropdown = document.querySelector(selector);
        if (dropdown && isVisible(dropdown as HTMLElement)) {
          observer.disconnect();
          resolve(dropdown as HTMLElement);
          return;
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    });

    // Timeout fallback
    setTimeout(() => {
      observer.disconnect();
      // Final check
      const dropdown = document.querySelector(selector);
      resolve(dropdown && isVisible(dropdown as HTMLElement) ? (dropdown as HTMLElement) : null);
    }, timeout);
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if element is visible
 */
function isVisible(element: HTMLElement): boolean {
  return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
}

/**
 * Highlight field with animation (AutoSen-style visual feedback)
 * Creates a pulsing glow effect identical to the Sentra scanning animation
 * NOTE: No scrollIntoView - user doesn't want page to move
 */
function ensureHighlightStyles(): void {
  if (document.getElementById('sentra-autosen-animation')) return;

  const style = document.createElement('style');
  style.id = 'sentra-autosen-animation';
  style.textContent = `
      @keyframes sentra-autosen-scan {
        0% {
          box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.8),
                      0 0 10px rgba(239, 68, 68, 0.4),
                      inset 0 0 5px rgba(239, 68, 68, 0.2);
        }
        25% {
          box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.5),
                      0 0 20px rgba(239, 68, 68, 0.6),
                      inset 0 0 10px rgba(239, 68, 68, 0.3);
        }
        50% {
          box-shadow: 0 0 0 6px rgba(249, 115, 22, 0.5),
                      0 0 25px rgba(249, 115, 22, 0.6),
                      inset 0 0 15px rgba(249, 115, 22, 0.3);
        }
        75% {
          box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.4),
                      0 0 15px rgba(249, 115, 22, 0.4),
                      inset 0 0 8px rgba(249, 115, 22, 0.2);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(249, 115, 22, 0),
                      0 0 0 rgba(249, 115, 22, 0),
                      inset 0 0 0 rgba(249, 115, 22, 0);
        }
      }
      .sentra-autosen-active {
        animation: sentra-autosen-scan 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards !important;
        outline: 2px solid rgba(239, 68, 68, 0.8) !important;
        outline-offset: 2px !important;
      }
    `;
  document.head.appendChild(style);
}

function highlightField(element: HTMLElement, _color: string = '#3B82F6'): void {
  const originalBg = element.style.backgroundColor;
  const originalBoxShadow = element.style.boxShadow;
  const originalOutline = element.style.outline;
  const originalTransition = element.style.transition;

  ensureHighlightStyles();

  // Apply AutoSen animation class (no scroll, no background change - just glow effect)
  element.classList.add('sentra-autosen-active');
  element.style.transition = 'box-shadow 0.2s ease, outline-color 0.2s ease';

  // Remove animation class after completion
  setTimeout(() => {
    element.classList.remove('sentra-autosen-active');
    element.style.backgroundColor = originalBg;
    element.style.boxShadow = originalBoxShadow;
    element.style.outline = originalOutline;
    element.style.transition = originalTransition;
  }, 800);
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// RANGE SLIDER FILLER (for ePuskesmas Skala Nyeri)
// ============================================================================

/**
 * Fill a range slider with associated hidden input
 * Used for ePuskesmas Skala Nyeri (pain scale) which has:
 * - Hidden input: input#skala_nyeri (stores actual value)
 * - Range slider: input#range-slider (visual slider 0-10)
 */
export async function fillRangeSlider(
  hiddenSelector: string,
  sliderSelector: string,
  value: number
): Promise<FillResult> {
  const field = 'range-slider:' + hiddenSelector;

  try {
    // 1. Find hidden input
    const hiddenInput = document.querySelector(hiddenSelector) as HTMLInputElement | null;

    // 2. Find range slider
    const rangeSlider = document.querySelector(sliderSelector) as HTMLInputElement | null;

    fillerLog.debug(`[Filler] Range slider - hidden: ${!!hiddenInput}, slider: ${!!rangeSlider}`);

    if (!hiddenInput && !rangeSlider) {
      return {
        success: false,
        field,
        value,
        method: 'direct',
        error: 'Neither hidden nor slider found',
      };
    }

    // 3. Set value on hidden input via native setter
    if (hiddenInput) {
      setNativeValue(hiddenInput, String(value));
      await dispatchEventChain(hiddenInput, ['input', 'change']);
      fillerLog.debug(`[Filler] ✓ Hidden input set: ${hiddenSelector} = ${value}`);
    }

    // 4. Set value on range slider and trigger visual update
    if (rangeSlider) {
      setNativeValue(rangeSlider, String(value));

      // Dispatch events to trigger visual update
      await dispatchEventChain(rangeSlider, ['input', 'change']);

      // Update background gradient (ePuskesmas slider styling)
      const percentage = (value / 10) * 100;
      rangeSlider.style.background = `linear-gradient(to right, rgb(112, 214, 53) 0%, rgb(168, 224, 68) ${percentage}%, rgb(255, 255, 255) ${percentage}%, white 100%)`;

      highlightField(rangeSlider);
      fillerLog.debug(`[Filler] ✓ Range slider set: ${sliderSelector} = ${value}`);
    }

    return { success: true, field, value, method: 'direct' };
  } catch (error) {
    fillerLog.error(`[Filler] Error filling range slider:`, error);
    return { success: false, field, value, method: 'direct', error: String(error) };
  }
}

// ============================================================================
// CHECKBOX WITH ONCLICK HANDLER (for ePuskesmas aksiCheckMaster)
// ============================================================================

/**
 * Activate checkbox that has onclick handler (like aksiCheckMaster)
 * This is needed for ePuskesmas Keadaan Fisik checkboxes that enable textareas
 * @param selector - Checkbox selector
 * @param shouldCheck - Whether to check (true) or uncheck (false)
 */
export async function activateCheckboxWithOnclick(
  selector: string,
  shouldCheck: boolean = true
): Promise<FillResult> {
  const field = 'checkbox-onclick:' + selector;

  try {
    const element = await waitForElement(selector, 3000);

    if (!element || !(element instanceof HTMLInputElement)) {
      return {
        success: false,
        field,
        value: shouldCheck,
        method: 'checkbox',
        error: 'Element not found',
      };
    }

    // Skip if already in desired state
    if (element.checked === shouldCheck) {
      fillerLog.debug(
        `[Filler] Checkbox already ${shouldCheck ? 'checked' : 'unchecked'}: ${selector}`
      );
      return { success: true, field, value: shouldCheck, method: 'checkbox' };
    }

    // For ePuskesmas checkboxes with onchange="aksiCheckMaster(this,n)"
    // We need to click first (which toggles and fires onchange), NOT set checked manually
    // element.click() will: 1) toggle checked state, 2) fire onclick, 3) fire onchange
    element.click();

    // If click didn't achieve desired state (edge case), set it manually and fire change
    if (element.checked !== shouldCheck) {
      element.checked = shouldCheck;
      await dispatchEventChain(element, ['change']);
    }

    // Wait for any JS to process
    await sleep(100);

    fillerLog.debug(`[Filler] ✓ Checkbox activated: ${selector}`);
    return { success: true, field, value: shouldCheck, method: 'checkbox' };
  } catch (error) {
    fillerLog.error(`[Filler] Error activating checkbox ${selector}:`, error);
    return { success: false, field, value: shouldCheck, method: 'checkbox', error: String(error) };
  }
}

// ============================================================================
// BATCH FILL HELPER
// ============================================================================

export interface FieldMapping {
  selector: string;
  value: string | number | boolean;
  type: 'text' | 'number' | 'textarea' | 'select' | 'checkbox' | 'autocomplete' | 'radio';
  autocompleteOptions?: AutocompleteOptions;
  forceOverride?: boolean; // Always override existing value (for mandatory fields)
}

/**
 * Fill multiple fields with delay between each
 */
export async function fillFields(
  fields: FieldMapping[],
  delayBetweenFields: number = 100
): Promise<FillResult[]> {
  fillerLog.debug('fillFields called with', fields.length, 'fields');
  const results: FillResult[] = [];

  for (let index = 0; index < fields.length; index += 1) {
    const field = fields[index];
    fillerLog.debug(
      'Processing field:',
      field.selector,
      'type:',
      field.type,
      'value:',
      field.value
    );
    let result: FillResult;

    switch (field.type) {
      case 'text':
      case 'textarea':
        result = await fillTextField(field.selector, String(field.value), field.forceOverride);
        break;
      case 'number':
        result = await fillNumberField(field.selector, Number(field.value));
        break;
      case 'select':
        result = await fillSelect(field.selector, String(field.value));
        break;
      case 'checkbox':
        result = await fillCheckbox(field.selector, Boolean(field.value));
        break;
      case 'radio':
        result = await fillRadio(field.selector, String(field.value));
        break;
      case 'autocomplete':
        result = await fillAutocomplete(
          field.selector,
          String(field.value),
          field.autocompleteOptions
        );
        break;
      default:
        result = {
          success: false,
          field: field.selector,
          value: field.value,
          method: 'direct',
          error: 'Unknown type',
        };
    }

    results.push(result);

    if (delayBetweenFields > 0 && index < fields.length - 1) {
      await sleep(delayBetweenFields);
    }
  }

  return results;
}
