import type { LogbookAuditEnvelope, LogbookStorageStatus } from './logbookTypes'
import {
  consumeMedlinkLogbookPrivacyMigrationNotice,
  MEDLINK_LOGBOOK_STORE_NAME,
  openMedlinkWorkspaceDatabase,
} from './workspaceDatabase'

const STORE_NAME = MEDLINK_LOGBOOK_STORE_NAME
const MAX_RECORDS = 500
const MAX_AGE_MS = 90 * 86_400_000

export interface LogbookStorage {
  list(): Promise<unknown[]>
  put(record: LogbookAuditEnvelope): Promise<void>
  delete(id: string): Promise<void>
  clear(): Promise<void>
  consumePrivacyMigrationNotice?(): Promise<boolean>
}

export interface LogbookSnapshot {
  records: LogbookAuditEnvelope[]
  storageStatus: LogbookStorageStatus
  privacyMigrationApplied?: boolean
}

export interface LogbookRepositoryOptions {
  primary?: LogbookStorage
  now?: () => number
}

const ENVELOPE_KEYS = [
  'createdAt',
  'durationMs',
  'failureCode',
  'humanReviewRequired',
  'id',
  'referralCount',
  'resultSchemaVersion',
  'schemaVersion',
  'status',
  'urgency',
] as const

const FAILURE_CODES = new Set([
  'timeout',
  'rate-limited',
  'invalid-output',
  'service-unavailable',
  'network',
  'unknown',
])

export function isLogbookAuditEnvelope(value: unknown): value is LogbookAuditEnvelope {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<LogbookAuditEnvelope>
  const keys = Object.keys(record).sort()
  const hasExactKeys =
    keys.length === ENVELOPE_KEYS.length && keys.every((key, index) => key === ENVELOPE_KEYS[index])
  if (!hasExactKeys) return false

  const commonFieldsValid =
    record.schemaVersion === 2 &&
    typeof record.id === 'string' &&
    typeof record.createdAt === 'string' &&
    Number.isFinite(Date.parse(record.createdAt)) &&
    (record.status === 'completed' || record.status === 'failed') &&
    typeof record.durationMs === 'number' &&
    Number.isFinite(record.durationMs) &&
    record.durationMs >= 0 &&
    (record.urgency === null ||
      record.urgency === 'routine' ||
      record.urgency === 'urgent' ||
      record.urgency === 'emergency') &&
    typeof record.referralCount === 'number' &&
    Number.isInteger(record.referralCount) &&
    record.referralCount >= 0 &&
    (record.resultSchemaVersion === null ||
      (typeof record.resultSchemaVersion === 'number' &&
        Number.isInteger(record.resultSchemaVersion) &&
        record.resultSchemaVersion > 0)) &&
    record.humanReviewRequired === true &&
    (record.failureCode === null ||
      (typeof record.failureCode === 'string' && FAILURE_CODES.has(record.failureCode)))

  if (!commonFieldsValid) return false
  if (record.status === 'completed') {
    return (
      record.urgency !== null && record.resultSchemaVersion !== null && record.failureCode === null
    )
  }
  return (
    record.urgency === null &&
    record.referralCount === 0 &&
    record.resultSchemaVersion === null &&
    record.failureCode !== null
  )
}

export function pruneLogbookRecords(records: LogbookAuditEnvelope[], now: number) {
  const cutoff = now - MAX_AGE_MS
  return records
    .filter((record) => Date.parse(record.createdAt) >= cutoff)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(0, MAX_RECORDS)
}

export function createMemoryLogbookStorage(initial: unknown[] = []): LogbookStorage {
  const records = new Map(
    initial.filter(isLogbookAuditEnvelope).map((record) => [record.id, record])
  )

  return {
    async list() {
      return [...records.values()]
    },
    async put(record) {
      records.set(record.id, record)
    },
    async delete(id) {
      records.delete(id)
    },
    async clear() {
      records.clear()
    },
  }
}

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'))
  })
}

export function createIndexedDbLogbookStorage(factory: IDBFactory = indexedDB): LogbookStorage {
  const database = openMedlinkWorkspaceDatabase(factory)

  const withStore = async <T>(
    mode: IDBTransactionMode,
    action: (store: IDBObjectStore) => IDBRequest<T> | undefined
  ) => {
    const db = await database
    const transaction = db.transaction(STORE_NAME, mode)
    const request = action(transaction.objectStore(STORE_NAME))
    if (!request) {
      return new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve()
        transaction.onerror = () =>
          reject(transaction.error ?? new Error('IndexedDB transaction failed.'))
      })
    }
    return requestResult(request)
  }

  return {
    async list() {
      return (await withStore('readonly', (store) => store.getAll())) as unknown[]
    },
    async put(record) {
      await withStore('readwrite', (store) => store.put(record))
    },
    async delete(id) {
      await withStore('readwrite', (store) => store.delete(id))
    },
    async clear() {
      await withStore('readwrite', (store) => store.clear())
    },
    async consumePrivacyMigrationNotice() {
      await database
      return consumeMedlinkLogbookPrivacyMigrationNotice()
    },
  }
}

async function replaceStorage(storage: LogbookStorage, records: LogbookAuditEnvelope[]) {
  await storage.clear()
  for (const record of records) {
    await storage.put(record)
  }
}

export class LogbookRepository {
  private readonly fallback = createMemoryLogbookStorage()
  private readonly listeners = new Set<() => void>()
  private readonly now: () => number
  private primary?: LogbookStorage
  private storageStatus: LogbookStorageStatus
  private loaded = false
  private privacyMigrationApplied = false

  constructor({ primary, now = Date.now }: LogbookRepositoryOptions = {}) {
    this.primary = primary
    this.now = now
    this.storageStatus = primary ? 'ready' : 'unavailable'
  }

  private async loadSnapshot(): Promise<LogbookSnapshot> {
    if (this.primary && !this.loaded) {
      try {
        const records = (await this.primary.list()).filter(isLogbookAuditEnvelope)
        await replaceStorage(this.fallback, pruneLogbookRecords(records, this.now()))
        this.privacyMigrationApplied =
          this.privacyMigrationApplied ||
          ((await this.primary.consumePrivacyMigrationNotice?.()) ?? false)
        this.loaded = true
      } catch {
        this.storageStatus = 'unavailable'
        this.primary = undefined
      }
    }

    const records = pruneLogbookRecords(
      (await this.fallback.list()).filter(isLogbookAuditEnvelope),
      this.now()
    )
    return {
      records,
      storageStatus: this.storageStatus,
      privacyMigrationApplied: this.privacyMigrationApplied,
    }
  }

  async list(): Promise<LogbookSnapshot> {
    return this.loadSnapshot()
  }

  async put(record: LogbookAuditEnvelope) {
    if (!isLogbookAuditEnvelope(record)) {
      throw new TypeError('Invalid logbook audit envelope.')
    }
    const current = await this.loadSnapshot()
    const records = pruneLogbookRecords(
      [...current.records.filter((item) => item.id !== record.id), record],
      this.now()
    )
    await replaceStorage(this.fallback, records)

    if (this.primary) {
      try {
        await replaceStorage(this.primary, records)
        this.loaded = true
      } catch {
        this.storageStatus = 'unavailable'
        this.primary = undefined
      }
    }
    this.emit()
  }

  async delete(id: string) {
    const current = await this.loadSnapshot()
    const records = current.records.filter((record) => record.id !== id)
    await replaceStorage(this.fallback, records)
    if (this.primary) {
      try {
        await replaceStorage(this.primary, records)
      } catch {
        this.storageStatus = 'unavailable'
        this.primary = undefined
      }
    }
    this.emit()
  }

  async clear() {
    await this.fallback.clear()
    if (this.primary) {
      try {
        await this.primary.clear()
      } catch {
        this.storageStatus = 'unavailable'
        this.primary = undefined
      }
    }
    this.emit()
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit() {
    for (const listener of this.listeners) listener()
  }
}

export function createLogbookRepository(options: LogbookRepositoryOptions = {}) {
  return new LogbookRepository(options)
}

const browserStorage =
  typeof indexedDB === 'undefined' ? undefined : createIndexedDbLogbookStorage(indexedDB)

export const logbookRepository = new LogbookRepository({ primary: browserStorage })
