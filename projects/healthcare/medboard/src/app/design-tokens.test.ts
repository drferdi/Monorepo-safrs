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

test('text follows Glass Health: Inter, 13 px body on the 11/13/15/17/20/24/30 scale', () => {
  const css = read('src/app/globals.css')
  const tokens = rootTokens(css)
  assert.match(tokens.get('--font-base') ?? '', /^"inter variable"/)
  assert.deepEqual(
    ['--text-xs', '--text-sm', '--text-base', '--text-lg', '--text-xl', '--text-2xl', '--text-3xl'].map((name) => tokens.get(name)),
    ['0.6875rem', '0.8125rem', '0.9375rem', '1.0625rem', '1.25rem', '1.5rem', '1.875rem']
  )
  assert.match(css, /\nbody\s*\{[^}]*font-size:\s*var\(--text-sm\);/)
  assert.match(read('src/app/layout.tsx'), /import '@fontsource-variable\/inter'/)
})

const OLD_LITERALS: Array<[string, RegExp]> = [
  ['gold #E67E22', /#e67e22/i],
  ['gold rgba(230,126,34)', /rgba\(\s*230\s*,\s*126\s*,\s*34\s*,/],
  ['dark canvas #121214', /#121214/i],
  ['cream text #F0E8DC', /#f0e8dc/i],
  ['IBM Plex', /IBM Plex/i],
]

test('no old gold, cream or dark-canvas colour is left in pages and components', () => {
  const offenders: string[] = []
  for (const file of [...sourceFiles('src/app'), ...sourceFiles('src/components')]) {
    const text = read(file)
    for (const [name, pattern] of OLD_LITERALS) if (pattern.test(text)) offenders.push(`${file}: ${name}`)
  }
  assert.deepEqual(offenders, [])
})
