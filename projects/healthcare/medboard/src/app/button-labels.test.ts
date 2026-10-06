import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import ts from 'typescript'

// Chief 2026-10-06: no ALL-CAPS button labels; acronyms stay as they are.
const ACRONYMS = new Set([
  'AI', 'BB', 'BPJS', 'CDSS', 'CSV', 'DKA', 'DM', 'ECG', 'EKG', 'EMR', 'GCS', 'GDP', 'GDS', 'GERD',
  'ACK', 'HHS', 'HMOD', 'HT', 'HTN', 'ICD', 'ICDX', 'ID', 'IGD', 'JPP', 'MAP', 'MIRA', 'NOTAM', 'NSAID', 'PDF', 'PPOK',
  'QR', 'RPD', 'RPK', 'SOAP', 'TB', 'TD', 'TTV', 'USG',
])

const BUTTON_TAGS = new Set(['button', 'Button', 'Chip', 'EmrPhaseFooterButton'])
const LABEL_ATTRIBUTES = new Set(['label', 'children'])

function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(path.join(process.cwd(), dir), { withFileTypes: true })) {
    const relative = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...sourceFiles(relative))
    else if (entry.name.endsWith('.tsx') && !entry.name.includes('.test.')) out.push(relative)
  }
  return out
}

function shouting(text: string): string[] {
  return (text.match(/[A-Za-z0-9-]+/g) ?? []).filter((word) => {
    const letters = word.replace(/[^A-Za-z]/g, '')
    return letters.length >= 3 && letters === letters.toUpperCase() && !ACRONYMS.has(letters)
  })
}

function tagName(node: ts.JsxElement | ts.JsxSelfClosingElement): string {
  const opening = ts.isJsxElement(node) ? node.openingElement : node
  return opening.tagName.getText()
}

// Strings a button shows: its children text and its label attribute, never other attributes.
function labelTexts(node: ts.Node, out: string[]): void {
  if (ts.isJsxAttribute(node)) {
    if (!LABEL_ATTRIBUTES.has(node.name.getText()) || !node.initializer) return
  }
  if (ts.isJsxText(node)) out.push(node.text)
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) out.push(node.text)
  if (ts.isTemplateExpression(node)) {
    out.push(node.head.text, ...node.templateSpans.map((span) => span.literal.text))
  }
  if (ts.isCallExpression(node)) return
  ts.forEachChild(node, (child) => labelTexts(child, out))
}

function shoutingButtons(file: string): string[] {
  const text = readFileSync(path.join(process.cwd(), file), 'utf8')
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const found: string[] = []
  const visit = (node: ts.Node): void => {
    if ((ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) && BUTTON_TAGS.has(tagName(node))) {
      const texts: string[] = []
      labelTexts(node, texts)
      for (const label of texts) {
        if (shouting(label).length > 0) {
          const line = source.getLineAndCharacterOfPosition(node.getStart()).line + 1
          found.push(`${file}:${line} ${JSON.stringify(label.trim())}`)
        }
      }
      return
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return found
}

test('no button label is written in capitals; acronyms excepted (Chief 2026-10-06)', () => {
  const offenders = sourceFiles('src').flatMap(shoutingButtons)
  assert.deepEqual(offenders, [])
})
