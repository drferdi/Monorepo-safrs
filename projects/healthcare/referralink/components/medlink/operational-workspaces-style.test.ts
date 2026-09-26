import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'

const styles = readFileSync(new URL('../../src/workspaces.scss', import.meta.url), 'utf8')

assert.match(styles, /font-family:\s*["']Avenir Next["']/)
assert.match(styles, /\.db01-operational-page\s*\{/)
assert.match(styles, /\.db01-operational-drawer\s*\{/)
assert.match(styles, /\.db01-operational-overlay\s*\{/)
assert.match(styles, /\.db01-dashboard__recent\s*>\s*h2\s*\{/)
assert.match(styles, /\.db01-dashboard__recent article\s*\{/)
assert.doesNotMatch(styles, /\.db01-operational-search::before/)
assert.match(styles, /\.db01-security-status\s*\{/)
assert.match(styles, /\.db01-security-status\s*>\s*div\s*\{/)
assert.match(styles, /\.db01-credential-record a\s*\{/)
assert.match(styles, /\.db01-credential-record small\s*\{/)
assert.match(styles, /\.db01-operational-button:focus-visible|\.db01-icon-button:focus-visible/)
assert.match(styles, /@media\s*\(max-width:\s*420px\)/)
assert.match(styles, /overflow-x:\s*hidden/)
assert.match(styles, /\.medlink-shell--sentraboard\s+\.db01-dashboard__content\s*\{/)
assert.match(
  styles,
  /\.medlink-shell--sentraboard\s+\.db01-dashboard__metrics\s*\{[^}]*grid-template-columns:\s*repeat\(4,/s
)
assert.match(
  styles,
  /\.medlink-shell--sentraboard\s+\.db01-dashboard__notes\s*\{[^}]*grid-template-columns:\s*repeat\(4,/s
)
assert.match(styles, /\.medlink-shell--sentraboard\s+\.db01-dashboard__document\s*\{/)
assert.match(styles, /\.medlink-shell--sentraboard\s+\.db01-dashboard__recent article\s*\{/)

console.log('operational workspace style contracts passed')
