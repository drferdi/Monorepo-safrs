import 'server-only'

import fs from 'node:fs'
import path from 'node:path'

interface AssistantKnowledgeRow {
  title: string
  content: string
  scope: string
  priority: number
}

interface LocalKnowledgeDocument {
  fileName: string
  scope: string
  title: string
  content: string
}

interface LocalKnowledgeChunk {
  source: string
  title: string
  scope: string
  content: string
  score: number
}

const LOCAL_KNOWLEDGE_FILES: Array<{
  fileName: string
  scope: string
  title: string
}> = [
  {
    fileName: 'audrey.md',
    scope: 'CLINICAL_CONSULTATION',
    title: 'Audrey Reference',
  },
  {
    fileName: 'sentra_knowledge.md',
    scope: 'GLOBAL',
    title: 'Sentra Knowledge',
  },
  { fileName: 'ferdiiskandar.md', scope: 'GLOBAL', title: 'Chief Reference' },
]

let cachedLocalDocuments: LocalKnowledgeDocument[] | null = null

function getKnowledgeDirectory(): string {
  return path.join(process.cwd(), 'database')
}

function escapeSqlText(value: string): string {
  return value.replace(/'/g, "''")
}

function normalizeScope(value: string): string {
  return value.trim().toUpperCase() || 'GLOBAL'
}

function tokenizeQuery(query: string): string[] {
  return Array.from(
    new Set(
      query
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .map(token => token.trim())
        .filter(token => token.length >= 3)
    )
  )
}

function isAudreyFocusedQuery(query: string): boolean {
  const normalized = query.toLowerCase()
  return [
    'audrey',
    'abby',
    'clinical consultation ai',
    'ai klinis',
    'safety pipeline',
    'cognitive architecture',
  ].some(keyword => normalized.includes(keyword))
}

function isFerdiFocusedQuery(query: string): boolean {
  const normalized = query.toLowerCase()
  return ['ferdi', 'dr ferdi', 'dr. ferdi', 'ferdi iskandar', 'chief', 'clinical steward'].some(
    keyword => normalized.includes(keyword)
  )
}

function splitMarkdownIntoSections(content: string): Array<{ title: string; content: string }> {
  const parts = content
    .split(/\n(?=##+\s)/g)
    .map(part => part.trim())
    .filter(Boolean)
  if (parts.length === 0) return []

  return parts.map((part, index) => {
    const lines = part.split('\n')
    const heading = lines[0]?.replace(/^##+\s*/, '').trim()
    return {
      title: heading || `Section ${index + 1}`,
      content: part,
    }
  })
}

function loadLocalKnowledgeDocuments(): LocalKnowledgeDocument[] {
  if (cachedLocalDocuments) return cachedLocalDocuments

  const docs: LocalKnowledgeDocument[] = []
  const baseDir = getKnowledgeDirectory()

  for (const item of LOCAL_KNOWLEDGE_FILES) {
    const filePath = path.join(baseDir, item.fileName)
    if (!fs.existsSync(filePath)) continue

    try {
      const content = fs.readFileSync(filePath, 'utf-8').trim()
      if (!content) continue

      docs.push({
        fileName: item.fileName,
        scope: item.scope,
        title: item.title,
        content,
      })
    } catch (error) {
      console.error('[assistant-knowledge] Gagal membaca file knowledge lokal:', filePath, error)
    }
  }

  cachedLocalDocuments = docs
  return docs
}

function buildLocalKnowledgeContext(args: { scope: string; query: string; limit: number }): string {
  const tokens = tokenizeQuery(args.query)
  const audreyFocusedQuery = isAudreyFocusedQuery(args.query)
  const ferdiFocusedQuery = isFerdiFocusedQuery(args.query)
  const docs = loadLocalKnowledgeDocuments().filter(
    doc => doc.scope === 'GLOBAL' || doc.scope === args.scope
  )
  if (docs.length === 0) return ''

  const chunks: LocalKnowledgeChunk[] = []

  for (const doc of docs) {
    const sections = splitMarkdownIntoSections(doc.content)
    const fallbackSections =
      sections.length > 0 ? sections : [{ title: doc.title, content: doc.content }]

    for (const section of fallbackSections) {
      const haystack = `${doc.title}\n${section.title}\n${section.content}`.toLowerCase()
      let score = 0

      if (tokens.length === 0) {
        score = doc.scope === args.scope ? 3 : 2
      } else {
        for (const token of tokens) {
          if (section.title.toLowerCase().includes(token)) score += 4
          if (doc.title.toLowerCase().includes(token)) score += 2
          if (haystack.includes(token)) score += 1
        }
      }

      if (audreyFocusedQuery && doc.fileName === 'audrey.md') {
        score += 10_000
      }
      if (ferdiFocusedQuery && doc.fileName === 'ferdiiskandar.md') {
        score += 10_000
      }

      if (score <= 0) continue

      chunks.push({
        source: doc.fileName,
        title: section.title,
        scope: doc.scope,
        content: section.content.slice(0, 1200),
        score,
      })
    }
  }

  const selected = chunks
    .sort((left, right) => right.score - left.score || left.content.length - right.content.length)
    .slice(0, Math.min(args.limit, 4))

  if (selected.length === 0) return ''

  return selected
    .map(
      (chunk, index) =>
        `${index + 1}. [LOCAL:${chunk.scope}] ${chunk.title} (${chunk.source})\n${chunk.content}`
    )
    .join('\n\n')
}

function formatKnowledgeRows(rows: AssistantKnowledgeRow[]): string {
  if (rows.length === 0) return ''

  return rows
    .map((row, index) => {
      const scopeLabel = row.scope === 'GLOBAL' ? 'GLOBAL' : row.scope
      return `${index + 1}. [DB:${scopeLabel}] ${row.title}\n${row.content}`
    })
    .join('\n\n')
}

async function getDatabaseKnowledgeContext(args: {
  assistantName: string
  scope: string
  limit: number
}): Promise<string> {
  try {
    const databaseUrl = process.env.DATABASE_URL?.trim()
    if (!databaseUrl) return ''

    const { prisma } = await import('@/lib/prisma')
    const delegate = prisma as unknown as {
      $queryRawUnsafe?: <T = unknown>(query: string) => Promise<T>
    }

    if (!delegate.$queryRawUnsafe) return ''

    const sql = `
      SELECT
        title,
        content,
        scope,
        priority
      FROM assistant_knowledge_entries
      WHERE assistant_name = '${escapeSqlText(args.assistantName)}'
        AND is_active = TRUE
        AND scope IN ('GLOBAL', '${escapeSqlText(args.scope)}')
      ORDER BY priority DESC, updated_at DESC, created_at DESC
      LIMIT ${args.limit}
    `

    const rows = await delegate.$queryRawUnsafe<AssistantKnowledgeRow[]>(sql)
    return formatKnowledgeRows(Array.isArray(rows) ? rows : [])
  } catch (error) {
    console.error('[assistant-knowledge] Gagal memuat knowledge dari database:', error)
    return ''
  }
}

export async function getAssistantKnowledgeContext(args: {
  assistantName: string
  scope?: string
  query?: string
  limit?: number
}): Promise<string> {
  const assistantName = args.assistantName.trim().toUpperCase()
  const scope = normalizeScope(args.scope ?? 'GLOBAL')
  const query = String(args.query ?? '').trim()
  const limit = Math.max(1, Math.min(args.limit ?? 8, 24))

  if (!assistantName) return ''

  const [databaseContext] = await Promise.all([
    getDatabaseKnowledgeContext({ assistantName, scope, limit }),
  ])

  const localContext = buildLocalKnowledgeContext({ scope, query, limit })

  return [databaseContext, localContext].filter(section => section.trim().length > 0).join('\n\n')
}
