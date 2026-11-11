// Resolves paths under ./runtime without process.cwd() so Turbopack NFT stays scoped.
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Path to a file under the dashboard package `runtime/` directory.
 * Must be called from modules under `src/lib/**` with the same chunk depth as this file (`src/lib/server`).
 */
export function resolveRuntimeDataFile(relativeUnderRuntime: string): string {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url))
  const normalized = moduleDir.replace(/\\/g, '/')
  const isSsrChunk =
    normalized.includes('/.next/') &&
    (/\/chunks\/ssr$/.test(normalized) || normalized.includes('/chunks/ssr/'))
  const upLevels = isSsrChunk ? 4 : 3
  const ups = Array.from({ length: upLevels }, () => '..')
  return path.normalize(path.join(moduleDir, ...ups, 'runtime', relativeUnderRuntime))
}
