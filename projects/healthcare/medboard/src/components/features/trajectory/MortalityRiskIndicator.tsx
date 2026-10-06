// Drferdi — MortalityRiskIndicator
/**
 * MortalityRiskIndicator
 *
 * Displays the mortality proxy tier and clinical urgency tier as badges.
 * Compact single-row display — designed to sit at the top of the panel.
 */

'use client'

import type { MortalityProxyRisk } from '@/types/abyss/trajectory'
import { MORTALITY_TIER_CONFIG, URGENCY_TIER_CONFIG } from '@/types/abyss/trajectory'

interface MortalityRiskIndicatorProps {
  mortalityProxy: MortalityProxyRisk
  className?: string
}

export function MortalityRiskIndicator({ mortalityProxy, className }: MortalityRiskIndicatorProps) {
  const tierCfg =
    MORTALITY_TIER_CONFIG[mortalityProxy.mortality_proxy_tier] ?? MORTALITY_TIER_CONFIG.low
  const urgencyCfg =
    URGENCY_TIER_CONFIG[mortalityProxy.clinical_urgency_tier as keyof typeof URGENCY_TIER_CONFIG] ??
    URGENCY_TIER_CONFIG.low
  const score = Math.round(mortalityProxy.mortality_proxy_score)

  return (
    <div
      className={className}
      style={{
        borderRadius: 8,
        border: `1px solid ${tierCfg.color}40`,
        background: tierCfg.bg,
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      {/* Icon + label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 160 }}>
        <span aria-hidden="true" style={{ fontSize: 15, color: tierCfg.color }}>
          {score >= 70 ? '🔴' : score >= 40 ? '🟠' : '🟢'}
        </span>
        <div>
          <div
            style={{
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
              marginBottom: 2,
            }}
          >
            Proxy Mortalitas
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: tierCfg.color }}>{tierCfg.label}</div>
        </div>
      </div>

      {/* Score */}
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: 24,
            fontWeight: 600,
            fontFamily: 'var(--font-mono)',
            color: tierCfg.color,
            lineHeight: 1,
          }}
        >
          {score}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          /100
        </div>
      </div>

      {/* Urgency badge */}
      <div
        style={{
          borderRadius: 6,
          border: `1px solid ${urgencyCfg.color}60`,
          background: `${urgencyCfg.color}12`,
          padding: '6px 14px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
            marginBottom: 2,
          }}
        >
          Urgensi Klinis
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            fontFamily: 'var(--font-mono)',
            color: urgencyCfg.color,
          }}
        >
          {urgencyCfg.label}
        </div>
      </div>
    </div>
  )
}
