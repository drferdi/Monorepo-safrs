export const MEDLINK_WORKSPACE_DATABASE_NAME = 'medlink-workspace-v1'
export const MEDLINK_WORKSPACE_DATABASE_VERSION = 3
export const MEDLINK_LOGBOOK_STORE_NAME = 'logbook'
export const MEDLINK_CREDENTIAL_STORE_NAME = 'credentials'

const STORE_NAMES = [MEDLINK_LOGBOOK_STORE_NAME, MEDLINK_CREDENTIAL_STORE_NAME] as const
let logbookPrivacyMigrationNoticePending = false

export function ensureMedlinkWorkspaceStores(database: IDBDatabase) {
  for (const storeName of STORE_NAMES) {
    if (!database.objectStoreNames.contains(storeName)) {
      database.createObjectStore(storeName, { keyPath: 'id' })
    }
  }
}

export function consumeMedlinkLogbookPrivacyMigrationNotice() {
  const pending = logbookPrivacyMigrationNoticePending
  logbookPrivacyMigrationNoticePending = false
  return pending
}

export function openMedlinkWorkspaceDatabase(factory: IDBFactory) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open(
      MEDLINK_WORKSPACE_DATABASE_NAME,
      MEDLINK_WORKSPACE_DATABASE_VERSION
    )
    request.onupgradeneeded = (event) => {
      ensureMedlinkWorkspaceStores(request.result)
      if (event.oldVersion < MEDLINK_WORKSPACE_DATABASE_VERSION) {
        request.transaction?.objectStore(MEDLINK_LOGBOOK_STORE_NAME).clear()
        if (event.oldVersion > 0) logbookPrivacyMigrationNoticePending = true
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed.'))
  })
}
