import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import ts from 'typescript'

// Chief 2026-10-06: every icon comes from Lucide (https://lucide.dev). Text glyphs, emoji and
// hand-drawn icon SVGs are not icons. Typographic marks stay: • as a separator, × in doses,
// → inside a sentence.
const ICON_GLYPHS = /[←↑↓↗⟳⌕⌃⏱▶▼▾▸◈◇◐○●✓✔✕✗✖✧⚠⚡♂♀]|[\u{1F300}-\u{1FAFF}]/u

function files(dir: string, pattern: RegExp): string[] {
  return readdirSync(path.join(process.cwd(), dir), { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(dir, entry.name)
    if (entry.isDirectory()) return files(relative, pattern)
    return pattern.test(entry.name) && !entry.name.includes('.test.') ? [relative] : []
  })
}

function parse(file: string): ts.SourceFile {
  const text = readFileSync(path.join(process.cwd(), file), 'utf8')
  return ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
}

const where = (source: ts.SourceFile, node: ts.Node): string =>
  `${source.fileName}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}`

test('no glyph or emoji stands in for an icon in the interface', () => {
  const offenders = files('src', /\.tsx$/).flatMap((file) => {
    const source = parse(file)
    const found: string[] = []
    const visit = (node: ts.Node): void => {
      const text =
        ts.isJsxText(node) || ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)
          ? node.text
          : ts.isTemplateExpression(node)
            ? [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join(' ')
            : null
      if (text !== null && ICON_GLYPHS.test(text)) found.push(`${where(source, node)} ${JSON.stringify(text.trim().slice(0, 40))}`)
      ts.forEachChild(node, visit)
    }
    visit(source)
    return found
  })
  assert.deepEqual(offenders, [])
})

test('no hand-drawn icon SVG: small inline SVGs are Lucide icons instead (charts and diagrams stay)', () => {
  const offenders = files('src', /\.tsx$/).flatMap((file) => {
    const source = parse(file)
    const found: string[] = []
    const visit = (node: ts.Node): void => {
      const opening = ts.isJsxElement(node) ? node.openingElement : ts.isJsxSelfClosingElement(node) ? node : null
      if (opening && opening.tagName.getText() === 'svg') {
        const sizes = opening.attributes.properties
          .filter(ts.isJsxAttribute)
          .filter((attribute) => ['width', 'height'].includes(attribute.name.getText()))
          .map((attribute) => Number(attribute.initializer?.getText().replace(/[{}"']/g, '')))
        if (sizes.some((size) => Number.isFinite(size) && size <= 32)) found.push(where(source, node))
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
    return found
  })
  assert.deepEqual(offenders, [])
})

test('stylesheets draw no glyph icons; a check or box is a Lucide path in a mask', () => {
  const offenders = files('src', /\.css$/).flatMap((file) =>
    [...readFileSync(path.join(process.cwd(), file), 'utf8').matchAll(/content:\s*(["'])(.+?)\1/g)].map(
      (match) => `${file} content: ${match[0]}`
    )
  )
  assert.deepEqual(offenders, [])
})
