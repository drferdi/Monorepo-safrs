import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = (relative: string): string => readFileSync(path.join(root, relative), 'utf8')

function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const relative = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...sourceFiles(relative))
    else if (/\.(ts|tsx|css)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) out.push(relative)
  }
  return out
}

// Later :root blocks win, as in the browser.
function rootTokens(css: string): Map<string, string> {
  const tokens = new Map<string, string>()
  for (const block of css.matchAll(/(?:^|\n):root\s*\{([^}]*)\}/g)) {
    for (const declaration of block[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      tokens.set(declaration[1], declaration[2].trim().toLowerCase())
    }
  }
  return tokens
}

test('MedBoard has one white theme: no theme switch in the CSS, the layout or the components', () => {
  assert.equal(read('src/app/globals.css').includes('data-theme'), false)
  assert.equal(read('src/app/layout.tsx').includes('data-theme'), false)
  assert.equal(existsSync(path.join(root, 'src/components/ThemeProvider.tsx')), false)
  const users = sourceFiles('src').filter((file) => /ThemeProvider|useTheme\(/.test(read(file)))
  assert.deepEqual(users, [])
})

test('the palette is the one Chief chose: white, Oxford Blue, red-orange, dark red for critical', () => {
  const tokens = rootTokens(read('src/app/globals.css'))
  assert.equal(tokens.get('--surface'), '#ffffff')
  assert.equal(tokens.get('--primary'), '#002147')
  assert.equal(tokens.get('--accent'), '#e8461e')
  assert.equal(tokens.get('--critical'), '#b42318')
})

test('pages still on the old token names get the new palette', () => {
  const tokens = rootTokens(read('src/app/globals.css'))
  assert.equal(tokens.get('--bg-canvas'), 'var(--surface)')
  assert.equal(tokens.get('--bg-card'), 'var(--surface)')
  assert.equal(tokens.get('--text-main'), 'var(--text)')
  assert.equal(tokens.get('--text-muted'), 'var(--text-secondary)')
  assert.equal(tokens.get('--line-base'), 'var(--border)')
  assert.equal(tokens.get('--c-asesmen'), 'var(--primary)')
  assert.equal(tokens.get('--c-critical'), 'var(--critical)')
  assert.equal(tokens.get('--bg-surface-soft'), 'var(--surface-subtle)')
})

test('text is IBM Plex Sans on the 2026 web-app scale: 14 px body, 12 px floor, roomy line height', () => {
  const css = read('src/app/globals.css')
  const tokens = rootTokens(css)
  assert.match(tokens.get('--font-base') ?? '', /^"ibm plex sans variable"/)
  assert.deepEqual(
    ['--text-xs', '--text-sm', '--text-base', '--text-lg', '--text-xl', '--text-2xl', '--text-3xl'].map((name) => tokens.get(name)),
    ['0.75rem', '0.875rem', '1rem', '1.125rem', '1.25rem', '1.5rem', '1.875rem']
  )
  assert.equal(tokens.get('--lh-base'), '1.6')
  assert.match(css, /\nbody\s*\{[^}]*font-size:\s*var\(--text-sm\);/)
  assert.match(read('src/app/layout.tsx'), /import '@fontsource-variable\/ibm-plex-sans'/)
})

test('the root keeps the browser 16 px, so 1rem is 16 px and the 14 px body really is 14 px', () => {
  const css = read('src/app/globals.css')
  const htmlRules = [...css.matchAll(/(?:^|\n)([^{}\n]*(?:,\s*\n)?[^{}\n]*)\{([^}]*)\}/g)].filter((rule) =>
    rule[1].split(',').some((selector) => selector.trim() === 'html')
  )
  const shrinking = htmlRules.filter((rule) => /font-size:\s*(?!100%)/.test(rule[2])).map((rule) => rule[1].trim())
  assert.deepEqual(shrinking, [])
})

test('html and body never become scroll boxes, so the sticky rail and header stay in view', () => {
  const css = read('src/app/globals.css')
  const rootRules = [...css.matchAll(/(?:^|\n)([^{}\n]*(?:,\s*\n)?[^{}\n]*)\{([^}]*)\}/g)].filter((rule) =>
    rule[1].split(',').some((selector) => ['html', 'body'].includes(selector.trim()))
  )
  const scrollBoxes = rootRules
    .filter((rule) => /overflow(-x|-y)?:\s*(hidden|auto|scroll)/.test(rule[2]))
    .map((rule) => rule[1].trim())
  assert.deepEqual(scrollBoxes, [])
})

test('typing fields are an underline, not a box, and focus draws an Oxford line along it smoothly', () => {
  const css = read('src/app/ui.css')
  const rule = (selector: string) => css.match(new RegExp(`\\n${selector.replace(/[.:]/g, '\\$&')}\\s*\\{([^}]*)\\}`))?.[1] ?? ''
  const field = rule('.ui-input')
  assert.match(field, /border:\s*0;/)
  assert.match(field, /border-bottom:\s*1px solid var\(--border\);/)
  assert.match(field, /border-radius:\s*0;/)
  assert.match(field, /background-size:\s*0% 2px;/)
  assert.match(field, /transition:\s*background-size 220ms ease-out/)
  assert.match(rule('.ui-input:focus'), /background-size:\s*100% 2px;/)
  assert.match(css, /prefers-reduced-motion:\s*reduce\)\s*\{[^}]*\.ui-input\s*\{\s*transition:\s*none;/)
})

test('page typing fields share the same underline, not a box', () => {
  const css = read('src/app/globals.css').replace(/\/\*[\s\S]*?\*\//g, '')
  const typingFields = [
    '.input-draft',
    '.omni-input',
    '.calculator-field-input',
    '.chat-input',
    '.finalize-pharmacology-manual-input',
    '.vitals-context-input',
    '.vitals-context-select',
  ]
  const rules = [...css.matchAll(/(?:^|\n)([^{}]*)\{([^}]*)\}/g)].map((rule) => ({
    at: rule.index ?? 0,
    selectors: rule[1].split(',').map((selector) => selector.trim()),
    body: rule[2],
  }))
  const underline = rules.find((rule) => /border:\s*0;/.test(rule.body) && /background-size:\s*0% 2px;/.test(rule.body))
  assert.deepEqual(typingFields.filter((field) => !underline?.selectors.includes(field)), [])
  const boxedLater = rules.filter(
    (rule) =>
      rule.at > (underline?.at ?? Infinity) &&
      rule.selectors.some((selector) => typingFields.includes(selector)) &&
      /border(-top)?:\s*[1-9]/.test(rule.body)
  )
  assert.deepEqual(boxedLater, [], 'no later rule boxes a typing field again')
})

const OLD_LITERALS: Array<[string, RegExp]> = [
  ['gold #E67E22', /#e67e22/i],
  ['gold rgba(230,126,34)', /rgba\(\s*230\s*,\s*126\s*,\s*34\s*,/],
  ['dark canvas #121214', /#121214/i],
  ['cream text #F0E8DC', /#f0e8dc/i],
  ['IBM Plex Mono', /IBM Plex Mono/i],
]

test('no old gold, cream or dark-canvas colour is left in pages and components', () => {
  const offenders: string[] = []
  for (const file of [...sourceFiles('src/app'), ...sourceFiles('src/components')]) {
    const text = read(file)
    for (const [name, pattern] of OLD_LITERALS) if (pattern.test(text)) offenders.push(`${file}: ${name}`)
  }
  assert.deepEqual(offenders, [])
})

const TYPE_PASS_EXCLUDED = [
  'src/app/report/clinical/',
  'src/components/ui/',
  'src/components/shell/',
  'src/app/ui.css',
  'src/app/shell.css',
]

function typePassFiles(): string[] {
  return [...sourceFiles('src/app'), ...sourceFiles('src/components')]
    .map((file) => file.split(path.sep).join('/'))
    .filter((file) => !TYPE_PASS_EXCLUDED.some((prefix) => file.startsWith(prefix)))
}

test('page text is sentence case, without wide tracking, heavy weights or monospace', () => {
  const legacy = [
    /textTransform:\s*['"]uppercase['"]/,
    /text-transform:\s*uppercase/,
    /letterSpacing:\s*['"](0?\.(0[5-9]|[1-9])\d*|[1-9][\d.]*)em['"]/,
    /letter-spacing:\s*(0?\.(0[5-9]|[1-9])\d*|[1-9][\d.]*)em/,
    /letterSpacing:\s*(['"][1-9][\d.]*px['"]|[1-9][\d.]*\b)/,
    /letter-spacing:\s*[1-9][\d.]*px/,
    /fontWeight:\s*['"]?(bold|[7-9]00)\b/,
    /font-weight:\s*(bold|[7-9]00)\b/,
    /(font-family:[^;]*|fontFamily:[^,}\n]*)(monospace|Mono\b|Courier)/,
  ]
  const offenders = typePassFiles().filter((file) => legacy.some((pattern) => pattern.test(read(file))))
  assert.deepEqual(offenders, [])
})

test('every literal text size on a page sits on the 2026 scale 12/14/16/18/20/24/30', () => {
  const scale = new Set([12, 14, 16, 18, 20, 24, 30])
  const offScale: string[] = []
  for (const file of typePassFiles()) {
    const source = read(file)
    const sizes = [
      ...[...source.matchAll(/fontSize:\s*(\d+(?:\.\d+)?)(?=\s*[,}\n])/g)].map((m) => Number(m[1])),
      ...[...source.matchAll(/(?:fontSize:\s*['"]|font-size:\s*)(\d*\.?\d+)(px|rem)\b/g)].map((m) =>
        m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1])
      ),
    ]
    for (const size of sizes) if (size < 36 && !scale.has(size)) offScale.push(`${file}: ${size}`)
  }
  assert.deepEqual(offScale, [])
})

// Split a selector list on its top-level commas only, so :is(a, b) stays one selector.
function selectorList(list: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const char of list) {
    if (char === '(') depth++
    if (char === ')') depth--
    if (char === ',' && depth === 0) {
      parts.push(current.trim())
      current = ''
    } else current += char
  }
  return [...parts, current.trim()]
}

// Every rule body whose selector list contains `selector` exactly, in file order.
function rulesFor(css: string, selector: string): string[] {
  const plain = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const bodies: string[] = []
  for (const rule of plain.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (selectorList(rule[1]).includes(selector)) bodies.push(rule[2])
  }
  return bodies
}

function lastBackground(css: string, selector: string): string | undefined {
  const withBackground = rulesFor(css, selector).filter((body) => /(^|[\s;])background\s*:/.test(body))
  return withBackground.at(-1)?.match(/(?:^|[\s;])background\s*:\s*([^;]+);/)?.[1].trim()
}

const NEU_EMR_BUTTONS = [
  '.assessment-run-button',
  '.assessment-reset-button',
  '.assessment-readiness-cta',
  '.cdss-selected-save-btn',
  '.emr-assist-note-action',
  '.emr-neu-nav-btn',
  '.finalize-neu-btn',
  '.finalize-pharmacology-selection-button',
  '.finalize-pharmacology-manual-add',
  '.vitals-chip',
]

test('every clickable button is black neumorphism (Chief 2026-10-06): kit buttons, chips and EMR buttons', () => {
  const globals = read('src/app/globals.css')
  const ui = read('src/app/ui.css')
  const tokens = rootTokens(globals)
  for (const name of ['--neu-surface', '--neu-text', '--neu-raised', '--neu-pressed']) {
    assert.ok(tokens.has(name), `${name} is defined`)
  }
  for (const selector of ['.ui-btn--primary', '.ui-btn--secondary', '.ui-btn--accent', '.ui-btn--ghost', '.ui-chip']) {
    assert.equal(lastBackground(ui, selector), 'var(--neu-surface)', selector)
    assert.ok(rulesFor(ui, selector).some((body) => /box-shadow:\s*var\(--neu-raised\)/.test(body)), `${selector} is raised`)
  }
  for (const selector of NEU_EMR_BUTTONS) {
    assert.equal(lastBackground(globals, selector), 'var(--neu-surface)', selector)
  }
})

test('a selected chip is pressed in and marked with a check, not only recoloured', () => {
  const ui = read('src/app/ui.css')
  const globals = read('src/app/globals.css')
  assert.ok(rulesFor(ui, '.ui-chip[aria-pressed="true"]').some((body) => /box-shadow:\s*var\(--neu-pressed\)/.test(body)))
  assert.ok(rulesFor(ui, '.ui-chip[aria-pressed="true"]::before').some((body) => /content:\s*"✓"/.test(body)))
  assert.ok(rulesFor(globals, '.vitals-chip.is-active').some((body) => /box-shadow:\s*var\(--neu-pressed\)/.test(body)))
})
