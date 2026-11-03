import { readFileSync, writeFileSync } from 'node:fs'
import { join, extname } from 'node:path'
import { readdirSync, statSync } from 'node:fs'

const root = process.cwd()

const ignoreDirs = new Set(['node_modules', '.git', 'dist', '.next'])
const allowedExts = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.html', '.css', '.mjs', '.yml', '.yaml', '.toml'])

function walk(dir) {
  const files = readdirSync(dir)
  for (const file of files) {
    const filepath = join(dir, file)
    const stat = statSync(filepath)
    if (stat.isDirectory()) {
      if (!ignoreDirs.has(file)) walk(filepath)
    } else {
      const ext = extname(file)
      // For extensionless files or specific files like .env.example, .gitignore, .editorconfig, etc.
      if (allowedExts.has(ext) || file.startsWith('.')) {
        processFile(filepath)
      }
    }
  }
}

function processFile(filepath) {
  try {
    const content = readFileSync(filepath, 'utf8')
    let newContent = content.replace(/Drferdi/g, 'Drferdi')
    newContent = newContent.replace(/drferdi/g, 'drferdi') // maintain casing logic if possible, or just 'Drferdi'? The user said "ganti dengan Drferdi". Let's replace 'drferdi' with 'Drferdi' or 'drferdi'. Usually usernames are lowercase. I'll do 'drferdi'.

    // Wait, the user specifically wrote "ganti dengan nama baru saya Drferdi". Let's just replace all regardless of casing to 'Drferdi', but keep lowercase for 'drferdi' to 'drferdi' just in case it's used in github paths.
    // Actually, `Drferdi` is used in "Architected and built by Drferdi."
    // `drferdi` is used in github paths: `origin-drferdi` or `@drferdi/...` or `github.com/Drferdi/...`
    // Let's do:
    // Drferdi -> Drferdi
    // drferdi -> drferdi

    if (content !== newContent) {
      writeFileSync(filepath, newContent, 'utf8')
      console.log(`Updated: ${filepath.replace(root, '')}`)
    }
  } catch (err) {
    // skip binary files or unreadable
  }
}

walk(root)
console.log('Done.')
