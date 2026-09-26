export interface Icd10TransformResult {
  rawInput: string
  normalizedInput: string
  primaryCode: string
  candidateCodes: string[]
  mode: 'empty' | 'single' | 'range' | 'text'
}

export interface Icd10TransformOptions {
  stripSubcode?: boolean
  preferredCodes?: ReadonlySet<string>
}

const ICD_SUBCODE_RE = '[0-9A-Z]{1,7}'

const EMPTY_RESULT: Icd10TransformResult = {
  rawInput: '',
  normalizedInput: '',
  primaryCode: '',
  candidateCodes: [],
  mode: 'empty',
}

function sanitizeInput(value: unknown): string {
  return String(value ?? '')
    .toUpperCase()
    .replace(/[–—]/g, '-')
    .trim()
}

export function normalizeIcd10Code(value: unknown, stripSubcode = true): string {
  const token = sanitizeInput(value).replace(/\s+/g, '')
  const match = token.match(new RegExp(`^([A-Z])([0-9]{2})(?:\\.(${ICD_SUBCODE_RE}))?$`))
  if (!match) return ''

  const head = `${match[1]}${match[2]}`
  if (stripSubcode || !match[3]) return head
  return `${head}.${match[3]}`
}

function parseIcdRange(input: string): string[] | null {
  const rangeMatch = input.match(
    new RegExp(
      `^([A-Z])\\s*(\\d{2})(?:\\.(${ICD_SUBCODE_RE}))?\\s*(?:\\.\\.|-|S\\/D|SD|TO)\\s*([A-Z])?\\s*(\\d{2})(?:\\.(${ICD_SUBCODE_RE}))?$`
    )
  )
  if (!rangeMatch) return null

  const startLetter = rangeMatch[1]
  const endLetter = rangeMatch[4] || startLetter
  if (startLetter !== endLetter) return null

  let start = Number.parseInt(rangeMatch[2], 10)
  let end = Number.parseInt(rangeMatch[5], 10)
  if (Number.isNaN(start) || Number.isNaN(end)) return null
  if (start > end) [start, end] = [end, start]

  // Cegah range terlalu lebar agar hasil tetap presisi.
  if (end - start > 30) return null

  const result: string[] = []
  for (let num = start; num <= end; num++) {
    result.push(`${startLetter}${String(num).padStart(2, '0')}`)
  }
  return result
}

function pickPrimary(candidates: string[], preferredCodes?: ReadonlySet<string>): string {
  if (preferredCodes && preferredCodes.size > 0) {
    const match = candidates.find(code => preferredCodes.has(code))
    if (match) return match
  }
  return candidates[0] ?? ''
}

export function transformToIcd10_2010(
  value: unknown,
  options: Icd10TransformOptions = {}
): Icd10TransformResult {
  const stripSubcode = options.stripSubcode ?? true
  const normalizedInput = sanitizeInput(value)
  if (!normalizedInput || normalizedInput === 'NAN' || normalizedInput === 'NONE') {
    return { ...EMPTY_RESULT, rawInput: String(value ?? ''), normalizedInput }
  }

  const rangeCodes = parseIcdRange(normalizedInput)
  if (rangeCodes && rangeCodes.length > 0) {
    return {
      rawInput: String(value ?? ''),
      normalizedInput,
      primaryCode: pickPrimary(rangeCodes, options.preferredCodes),
      candidateCodes: rangeCodes,
      mode: 'range',
    }
  }

  const fromParen = normalizedInput.match(
    new RegExp(`\\(([A-Z][0-9]{2}(?:\\.(${ICD_SUBCODE_RE}))?)\\)\\s*$`)
  )
  if (fromParen) {
    const code = normalizeIcd10Code(fromParen[1], stripSubcode)
    if (code) {
      return {
        rawInput: String(value ?? ''),
        normalizedInput,
        primaryCode: code,
        candidateCodes: [code],
        mode: 'single',
      }
    }
  }

  const regexMatches =
    normalizedInput.match(new RegExp(`\\b([A-Z][0-9]{2}(?:\\.(${ICD_SUBCODE_RE}))?)\\b`, 'g')) ?? []
  if (regexMatches.length > 0) {
    const normalizedCodes = regexMatches
      .map(token => normalizeIcd10Code(token, stripSubcode))
      .filter(Boolean)

    if (normalizedCodes.length > 0) {
      const unique = Array.from(new Set(normalizedCodes))
      return {
        rawInput: String(value ?? ''),
        normalizedInput,
        primaryCode: pickPrimary(unique, options.preferredCodes),
        candidateCodes: unique,
        mode: 'single',
      }
    }
  }

  const compactCode = normalizeIcd10Code(normalizedInput.replace(/\s+/g, ''), stripSubcode)
  if (compactCode) {
    return {
      rawInput: String(value ?? ''),
      normalizedInput,
      primaryCode: compactCode,
      candidateCodes: [compactCode],
      mode: 'single',
    }
  }

  return {
    rawInput: String(value ?? ''),
    normalizedInput,
    primaryCode: normalizedInput,
    candidateCodes: [],
    mode: 'text',
  }
}
