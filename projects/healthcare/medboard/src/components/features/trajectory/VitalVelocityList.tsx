// Drferdi — VitalVelocityList: renders all ParamMomentum entries as velocity rows
'use client'

import type { ParamMomentum } from '@/lib/clinical/momentum-engine'
import { VitalVelocityRow } from './VitalVelocityRow'

interface VitalVelocityListProps {
  params: ParamMomentum[]
}

export function VitalVelocityList({ params }: VitalVelocityListProps) {
  if (!params || params.length === 0) return null

  return (
    <div
      style={{
        borderRadius: 8,
        border: '1px solid var(--line-base)',
        background: 'var(--bg-card)',
        padding: '12px 16px',
      }}
      aria-label="Tren kecepatan perubahan vital"
    >
      <div
        style={{
          fontSize: 12,
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
          marginBottom: 10,
        }}
      >
        Velocity Tanda Vital
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {params.map((p) => (
          <VitalVelocityRow key={p.param} param={p} />
        ))}
      </div>
    </div>
  )
}
