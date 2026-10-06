'use client'

import { useEffect } from 'react'

import { tidyCase } from '@/lib/text/tidy-case'
import { tidyModeFor } from '@/lib/text/tidy-field'

// When the cursor leaves a text field written in all caps or all lower case, the text is
// tidied to standard Indonesian capitalisation (Chief 2026-10-07).
export default function TidyCaseOnBlur() {
  useEffect(() => {
    function onFocusOut(event: FocusEvent) {
      const el = event.target
      if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return
      const mode = tidyModeFor({
        tag: el instanceof HTMLInputElement ? 'input' : 'textarea',
        type: el instanceof HTMLInputElement ? el.type : '',
        name: el.name,
        id: el.id,
        autocomplete: el.getAttribute('autocomplete') ?? '',
        inputMode: el.inputMode,
        tidy: el.dataset.tidy ?? '',
        readOnly: el.readOnly,
        disabled: el.disabled,
      })
      if (!mode) return
      const next = tidyCase(el.value, mode)
      if (next === el.value) return
      // React tracks the value through the prototype setter; an input event then reaches onChange.
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set?.call(el, next)
      el.dispatchEvent(new Event('input', { bubbles: true }))
    }
    document.addEventListener('focusout', onFocusOut, true)
    return () => document.removeEventListener('focusout', onFocusOut, true)
  }, [])

  return null
}
