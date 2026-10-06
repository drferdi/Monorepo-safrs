// Copies the Human Atlas geometry into public/atlas (Chief 2026-10-07: Atlas page).
// Source: https://github.com/slorksmo/Human-Atlas (code MIT, anatomy data CC BY 4.0).
// Usage: node scripts/atlas/import-human-atlas.mjs <path to a Human-Atlas checkout>
// Only the gzip chunks ship; every browser MedBoard supports has DecompressionStream.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const source = process.argv[2]
if (!source) {
  console.error('Usage: node scripts/atlas/import-human-atlas.mjs <Human-Atlas checkout>')
  process.exit(1)
}
const from = path.join(source, 'public')
const to = path.join(process.cwd(), 'public', 'atlas')
mkdirSync(path.join(to, 'models'), { recursive: true })

for (const manifest of ['atlas.json', 'atlas-female.json']) {
  const atlas = JSON.parse(readFileSync(path.join(from, 'models', manifest), 'utf8'))
  atlas.chunks = atlas.chunks.map((chunk) => {
    const file = path.basename(chunk.gzip)
    copyFileSync(path.join(from, 'models', file), path.join(to, 'models', file))
    return { url: `/atlas/models/${file}`, bytes: chunk.bytes, gzipBytes: chunk.gzipBytes }
  })
  writeFileSync(path.join(to, manifest), JSON.stringify(atlas))
  console.log(`${manifest}: ${atlas.parts.length} parts, ${atlas.chunks.length} chunks`)
}
copyFileSync(path.join(from, 'ATTRIBUTION.md'), path.join(to, 'ATTRIBUTION.md'))
