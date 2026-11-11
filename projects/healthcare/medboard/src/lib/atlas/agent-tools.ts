// Ported from Human Atlas (MIT, © 2026 ashemag, licence in LICENSE-human-atlas.txt): https://github.com/slorksmo/Human-Atlas
// Optional WebMCP tools: browsers with document.modelContext can search and open structures.
import type { Atlas, Concept } from './anatomy'

interface Tool {
  name: string
  description: string
  inputSchema: object
  annotations: { readOnlyHint: boolean }
  execute: (input: unknown) => unknown
}

interface ModelContext {
  registerTool: (tool: Tool, options: { signal: AbortSignal }) => void | Promise<void>
}

function field(input: unknown, key: string): unknown {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Expected an object.')
  const value: unknown = Reflect.get(input, key)
  return value
}

function isModelContext(value: unknown): value is ModelContext {
  return typeof value === 'object' && value !== null && typeof Reflect.get(value, 'registerTool') === 'function'
}

export function atlasTools(atlas: Atlas, inspect: (concept: Concept) => void): Tool[] {
  return [
    {
      name: 'find_anatomy',
      description: 'Find anatomical structures by English name or source atlas identifier in this atlas.',
      inputSchema: { type: 'object', properties: { query: { type: 'string', minLength: 1 } }, required: ['query'], additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute(input) {
        const query = field(input, 'query')
        if (typeof query !== 'string' || !query.trim()) throw new Error('A nonempty query is required.')
        const needle = query.toLowerCase().trim()
        return atlas.concepts
          .filter((concept) => concept.name.toLowerCase().includes(needle) || concept.id.toLowerCase().includes(needle))
          .slice(0, 30)
          .map((concept) => ({ id: concept.id, name: concept.name, pieces: concept.elements.length }))
      },
    },
    {
      name: 'inspect_anatomical_structure',
      description: 'Select an atlas concept in the 3D anatomy and open its visible detail panel.',
      inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'], additionalProperties: false },
      annotations: { readOnlyHint: false },
      execute(input) {
        const id = field(input, 'id')
        if (typeof id !== 'string') throw new Error('An atlas identifier is required.')
        const concept = atlas.concepts.find((entry) => entry.id === id)
        if (!concept) throw new Error('That structure is not present in this atlas.')
        inspect(concept)
        return { id: concept.id, name: concept.name, selectedPieces: concept.elements.length }
      },
    },
  ]
}

export function registerAtlasTools(atlas: Atlas, inspect: (concept: Concept) => void): () => void {
  const context: unknown = Reflect.get(document, 'modelContext')
  const lifecycle = new AbortController()
  if (!isModelContext(context)) return () => lifecycle.abort()
  for (const tool of atlasTools(atlas, inspect)) {
    // Optional browser capability: a refused tool leaves the visible interface as it is.
    Promise.resolve()
      .then(() => context.registerTool(tool, { signal: lifecycle.signal }))
      .catch((error: unknown) => console.warn('Atlas tool not registered', tool.name, error))
  }
  return () => lifecycle.abort()
}
