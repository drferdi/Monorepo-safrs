import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Resolves files under the app root without process.cwd() so Turbopack keeps
// asset tracing scoped to this package.
export function resolveAppRootFile(relativeUnderAppRoot: string): string {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url))
  const normalized = moduleDir.replace(/\\/g, '/')
  const isSsrChunk =
    normalized.includes('/.next/') &&
    (/\/chunks\/ssr$/.test(normalized) || normalized.includes('/chunks/ssr/'))
  const upLevels = isSsrChunk ? 4 : 3
  const ups = Array.from({ length: upLevels }, () => '..')
  return path.normalize(path.join(moduleDir, ...ups, relativeUnderAppRoot))
}
