import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import ts from 'typescript'

// Chief 2026-10-06: no ALL-CAPS text on screen — buttons, labels, badges, headings; acronyms stay.
const ACRONYMS = new Set([
  'AADI', 'ACARS', 'ACK', 'ACS', 'AI', 'ANC', 'API', 'AUDREY', 'AVPU', 'BB', 'BMI', 'BPJS', 'CDS',
  'CDSS', 'CEO', 'CISS', 'CLM', 'CMDC', 'CME', 'CRT', 'CSV', 'CT', 'DBP', 'DBS', 'DHF',
  'DHAI', 'DKA', 'DM', 'DMF', 'DOI', 'DTB', 'DTI', 'FKTP', 'ECG', 'EEG', 'EKG', 'EMR', 'GCS', 'GDP', 'GDS',
  'GERD', 'GPU', 'HHS', 'HIM', 'HIV', 'HMOD', 'HPHT', 'HT', 'HTML', 'HTN', 'ICD', 'ICDX',
  'ICU', 'ID', 'IGD', 'IMT', 'INA', 'ISPA', 'JPP', 'JSON', 'KB', 'KIA', 'KKI', 'KODEKI',
  'LB', 'LLM', 'MAP', 'MIRA', 'MKN', 'MRI', 'NEWS', 'NIK', 'NIP', 'NOTAM', 'NSAID', 'OK',
  'PAPDI', 'PDF', 'PDP', 'PHI', 'PHQ', 'PII', 'PMC', 'PNG', 'PNPK', 'PONED', 'PPK', 'PPOK', 'QR', 'RAG',
  'RBAC', 'RCT', 'RFC', 'RM', 'RME', 'RPA', 'RPD', 'RPK', 'RPS', 'RSIA', 'RSUD', 'SBP', 'SCARS',
  'SDK', 'SEP', 'SHA', 'SIK', 'SIP', 'SIRS', 'SKDI', 'SMS', 'SNN', 'SOAP', 'SOP', 'SPO',
  'STR', 'TACC', 'TAN', 'TB', 'TBC', 'TCMA', 'TD', 'TMS', 'TTL', 'TTV', 'UGD', 'UPTD', 'URL',
  'USG', 'WBC', 'WHO', 'WIB',
])

// Object properties and variable or function names that only ever hold screen text.
const DISPLAY_PROPERTY = /^(label|title|description|subtitle|placeholder|text|heading|kicker|badge|hint|caption|note|cta|emptyText)$/
const DISPLAY_NAME = /(Label|Title|Badge|Text|Caption|Heading|Copy|Kicker|Hint)$/
const DISPLAY_ATTRIBUTES = new Set(['label', 'title', 'placeholder', 'children', 'description', 'subtitle'])

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
  return (text.match(/[A-Za-z0-9]+/g) ?? []).filter((word) => {
    const letters = word.replace(/[^A-Za-z]/g, '')
    return letters.length >= 3 && letters === letters.toUpperCase() && !ACRONYMS.has(letters)
  })
}

// A string literal is on screen when it reaches JSX through ( ), ? : branches or && / || / ??.
// Comparisons, keys, call arguments and logic attributes are not text.
function isDisplayed(node: ts.Node): boolean {
  let child: ts.Node = node
  let parent = node.parent
  while (parent) {
    if (ts.isParenthesizedExpression(parent)) {
      // keep climbing
    } else if (ts.isConditionalExpression(parent)) {
      if (child === parent.condition) return false
    } else if (ts.isBinaryExpression(parent)) {
      const op = parent.operatorToken.kind
      const joins =
        op === ts.SyntaxKind.AmpersandAmpersandToken ||
        op === ts.SyntaxKind.BarBarToken ||
        op === ts.SyntaxKind.QuestionQuestionToken
      if (!joins || child !== parent.right) return false
    } else if (ts.isPropertyAssignment(parent)) {
      return child === parent.initializer && DISPLAY_PROPERTY.test(parent.name.getText())
    } else if (ts.isVariableDeclaration(parent)) {
      return child === parent.initializer && DISPLAY_NAME.test(parent.name.getText())
    } else if (ts.isReturnStatement(parent)) {
      const owner = ts.findAncestor(parent, ts.isFunctionLike)
      const name = owner && 'name' in owner && owner.name ? owner.name.getText() : ''
      return DISPLAY_NAME.test(name)
    } else if (ts.isJsxExpression(parent)) {
      const holder = parent.parent
      if (holder && ts.isJsxAttribute(holder)) return DISPLAY_ATTRIBUTES.has(holder.name.getText())
      return true
    } else if (ts.isJsxAttribute(parent)) {
      return DISPLAY_ATTRIBUTES.has(parent.name.getText())
    } else {
      return false
    }
    child = parent
    parent = parent.parent
  }
  return false
}

function displayedTexts(source: ts.SourceFile): Array<{ node: ts.Node; text: string }> {
  const found: Array<{ node: ts.Node; text: string }> = []
  const visit = (node: ts.Node): void => {
    if (ts.isJsxText(node)) found.push({ node, text: node.text })
    else if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && isDisplayed(node)) {
      found.push({ node, text: node.text })
    } else if (ts.isTemplateExpression(node) && isDisplayed(node)) {
      found.push({ node, text: [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join(' ') })
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return found
}

function shoutingTexts(file: string): string[] {
  const text = readFileSync(path.join(process.cwd(), file), 'utf8')
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  return displayedTexts(source)
    .filter(({ text: shown }) => shouting(shown).length > 0)
    .map(({ node, text: shown }) => {
      const line = source.getLineAndCharacterOfPosition(node.getStart()).line + 1
      return `${file}:${line} ${JSON.stringify(shown.trim().slice(0, 60))}`
    })
}

test('no text on screen is written in capitals; acronyms excepted (Chief 2026-10-06)', () => {
  const offenders = sourceFiles('src').flatMap(shoutingTexts)
  assert.deepEqual(offenders, [])
})

test('no stylesheet or inline style turns screen text into capitals', () => {
  const inline = sourceFiles('src').filter((file) =>
    /textTransform:\s*['"]uppercase['"]/.test(readFileSync(path.join(process.cwd(), file), 'utf8'))
  )
  assert.deepEqual(inline, [])
  const cssFiles = (dir: string): string[] =>
    readdirSync(path.join(process.cwd(), dir), { withFileTypes: true }).flatMap((entry) => {
      const relative = path.join(dir, entry.name)
      if (entry.isDirectory()) return cssFiles(relative)
      return entry.name.endsWith('.css') ? [relative] : []
    })
  const offenders = cssFiles('src').filter((file) =>
    /text-transform:\s*uppercase/.test(readFileSync(path.join(process.cwd(), file), 'utf8'))
  )
  assert.deepEqual(offenders, [])
})

test('no screen text is capitalised in code with toUpperCase()', () => {
  const offenders = sourceFiles('src').flatMap((file) => {
    const text = readFileSync(path.join(process.cwd(), file), 'utf8')
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const found: string[] = []
    const visit = (node: ts.Node): void => {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === 'toUpperCase' &&
        isDisplayed(node) &&
        // Codes stay in capitals: an ICD query, a record id.
        !/(^|\.)(id|query)\b|\.slice\(-8\)/.test(node.expression.expression.getText())
      ) {
        found.push(`${file}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}`)
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
    return found
  })
  assert.deepEqual(offenders, [])
})
