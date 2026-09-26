'use client'

import { getIntelligenceEventStatusLabel } from '@/lib/intelligence/socket-payload'

import { useSharedIntelligenceSocket } from './IntelligenceSocketProvider'

function resolveConnectionLabel(isConnected: boolean, isReconnecting: boolean): string {
  if (isReconnecting) return 'Memperbarui...'
  if (isConnected) return 'Live'
  return 'Offline'
}

export default function IntelligenceDashboardLiveStatus(): React.JSX.Element {
  const socket = useSharedIntelligenceSocket()

  const latestEvent = socket.lastEncounterUpdate ?? socket.lastCriticalAlert
  const connLabel = resolveConnectionLabel(socket.isConnected, socket.isReconnecting)
  const isLive = socket.isConnected

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto auto 1fr',
        gap: 16,
        alignItems: 'center',
        border: '1px solid var(--line-base)',
        borderRadius: 6,
        padding: '16px 20px',
        background: 'var(--bg-card)',
      }}
    >
      {/* Status dot + label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: isLive ? 'var(--c-ok)' : 'var(--text-muted)',
            boxShadow: isLive ? '0 0 8px var(--c-ok)' : 'none',
          }}
        />
        <div
          style={{
            fontSize: 13,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.1em',
            color: isLive ? 'var(--c-ok)' : 'var(--text-muted)',
            textTransform: 'uppercase',
          }}
        >
          {connLabel}
        </div>
      </div>

      {/* Data source */}
      <div
        style={{
          fontSize: 12,
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
          letterSpacing: '0.05em',
          opacity: 0.6,
          borderLeft: '1px solid var(--line-base)',
          paddingLeft: 16,
        }}
      >
        {isLive ? '/intelligence namespace' : 'Disconnected'}
      </div>

      {/* Latest event */}
      <div
        style={{
          fontSize: 12,
          color: 'var(--text-muted)',
          textAlign: 'right',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {latestEvent
          ? `${latestEvent.encounterId} · ${getIntelligenceEventStatusLabel(latestEvent.status)}`
          : 'To be filled — belum ada event live'}
      </div>
    </div>
  )
}
