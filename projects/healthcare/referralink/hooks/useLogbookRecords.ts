import { useEffect, useState } from 'react'

import { logbookRepository, type LogbookSnapshot } from '../services/logbookRepository'

const EMPTY_SNAPSHOT: LogbookSnapshot = {
  records: [],
  storageStatus: 'ready',
}

export function useLogbookRecords() {
  const [snapshot, setSnapshot] = useState<LogbookSnapshot>(EMPTY_SNAPSHOT)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    const refresh = () => {
      void logbookRepository.list().then((nextSnapshot) => {
        if (!active) return
        setSnapshot((currentSnapshot) => ({
          ...nextSnapshot,
          privacyMigrationApplied:
            currentSnapshot.privacyMigrationApplied || nextSnapshot.privacyMigrationApplied,
        }))
        setLoading(false)
      })
    }

    const unsubscribe = logbookRepository.subscribe(refresh)
    refresh()

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  return {
    ...snapshot,
    loading,
  }
}
