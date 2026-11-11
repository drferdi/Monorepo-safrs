import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('./SentrapediaDashboard.tsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../src/workspaces.scss', import.meta.url), 'utf8')
assert.match(source, /Sentrapedia · Referensi klinis/)
assert.match(source, /searchSentrapedia/)
assert.match(source, /Filter kategori/)
assert.match(source, /db01-sentrapedia-category-select/)
assert.match(source, /<select value=\{category\}/)
assert.match(source, /role="dialog"/)
assert.match(source, /Kriteria rujukan/)
assert.match(source, /<p>\{disease\.definition\}<\/p>/)

const resultRowStart = source.lastIndexOf('<button', source.indexOf('db01-sentrapedia-record'))
const resultRowEnd = source.indexOf('</button>', resultRowStart)
const resultRowSource = source.slice(resultRowStart, resultRowEnd)

assert.ok(resultRowStart >= 0)
assert.ok(resultRowEnd > resultRowStart)
assert.match(resultRowSource, /<strong>\{disease\.name\}<\/strong>/)
assert.doesNotMatch(resultRowSource, /disease\.definition|disease\.code|disease\.category/)
assert.doesNotMatch(resultRowSource, /db01-sentrapedia-record__(dot|meta)/)
assert.match(styles, /\.db01-sentrapedia-record\s*{[^}]*display:\s*block[^}]*transition:/s)
assert.match(styles, /\.db01-sentrapedia-category-select\s*{[^}]*display:\s*none/s)

console.log('sentrapedia workspace contract passed')
