import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'

import SentraLockup from './SentraLockup'
import { SENTRA_AI_MARK } from './sentra-ai-mark'

test('the sign-in column shows the official Sentra Artificial Intelligence lockup (Chief 2026-10-07)', () => {
  const screen = readFileSync(path.join(process.cwd(), 'src/components/sign-in/SignInScreen.tsx'), 'utf-8')
  assert.match(screen, /<SentraLockup\b/)

  const html = renderToStaticMarkup(<SentraLockup />)
  assert.match(html, /role="img"/)
  assert.match(html, /aria-label="Sentra Artificial Intelligence"/)
  for (const d of SENTRA_AI_MARK.paths) assert.ok(html.includes(`d="${d}"`), 'official mark path is drawn unchanged')
  assert.equal(html.match(/>Sentra Artificial Intelligence<\/text>/g)?.length, 2, 'the wordmark and its sheen mask')
})
