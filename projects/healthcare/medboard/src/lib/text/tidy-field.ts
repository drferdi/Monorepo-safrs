import type { TidyMode } from './tidy-case'

// Which typed fields the blur tidy may touch (Chief 2026-10-07: input and display). Codes,
// identifiers, accounts, links and searches are never rewritten; `data-tidy="off"` opts out.

export interface TidyField {
  tag: 'input' | 'textarea'
  type: string
  name: string
  id: string
  autocomplete: string
  inputMode: string
  tidy: string
  readOnly: boolean
  disabled: boolean
}

const NEVER = new Set([
  'email', 'user', 'username', 'password', 'pass', 'url', 'link', 'website', 'github', 'linkedin',
  'nik', 'nip', 'str', 'sip', 'rm', 'mrn', 'kode', 'code', 'icd', 'icdx', 'token', 'otp', 'search',
])
const NAME = new Set(['nama', 'name'])

function words(value: string): string[] {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

export function tidyModeFor(field: TidyField): TidyMode | null {
  if (field.readOnly || field.disabled || field.tidy === 'off') return null
  if (field.tag === 'input' && field.type !== 'text') return null
  if (['numeric', 'decimal', 'tel', 'email', 'url', 'search'].includes(field.inputMode)) return null
  if (field.tidy === 'name') return 'name'

  const hints = [field.name, field.id, field.autocomplete].flatMap(words)
  if (hints.some((word) => NEVER.has(word))) return null
  return hints.some((word) => NAME.has(word)) ? 'name' : 'sentence'
}
