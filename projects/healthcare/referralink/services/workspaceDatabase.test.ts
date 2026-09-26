import assert from 'node:assert/strict'

import {
  consumeMedlinkLogbookPrivacyMigrationNotice,
  ensureMedlinkWorkspaceStores,
  MEDLINK_CREDENTIAL_STORE_NAME,
  MEDLINK_LOGBOOK_STORE_NAME,
  MEDLINK_WORKSPACE_DATABASE_NAME,
  MEDLINK_WORKSPACE_DATABASE_VERSION,
  openMedlinkWorkspaceDatabase,
} from './workspaceDatabase.js'

function createDatabase(existingStores: string[] = []) {
  const stores = new Set(existingStores)
  const created: string[] = []
  const database = {
    objectStoreNames: {
      contains(storeName: string) {
        return stores.has(storeName)
      },
    },
    createObjectStore(storeName: string, options: IDBObjectStoreParameters) {
      assert.deepEqual(options, { keyPath: 'id' })
      stores.add(storeName)
      created.push(storeName)
      return {} as IDBObjectStore
    },
  } as IDBDatabase

  return { database, stores, created }
}

const logbookFirst = createDatabase([MEDLINK_LOGBOOK_STORE_NAME])
ensureMedlinkWorkspaceStores(logbookFirst.database)
assert.deepEqual(logbookFirst.created, [MEDLINK_CREDENTIAL_STORE_NAME])

const credentialFirst = createDatabase([MEDLINK_CREDENTIAL_STORE_NAME])
ensureMedlinkWorkspaceStores(credentialFirst.database)
assert.deepEqual(credentialFirst.created, [MEDLINK_LOGBOOK_STORE_NAME])

const completeDatabase = createDatabase([MEDLINK_LOGBOOK_STORE_NAME, MEDLINK_CREDENTIAL_STORE_NAME])
ensureMedlinkWorkspaceStores(completeDatabase.database)
assert.deepEqual(completeDatabase.created, [])

function createUpgradeFactory(oldVersion: number) {
  const existingStores =
    oldVersion === 0 ? [] : [MEDLINK_LOGBOOK_STORE_NAME, MEDLINK_CREDENTIAL_STORE_NAME]
  const state = createDatabase(existingStores)
  let logbookClearCount = 0
  let credentialClearCount = 0
  const transaction = {
    objectStore(storeName: string) {
      return {
        clear() {
          if (storeName === MEDLINK_LOGBOOK_STORE_NAME) logbookClearCount += 1
          if (storeName === MEDLINK_CREDENTIAL_STORE_NAME) credentialClearCount += 1
          return {} as IDBRequest<undefined>
        },
      } as IDBObjectStore
    },
  } as IDBTransaction
  const request = {
    result: state.database,
    error: null,
    transaction,
  } as unknown as IDBOpenDBRequest
  let openedName = ''
  let openedVersion = 0
  const factory = {
    open(name: string, version?: number) {
      openedName = name
      openedVersion = version ?? 0
      queueMicrotask(() => {
        const event = { oldVersion } as IDBVersionChangeEvent
        request.onupgradeneeded?.(event)
        request.onsuccess?.(new Event('success'))
      })
      return request
    },
  } as IDBFactory

  return {
    factory,
    state,
    opened: () => ({ openedName, openedVersion }),
    clears: () => ({ logbookClearCount, credentialClearCount }),
  }
}

const legacy = createUpgradeFactory(2)
assert.equal(await openMedlinkWorkspaceDatabase(legacy.factory), legacy.state.database)
assert.deepEqual(legacy.opened(), {
  openedName: MEDLINK_WORKSPACE_DATABASE_NAME,
  openedVersion: 3,
})
assert.equal(MEDLINK_WORKSPACE_DATABASE_VERSION, 3)
assert.deepEqual(legacy.clears(), { logbookClearCount: 1, credentialClearCount: 0 })
assert.equal(consumeMedlinkLogbookPrivacyMigrationNotice(), true)
assert.equal(consumeMedlinkLogbookPrivacyMigrationNotice(), false)

const fresh = createUpgradeFactory(0)
assert.equal(await openMedlinkWorkspaceDatabase(fresh.factory), fresh.state.database)
assert.deepEqual(fresh.clears(), { logbookClearCount: 1, credentialClearCount: 0 })
assert.equal(consumeMedlinkLogbookPrivacyMigrationNotice(), false)

console.log('workspace database privacy migration contracts passed')
