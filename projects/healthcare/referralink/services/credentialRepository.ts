import type { CredentialMetadata } from './credentialMetadata'
import { MEDLINK_CREDENTIAL_STORE_NAME, openMedlinkWorkspaceDatabase } from './workspaceDatabase'

const STORE_NAME = MEDLINK_CREDENTIAL_STORE_NAME

interface CredentialStorage {
  list(): Promise<CredentialMetadata[]>
  put(value: CredentialMetadata): Promise<void>
  delete(id: string): Promise<void>
}

function createMemoryStorage(): CredentialStorage {
  const values = new Map<string, CredentialMetadata>()
  return {
    async list() {
      return [...values.values()]
    },
    async put(value) {
      values.set(value.id, value)
    },
    async delete(id) {
      values.delete(id)
    },
  }
}

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'))
  })
}

export function createIndexedDbCredentialStorage(factory: IDBFactory): CredentialStorage {
  const database = openMedlinkWorkspaceDatabase(factory)

  const withStore = async <T>(
    mode: IDBTransactionMode,
    action: (store: IDBObjectStore) => IDBRequest<T>
  ) => {
    const db = await database
    return requestResult(action(db.transaction(STORE_NAME, mode).objectStore(STORE_NAME)))
  }

  return {
    async list() {
      return withStore('readonly', (store) => store.getAll()) as Promise<CredentialMetadata[]>
    },
    async put(value) {
      await withStore('readwrite', (store) => store.put(value))
    },
    async delete(id) {
      await withStore('readwrite', (store) => store.delete(id))
    },
  }
}

export class CredentialRepository {
  private readonly fallback = createMemoryStorage()
  private readonly listeners = new Set<() => void>()
  private primary?: CredentialStorage
  private loaded = false
  private storageStatus: 'ready' | 'unavailable'

  constructor(primary?: CredentialStorage) {
    this.primary = primary
    this.storageStatus = primary ? 'ready' : 'unavailable'
  }

  async list() {
    if (this.primary && !this.loaded) {
      try {
        const records = await this.primary.list()
        for (const record of records) await this.fallback.put(record)
        this.loaded = true
      } catch {
        this.primary = undefined
        this.storageStatus = 'unavailable'
      }
    }
    return {
      records: await this.fallback.list(),
      storageStatus: this.storageStatus,
    }
  }

  async put(record: CredentialMetadata) {
    await this.fallback.put(record)
    if (this.primary) {
      try {
        await this.primary.put(record)
      } catch {
        this.primary = undefined
        this.storageStatus = 'unavailable'
      }
    }
    this.emit()
  }

  async delete(id: string) {
    await this.fallback.delete(id)
    if (this.primary) {
      try {
        await this.primary.delete(id)
      } catch {
        this.primary = undefined
        this.storageStatus = 'unavailable'
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

const browserStorage =
  typeof indexedDB === 'undefined' ? undefined : createIndexedDbCredentialStorage(indexedDB)

export const credentialRepository = new CredentialRepository(browserStorage)
