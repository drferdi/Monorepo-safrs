import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

test('medical-knowledge route.ts exists and exports POST', () => {
  const routePath = path.join(__dirname, 'route.ts')
  assert.ok(fs.existsSync(routePath), 'Expected route.ts to exist')

  const code = fs.readFileSync(routePath, 'utf8')
  assert.match(code, /export\s+async\s+function\s+POST\s*\(/, 'Expected POST handler export')
})

test('sentra-main targeted React hooks lint passes for SentraSim and TextScramble', () => {
  const packageRoot = path.resolve(__dirname, '../../..')
  const command =
    process.platform === 'win32'
      ? 'pnpm exec eslint components/SentraSim.tsx components/ui/text-scramble.tsx'
      : 'pnpm exec eslint components/SentraSim.tsx components/ui/text-scramble.tsx'
  const result = spawnSync(command, {
    cwd: packageRoot,
    encoding: 'utf8',
    shell: true
  })

  assert.equal(
    result.status,
    0,
    `Expected targeted eslint to pass.\nERROR:\n${result.error?.message ?? 'none'}\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`
  )
})
