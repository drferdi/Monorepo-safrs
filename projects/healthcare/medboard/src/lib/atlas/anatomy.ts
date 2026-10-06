// Atlas Anatomi data model. Ported from Human Atlas (MIT, © 2026 ashemag, licence in src/lib/atlas/LICENSE-human-atlas.txt):
// https://github.com/slorksmo/Human-Atlas. Anatomy data CC BY 4.0, credits in public/atlas/ATTRIBUTION.md.
// Chief 2026-10-07: every name in Latin (Terminologia Anatomica) with its Indonesian name; text in Indonesian.
import prose from './prose-id.json'

export type SystemId =
  | 'skeletal' | 'muscular' | 'arterial' | 'venous' | 'nervous' | 'digestive' | 'respiratory' | 'urinary'
  | 'reproductive' | 'lymphatic' | 'endocrine' | 'integumentary' | 'connective' | 'sensory' | 'cardiac'
  | 'pregnancy' | 'brain' | 'borrowed' | 'donor-muscle'
export type Sex = 'male' | 'female'
export type View = 'three-quarter' | 'front' | 'side' | 'back'

export interface Part {
  id: string
  name: string
  conceptId: string
  system: SystemId
  chunk: number
  positions: number
  normals: number
  indices: number
  vertexCount: number
  indexCount: number
  bounds: [number[], number[]]
}
export interface Concept {
  id: string
  name: string
  elements: string[]
}
export interface Atlas {
  version: string
  sex?: Sex
  parts: Part[]
  concepts: Concept[]
  chunks: Array<{ url: string; bytes: number; gzipBytes: number }>
  triangles: number
}
export interface SceneState {
  inspectorOpen?: boolean
  explode: number
  visible: SystemId[]
  selected: string[]
  isolate: boolean
  view: View
  rotate: boolean
  reset: number
}

const SYSTEM_PROSE: Record<SystemId, { name: string; description: string }> = prose.systems
const COLORS: Record<SystemId, string> = {
  skeletal: '#e2d9ba', muscular: '#a85b50', cardiac: '#b96760', sensory: '#b0c8ce', arterial: '#c05245',
  venous: '#527c9f', nervous: '#d8b565', brain: '#b3a8c6', respiratory: '#b98991', digestive: '#b8916b',
  urinary: '#b47961', lymphatic: '#879f7c', endocrine: '#c5a09a', reproductive: '#bda098', pregnancy: '#c8a6ae',
  integumentary: '#ba9b7d', borrowed: '#9aa7b1', 'donor-muscle': '#a8776e', connective: '#aec3bb',
}
const ORDER: SystemId[] = [
  'skeletal', 'muscular', 'cardiac', 'sensory', 'arterial', 'venous', 'nervous', 'brain', 'respiratory', 'digestive',
  'urinary', 'lymphatic', 'endocrine', 'reproductive', 'pregnancy', 'integumentary', 'borrowed', 'donor-muscle', 'connective',
]
export const SYSTEMS = ORDER.map((id) => ({ id, color: COLORS[id], ...SYSTEM_PROSE[id] }))
export const systemName = (id: SystemId) => SYSTEM_PROSE[id].name

/** Systems every body starts with; the rest stay listed and switch on in one tap. */
export const DEFAULT_VISIBLE: SystemId[] = [
  'cardiac', 'sensory', 'skeletal', 'muscular', 'arterial', 'venous', 'nervous', 'brain', 'respiratory', 'digestive',
  'urinary', 'lymphatic', 'endocrine', 'reproductive', 'connective',
]
export const ORGAN_SYSTEMS: SystemId[] = ['cardiac', 'respiratory', 'digestive', 'urinary', 'endocrine', 'reproductive']

/** Each reference body is a separate dataset with its own scope and credits. */
export interface Edition {
  sex: Sex
  label: string
  caption: string
  manifest: string
  dataset: string
  summary: string
  limits: string
  credit: string
  licence: string
  download: string
  publication: string
  suggestions: string[]
  hidden: SystemId[]
}
export const EDITIONS: Edition[] = [
  {
    sex: 'male',
    ...prose.editions.male,
    manifest: '/atlas/atlas.json',
    dataset: 'BodyParts3D 4.0',
    credit: 'BodyParts3D, © The Database Center for Life Science, berlisensi Creative Commons Attribution 4.0 International.',
    licence: 'https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html',
    download: 'https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html',
    publication: 'https://academic.oup.com/nar/article/37/suppl_1/D782/1000752',
    suggestions: ['heart', 'brain', 'liver', 'stomach', 'spleen', 'pancreas', 'urinary bladder', 'trachea'],
    hidden: ['reproductive'],
  },
  {
    sex: 'female',
    ...prose.editions.female,
    manifest: '/atlas/atlas-female.json',
    dataset: 'Human Reference Atlas female v1.10',
    credit:
      '3D Reference Organ Set for Female v1.10 oleh Kristen Browne dan Heidi Schlehlein, HuBMAP Human Reference Atlas, ' +
      'dibangun dari Visible Human Dataset U.S. National Library of Medicine. Otot tungkai dari set ekstremitas bawah ' +
      'Visible Human Female oleh Andreassen dan rekan. Keduanya berlisensi Creative Commons Attribution 4.0 International.',
    licence: 'https://creativecommons.org/licenses/by/4.0/',
    download: 'https://humanatlas.io/3d-reference-library',
    publication: 'https://doi.org/10.1038/s41597-022-01905-2',
    suggestions: ['heart', 'brain', 'uterus', 'ovary', 'liver', 'kidney', 'tongue', 'mammary gland'],
    hidden: ['reproductive'],
  },
]
export const edition = (sex: Sex) => EDITIONS.find((entry) => entry.sex === sex) ?? EDITIONS[0]
export const defaultVisible = (sex: Sex): SystemId[] => DEFAULT_VISIBLE.filter((id) => !edition(sex).hidden.includes(id))

/* Names. The source names are English (FMA, HuBMAP). public/atlas/terms.json gives each one its
   Latin and Indonesian name; `verified` is false where the Latin was machine-translated and has
   not been matched to a published Latin label (Chief chose to show those, marked). */
export interface TermEntry {
  la: string
  id: string
  verified: boolean
}
export type TermTable = Record<string, TermEntry>
export interface AtlasTerm {
  la: string
  id: string
  source: string
  verified: boolean
}

export function termFor(table: TermTable, name: string): AtlasTerm {
  const entry: TermEntry | undefined = table[name.toLowerCase().trim()]
  return { la: entry?.la ?? name, id: entry?.id ?? name, source: name, verified: entry?.verified ?? false }
}

const MAX_RESULTS = 80
const fold = (text: string) => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

/** 0: a name starts with the query; 1: a word inside a name does; 2: the query sits inside a word. */
function rank(names: string[], needle: string): number {
  let best = -1
  for (const name of names.map(fold)) {
    const at = name.indexOf(needle)
    if (at < 0) continue
    const score = at === 0 ? 0 : new RegExp(`(^|[\\s(,/-])${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(name) ? 1 : 2
    best = best < 0 ? score : Math.min(best, score)
  }
  return best
}

/** Search every named structure by its Latin, Indonesian or source name, or its atlas reference.
 * Without a query, the body's suggestions show in their own order. */
export function searchConcepts(concepts: Concept[], table: TermTable, query: string, suggestions: string[] = []): Concept[] {
  const needle = fold(query)
  if (!needle) {
    return suggestions
      .map((name) => concepts.find((concept) => concept.name.toLowerCase() === name))
      .filter((concept): concept is Concept => concept !== undefined)
  }
  return concepts
    .map((concept) => {
      const term = termFor(table, concept.name)
      return { concept, score: rank([term.la, term.id, term.source, concept.id], needle), length: term.la.length }
    })
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => a.score - b.score || a.length - b.length)
    .slice(0, MAX_RESULTS)
    .map((entry) => entry.concept)
}

/* Explanations: short Indonesian paragraphs keyed by the English source name. */
const EXPLANATIONS: Record<string, string> = prose.explanations
const SYSTEM_NOTES: Record<Sex, Partial<Record<SystemId, string>>> = prose.systemNotes
const shared = (name: string) =>
  name
    .replace(/\s*\((?:left|right)\)\s*$/, '')
    .replace(/^(?:left|right)\s+/, '')
    .replace(/\s+[a-z]$/, '')
    .trim()
/** Longest first, so `intervertebral disk` wins over any shorter prefix. */
const KEYS_BY_LENGTH = Object.keys(EXPLANATIONS).sort((a, b) => b.length - a.length)
/** Many source names qualify a structure the atlas already explains, as in `Intervertebral disk
 * of third lumbar vertebra`; fall back to that structure. */
const qualified = (name: string) => KEYS_BY_LENGTH.find((key) => name.startsWith(`${key} `) || name.endsWith(` ${key}`))
const entryFor = (name: string): string | undefined => {
  const key = name.toLowerCase().trim()
  const base = shared(key)
  return EXPLANATIONS[key] ?? EXPLANATIONS[base] ?? EXPLANATIONS[qualified(base) ?? '']
}
/** True when the atlas explains this structure itself rather than falling back to its system. */
export const described = (name: string) => entryFor(name) !== undefined

export function explanation(name: string, system: SystemId, sex: Sex = 'male'): string {
  return entryFor(name) ?? SYSTEM_NOTES[sex][system] ?? SYSTEM_PROSE[system].description
}
