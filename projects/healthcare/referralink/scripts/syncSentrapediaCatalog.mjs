import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const appDirectory = resolve(scriptDirectory, '..')
const sentrapediaDirectory = resolve(scriptDirectory, '../../sentraverse/components/sentrapedia')
const diseaseSourcePath = resolve(sentrapediaDirectory, 'diseases-data.ts')
const categorySourcePath = resolve(sentrapediaDirectory, 'data.ts')

function evaluateExportedArray(source, declaration, endMarker = '') {
  const start = source.indexOf(declaration)
  if (start < 0) throw new Error('Missing ' + declaration + ' in source.')
  const end = endMarker ? source.indexOf(endMarker, start) : source.length
  const slice = source.slice(start, end < 0 ? source.length : end)
  const expression = slice
    .replace(/^export const DISEASES = /, 'globalThis.DISEASES = ')
    .replace(/^export const CATEGORIES: Category\[\] = /, 'globalThis.CATEGORIES = ')
  const context = {}
  vm.runInNewContext(expression, context)
  return context.DISEASES ?? context.CATEGORIES
}

const rawDiseases = evaluateExportedArray(
  readFileSync(diseaseSourcePath, 'utf8'),
  'export const DISEASES ='
)
const rawCategories = evaluateExportedArray(
  readFileSync(categorySourcePath, 'utf8'),
  'export const CATEGORIES',
  'export const stats'
)
const aliases = {
  'Pernapasan Bawah': 'ISPA',
  'Saluran Cerna': 'Pencernaan',
}
const diseases = rawDiseases.map((disease) => ({
  ...disease,
  kategori: aliases[disease.kategori] ?? disease.kategori,
}))
const categories = rawCategories.map((category) => ({
  id: category.id,
  name: category.name,
  code: category.kode,
  description: category.desc,
}))

const categoryIds = new Set(diseases.map((disease) => disease.kategori))
if (diseases.length !== 144) throw new Error('Expected 144 diseases, received ' + diseases.length + '.')
if (categories.length !== 14) throw new Error('Expected 14 categories, received ' + categories.length + '.')
if ([...categoryIds].some((id) => !categories.some((category) => category.id === id))) {
  throw new Error('Snapshot contains a disease category without a canonical category entry.')
}

const output = {
  source: 'sentraverse/components/sentrapedia',
  description: 'Standalone MEDLINK snapshot; clinical reference, not authoritative ICD data.',
  categories,
  diseases,
}
writeFileSync(
  resolve(appDirectory, 'data/sentrapediaCatalog.json'),
  JSON.stringify(output, null, 2) + '\n',
  'utf8'
)
console.log('Sentrapedia snapshot generated: ' + diseases.length + ' diseases, ' + categories.length + ' categories.')
