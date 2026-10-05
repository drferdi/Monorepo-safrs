// Drferdi — TrajectoryMonitorPanel
/**
 * TrajectoryMonitorPanel
 *
 * Intelligence Dashboard panel untuk monitoring trajectory pasien.
 * Reads ?patient={hash} dari URL search params untuk patient selection.
 * Menampilkan TrajectoryIntelligencePanel ketika patient dipilih.
 *
 * URL param: `patient` — 64-char hex SHA-256 patient identifier hash
 */

'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { TrajectoryIntelligencePanel } from '@/components/features/trajectory'

function normalizePatientHash(value: string): string {
  return value.trim().toLowerCase()
}

export default function TrajectoryMonitorPanel(): React.JSX.Element {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const patientHash = searchParams.get('patient') ?? ''
  const [draftHash, setDraftHash] = useState(patientHash)
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    setDraftHash(patientHash)
    setValidationError(null)
  }, [patientHash])

  // Validate: must be 64-char hex
  const normalizedHash = normalizePatientHash(patientHash)
  const isValidHash = /^[0-9a-f]{64}$/.test(normalizedHash)

  function updatePatientHash(nextHash: string): void {
    const params = new URLSearchParams(searchParams.toString())
    if (nextHash) {
      params.set('patient', nextHash)
    } else {
      params.delete('patient')
    }

    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  function applyPatientHash(): void {
    const nextHash = normalizePatientHash(draftHash)
    if (!nextHash) {
      setValidationError(null)
      updatePatientHash('')
      return
    }

    if (!/^[0-9a-f]{64}$/.test(nextHash)) {
      setValidationError('Patient hash harus berupa 64 karakter hex SHA-256.')
      return
    }

    setValidationError(null)
    updatePatientHash(nextHash)
  }

  if (!isValidHash) {
    return (
      <div
        style={{
          borderRadius: 6,
          border: '1px dashed var(--line-base)',
          padding: '28px 20px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            marginBottom: 8,
          }}
        >
          Clinical Momentum Engine
        </div>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '0 0 14px' }}>
          Tempel 64-char patient identifier hash untuk membuka trajectory analysis tanpa perlu
          mengubah URL manual.
        </p>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            justifyContent: 'center',
            marginBottom: 12,
          }}
        >
          <input
            type="text"
            value={draftHash}
            onChange={(event) => {
              setDraftHash(event.target.value)
              if (validationError) {
                setValidationError(null)
              }
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                applyPatientHash()
              }
            }}
            placeholder="Paste patient hash 64-char"
            style={{
              width: 'min(100%, 520px)',
              borderRadius: 4,
              border: '1px solid var(--line-base)',
              background: 'transparent',
              padding: '10px 12px',
              fontSize: 12,
              color: 'var(--text-main)',
              outline: 'none',
              fontFamily: 'var(--font-mono)',
            }}
          />
          <button
            type="button"
            onClick={applyPatientHash}
            style={{
              borderRadius: 4,
              border: '1px solid var(--line-base)',
              background: 'transparent',
              padding: '10px 14px',
              fontSize: 12,
              color: 'var(--text-main)',
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
            }}
          >
            Muat trajectory
          </button>
        </div>
        {validationError && (
          <p style={{ fontSize: 12, color: 'var(--c-critical)', margin: '0 0 12px' }}>
            {validationError}
          </p>
        )}
        <div
          style={{
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
            opacity: 0.5,
          }}
        >
          Format: SHA-256 hash dari identifier pasien. URL `?patient=` tetap akan disinkronkan
          otomatis untuk dibagikan.
        </div>
      </div>
    )
  }

  return <TrajectoryIntelligencePanel patientIdentifier={normalizedHash} visitCount={5} />
}
