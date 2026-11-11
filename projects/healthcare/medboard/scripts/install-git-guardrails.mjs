import { execFileSync } from 'node:child_process'
import { chmodSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const repoRoot = process.cwd()
const gitDir = join(repoRoot, '.git')
const hookPath = join(repoRoot, '.githooks', 'pre-push')

if (!existsSync(gitDir)) {
  console.log('Lewati setup git guardrails: folder .git tidak ditemukan.')
  process.exit(0)
}

if (!existsSync(hookPath)) {
  console.error('Hook tracked .githooks/pre-push tidak ditemukan.')
  process.exit(1)
}

chmodSync(hookPath, 0o755)

try {
  execFileSync('git', ['config', '--local', 'core.hooksPath', '.githooks'], {
    cwd: repoRoot,
    stdio: 'inherit',
  })
  execFileSync('git', ['config', '--local', 'push.default', 'nothing'], {
    cwd: repoRoot,
    stdio: 'inherit',
  })
  console.log('Git guardrails aktif: core.hooksPath=.githooks, push.default=nothing')
} catch {
  console.log('Lewati git guardrails: git config gagal (belum init atau bukan repo root).')
}
