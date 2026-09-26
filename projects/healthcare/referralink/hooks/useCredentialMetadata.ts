import { useEffect, useState } from 'react'

import { credentialRepository } from '../services/credentialRepository'
import type { CredentialMetadata } from '../services/credentialMetadata'

export function useCredentialMetadata() {
  const [records, setRecords] = useState<CredentialMetadata[]>([])
  const [storageStatus, setStorageStatus] = useState<'ready' | 'unavailable'>('ready')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const refresh = () => {
      void credentialRepository.list().then((snapshot) => {
        if (!active) return
        setRecords(snapshot.records)
        setStorageStatus(snapshot.storageStatus)
        setLoading(false)
      })
    }
    const unsubscribe = credentialRepository.subscribe(refresh)
    refresh()
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  return { records, storageStatus, loading }
}
