import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('./SettingsDashboard.tsx', import.meta.url), 'utf8')
const themeProvider = readFileSync(
  new URL('../components/medlink/theme-provider.tsx', import.meta.url),
  'utf8'
)

assert.match(source, /Public synthetic sandbox/)
assert.match(source, /IndexedDB boundary/)
assert.match(source, /Compact density/)
assert.match(source, /https:\/\/sentrahai\.com/)
assert.doesNotMatch(source, /useTheme|Gunakan tema gelap|Gunakan tema terang/)
assert.match(themeProvider, /root\.setAttribute\('data-theme', 'dark'\)/)
assert.match(themeProvider, /<GlobalTheme theme="g100">/)
assert.doesNotMatch(themeProvider, /localStorage|matchMedia|toggleTheme|SentraTheme/)

console.log('settings workspace contract passed')
