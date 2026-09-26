/**
 * Sentra EMR Auto-Fill Engine — Playwright Filler
 * Adaptation dari Sentra Assist filler-core.ts (DOM API) → Playwright Page API.
 *
 * Key differences vs Extension:
 * - fillTextField: page.fill() + page.evaluate(() => $(...).trigger())
 * - fillSelect: page.selectOption()
 * - fillAutocomplete: page.fill() + waitForSelector + click
 * - No main-world-bridge needed: page.evaluate() has direct jQuery access
 * - locateFirst(): helper untuk comma-separated selector lists
 */

import type { Page } from 'playwright'

// jQuery object type used inside page.evaluate() context
interface JQObj {
  trigger: (e: string) => JQObj
}
type JQWindow = Window & { $?: (s: string) => JQObj }

// ============================================================================
// TIMING CONSTANTS (same as assist — do not reduce)
// ============================================================================
export const DELAY_BETWEEN_FIELDS = 100 // ms between fields in batch fill
export const DELAY_AUTOCOMPLETE_TYPE = 50 // ms between keystrokes
export const DELAY_AFTER_VALUE_SET = 200 // ms after autocomplete item clicked

// ============================================================================
// RESULT TYPE
// ============================================================================
export interface FillerResult {
  success: boolean
  field: string
  value: string | number | boolean
  method: 'direct' | 'autocomplete' | 'select' | 'checkbox' | 'radio'
  error?: string
}

// ============================================================================
// HELPER: locate first matching selector from comma-separated list
// ============================================================================

/**
 * Iterate comma-separated selector list, return first that exists in page.
 * Playwright locator() accepts single selectors, so we split and try each.
 */
export async function locateFirst(page: Page, selectors: string): Promise<string | null> {
  const parts = selectors
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  for (const sel of parts) {
    try {
      const count = await page.locator(sel).count()
      if (count > 0) return sel
    } catch {
      // selector syntax error — try next
    }
  }
  return null
}

// ============================================================================
// FILL TEXT FIELD
// Playwright: page.fill() sets value natively.
// Then page.evaluate() triggers jQuery events for ePuskesmas listeners.
// ============================================================================

export async function fillTextField(
  page: Page,
  selectors: string,
  value: string,
  forceOverride = false
): Promise<FillerResult> {
  const sel = await locateFirst(page, selectors)
  if (!sel) {
    return {
      success: false,
      field: selectors,
      value,
      method: 'direct',
      error: 'Element not found',
    }
  }

  try {
    if (!forceOverride) {
      const current = await page
        .locator(sel)
        .first()
        .inputValue()
        .catch(() => '')
      if (current.trim().length > 0) {
        return { success: true, field: sel, value: current, method: 'direct' }
      }
    }

    await page.locator(sel).first().fill(value)

    // Trigger jQuery events so ePuskesmas AJAX listeners fire
    await page.evaluate((s: string) => {
      const $el = (window as JQWindow).$?.(s)
      if ($el) {
        $el.trigger('input')
        $el.trigger('change')
        $el.trigger('blur')
      }
    }, sel)

    return { success: true, field: sel, value, method: 'direct' }
  } catch (err) {
    return {
      success: false,
      field: sel,
      value,
      method: 'direct',
      error: String(err),
    }
  }
}

// ============================================================================
// FILL NUMBER FIELD
// ============================================================================

export async function fillNumberField(
  page: Page,
  selectors: string,
  value: number
): Promise<FillerResult> {
  const sel = await locateFirst(page, selectors)
  if (!sel) {
    return {
      success: false,
      field: selectors,
      value,
      method: 'direct',
      error: 'Element not found',
    }
  }

  try {
    const current = await page
      .locator(sel)
      .first()
      .inputValue()
      .catch(() => '')
    if (current.trim().length > 0) {
      return {
        success: true,
        field: sel,
        value: Number(current),
        method: 'direct',
      }
    }

    await page.locator(sel).first().fill(String(value))
    await page.evaluate((s: string) => {
      const $el = (window as JQWindow).$?.(s)
      if ($el) {
        $el.trigger('input')
        $el.trigger('change')
      }
    }, sel)

    return { success: true, field: sel, value, method: 'direct' }
  } catch (err) {
    return {
      success: false,
      field: sel,
      value,
      method: 'direct',
      error: String(err),
    }
  }
}

// ============================================================================
// FILL TEXTAREA
// ============================================================================

export async function fillTextarea(
  page: Page,
  selectors: string,
  value: string,
  forceOverride = false
): Promise<FillerResult> {
  return fillTextField(page, selectors, value, forceOverride)
}

// ============================================================================
// FILL SELECT
// Playwright: page.selectOption() handles <select> natively.
// ============================================================================

export async function fillSelect(
  page: Page,
  selectors: string,
  value: string
): Promise<FillerResult> {
  const sel = await locateFirst(page, selectors)
  if (!sel) {
    return {
      success: false,
      field: selectors,
      value,
      method: 'select',
      error: 'Element not found',
    }
  }

  try {
    const current = await page
      .locator(sel)
      .first()
      .inputValue()
      .catch(() => '')
    if (current && current !== '' && current !== '0') {
      return { success: true, field: sel, value: current, method: 'select' }
    }

    await page.locator(sel).first().selectOption(value)
    await page.evaluate((s: string) => {
      ;(window as JQWindow).$?.(s)?.trigger('change')
    }, sel)

    return { success: true, field: sel, value, method: 'select' }
  } catch (err) {
    return {
      success: false,
      field: sel,
      value,
      method: 'select',
      error: String(err),
    }
  }
}

// ============================================================================
// FILL CHECKBOX
// ============================================================================

export async function fillCheckbox(
  page: Page,
  selectors: string,
  checked: boolean
): Promise<FillerResult> {
  const sel = await locateFirst(page, selectors)
  if (!sel) {
    return {
      success: false,
      field: selectors,
      value: checked,
      method: 'checkbox',
      error: 'Element not found',
    }
  }

  try {
    const isChecked = await page.locator(sel).first().isChecked()
    if (isChecked === checked) {
      return { success: true, field: sel, value: checked, method: 'checkbox' }
    }

    if (checked) {
      await page.locator(sel).first().check()
    } else {
      await page.locator(sel).first().uncheck()
    }

    return { success: true, field: sel, value: checked, method: 'checkbox' }
  } catch (err) {
    return {
      success: false,
      field: sel,
      value: checked,
      method: 'checkbox',
      error: String(err),
    }
  }
}

// ============================================================================
// FILL CHECKBOX WITH ONCLICK (for ePuskesmas aksiCheckMaster)
// ============================================================================

export async function activateCheckboxWithOnclick(
  page: Page,
  selectors: string,
  shouldCheck = true
): Promise<FillerResult> {
  const sel = await locateFirst(page, selectors)
  if (!sel) {
    return {
      success: false,
      field: selectors,
      value: shouldCheck,
      method: 'checkbox',
      error: 'Element not found',
    }
  }

  try {
    const isChecked = await page.locator(sel).first().isChecked()
    if (isChecked === shouldCheck) {
      return {
        success: true,
        field: sel,
        value: shouldCheck,
        method: 'checkbox',
      }
    }

    // Click triggers onclick handler (aksiCheckMaster) + change event
    await page.locator(sel).first().click()
    await page.waitForTimeout(100)

    return {
      success: true,
      field: sel,
      value: shouldCheck,
      method: 'checkbox',
    }
  } catch (err) {
    return {
      success: false,
      field: sel,
      value: shouldCheck,
      method: 'checkbox',
      error: String(err),
    }
  }
}

// ============================================================================
// FILL RADIO
// ============================================================================

export async function fillRadio(
  page: Page,
  selectors: string,
  _value: string
): Promise<FillerResult> {
  const sel = await locateFirst(page, selectors)
  if (!sel) {
    return {
      success: false,
      field: selectors,
      value: _value,
      method: 'radio',
      error: 'Element not found',
    }
  }

  try {
    const isChecked = await page.locator(sel).first().isChecked()
    if (isChecked) {
      return { success: true, field: sel, value: _value, method: 'radio' }
    }

    await page.locator(sel).first().click()

    return { success: true, field: sel, value: _value, method: 'radio' }
  } catch (err) {
    return {
      success: false,
      field: sel,
      value: _value,
      method: 'radio',
      error: String(err),
    }
  }
}

// ============================================================================
// FILL AUTOCOMPLETE (jQuery UI)
// Playwright approach:
// 1. page.fill() to type value
// 2. waitForSelector on dropdown items
// 3. Find best match, click it
// ============================================================================

export interface AutocompleteOptions {
  timeout?: number
  dropdownSelector?: string
  retries?: number
  typeDelay?: number
  allowFirstItemFallback?: boolean
  requireDropdownSelection?: boolean
}

export async function fillAutocomplete(
  page: Page,
  selectors: string,
  value: string,
  options: AutocompleteOptions = {}
): Promise<FillerResult> {
  const {
    timeout = 1500,
    dropdownSelector = '.ui-autocomplete .ui-menu-item, .autocomplete-result',
    retries = 2,
    typeDelay = 50,
    allowFirstItemFallback = true,
    requireDropdownSelection = false,
  } = options

  const sel = await locateFirst(page, selectors)
  if (!sel) {
    return {
      success: false,
      field: selectors,
      value,
      method: 'autocomplete',
      error: 'Element not found',
    }
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // 1. Clear and focus
      await page.locator(sel).first().fill('')
      await page.locator(sel).first().focus()

      // 2. Type character by character to trigger autocomplete
      await page.locator(sel).first().type(value, { delay: typeDelay })

      // 3. Wait for dropdown
      try {
        await page.waitForSelector(dropdownSelector, {
          timeout,
          state: 'visible',
        })
      } catch {
        if (requireDropdownSelection) {
          if (attempt < retries) {
            await page.waitForTimeout(300)
            continue
          }
          return {
            success: false,
            field: sel,
            value,
            method: 'autocomplete',
            error: 'Dropdown not appeared',
          }
        }
        // Fallback: value already typed, trigger change
        await page.evaluate((s: string) => {
          const $el = (window as JQWindow).$?.(s)
          if ($el) {
            $el.trigger('change')
            $el.trigger('blur')
          }
        }, sel)
        return { success: true, field: sel, value, method: 'autocomplete' }
      }

      // 4. Find matching item
      const items = page.locator(dropdownSelector)
      const count = await items.count()

      let matchedIndex = -1
      for (let i = 0; i < count; i++) {
        const text = ((await items.nth(i).textContent()) || '').toLowerCase()
        if (text.includes(value.toLowerCase())) {
          matchedIndex = i
          break
        }
      }

      if (matchedIndex === -1 && allowFirstItemFallback && count > 0) {
        matchedIndex = 0
      }

      if (matchedIndex === -1) {
        if (attempt < retries) {
          await page.waitForTimeout(250)
          continue
        }
        return {
          success: false,
          field: sel,
          value,
          method: 'autocomplete',
          error: 'No matching item',
        }
      }

      // 5. Click matched item
      await items.nth(matchedIndex).click()
      await page.waitForTimeout(DELAY_AFTER_VALUE_SET)

      // 6. Get final value
      const finalValue = await page
        .locator(sel)
        .first()
        .inputValue()
        .catch(() => value)

      return {
        success: true,
        field: sel,
        value: finalValue,
        method: 'autocomplete',
      }
    } catch (err) {
      if (attempt === retries) {
        return {
          success: false,
          field: sel,
          value,
          method: 'autocomplete',
          error: String(err),
        }
      }
    }
  }

  return {
    success: false,
    field: sel,
    value,
    method: 'autocomplete',
    error: 'Max retries exceeded',
  }
}

// ============================================================================
// FILL RANGE SLIDER (ePuskesmas Skala Nyeri)
// ============================================================================

export async function fillRangeSlider(
  page: Page,
  hiddenSelector: string,
  sliderSelector: string,
  value: number
): Promise<FillerResult> {
  try {
    const hiddenSel = await locateFirst(page, hiddenSelector)
    const sliderSel = await locateFirst(page, sliderSelector)

    if (!hiddenSel && !sliderSel) {
      return {
        success: false,
        field: hiddenSelector,
        value,
        method: 'direct',
        error: 'Neither hidden nor slider found',
      }
    }

    if (hiddenSel) {
      await page.locator(hiddenSel).first().fill(String(value))
      await page.evaluate((s: string) => {
        const $el = (window as JQWindow).$?.(s)
        if ($el) {
          $el.trigger('input')
          $el.trigger('change')
        }
      }, hiddenSel)
    }

    if (sliderSel) {
      await page.locator(sliderSel).first().fill(String(value))
      await page.evaluate(
        ([s, v]: [string, number]) => {
          const slider = document.querySelector(s) as HTMLInputElement | null
          if (slider) {
            slider.value = String(v)
            const pct = (v / 10) * 100
            slider.style.background = `linear-gradient(to right, rgb(112,214,53) 0%, rgb(168,224,68) ${pct}%, white ${pct}%, white 100%)`
            slider.dispatchEvent(new Event('input', { bubbles: true }))
            slider.dispatchEvent(new Event('change', { bubbles: true }))
          }
        },
        [sliderSel, value] as [string, number]
      )
    }

    return { success: true, field: hiddenSelector, value, method: 'direct' }
  } catch (err) {
    return {
      success: false,
      field: hiddenSelector,
      value,
      method: 'direct',
      error: String(err),
    }
  }
}

// ============================================================================
// BATCH FILL
// ============================================================================

export interface FieldMapping {
  selector: string
  value: string | number | boolean
  type: 'text' | 'number' | 'textarea' | 'select' | 'checkbox' | 'autocomplete' | 'radio'
  autocompleteOptions?: AutocompleteOptions
  forceOverride?: boolean
}

export async function fillFields(
  page: Page,
  fields: FieldMapping[],
  delayBetweenFields = DELAY_BETWEEN_FIELDS
): Promise<FillerResult[]> {
  const results: FillerResult[] = []

  for (const field of fields) {
    let result: FillerResult

    switch (field.type) {
      case 'text':
      case 'textarea':
        result = await fillTextField(page, field.selector, String(field.value), field.forceOverride)
        break
      case 'number':
        result = await fillNumberField(page, field.selector, Number(field.value))
        break
      case 'select':
        result = await fillSelect(page, field.selector, String(field.value))
        break
      case 'checkbox':
        result = await fillCheckbox(page, field.selector, Boolean(field.value))
        break
      case 'radio':
        result = await fillRadio(page, field.selector, String(field.value))
        break
      case 'autocomplete':
        result = await fillAutocomplete(
          page,
          field.selector,
          String(field.value),
          field.autocompleteOptions
        )
        break
      default:
        result = {
          success: false,
          field: field.selector,
          value: field.value,
          method: 'direct',
          error: 'Unknown type',
        }
    }

    results.push(result)

    if (delayBetweenFields > 0) {
      await page.waitForTimeout(delayBetweenFields)
    }
  }

  return results
}
