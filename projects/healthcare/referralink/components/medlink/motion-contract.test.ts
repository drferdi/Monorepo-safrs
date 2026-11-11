import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const app = readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../../src/globals.scss', import.meta.url), 'utf8')

assert.match(app, /medlink-route-transition/)
assert.match(app, /key=\{workspaceView\}/)
assert.match(styles, /\.medlink-route-transition\s*\{/) 
assert.match(styles, /@keyframes\s+medlink-route-enter/)
assert.match(styles, /medlink-surface-enter/)
assert.match(styles, /\.medlink-shell\s+button[^\{]*\{[^}]*transition:/s)
assert.match(styles, /prefers-reduced-motion:\s*reduce/)

console.log('motion contracts passed')
