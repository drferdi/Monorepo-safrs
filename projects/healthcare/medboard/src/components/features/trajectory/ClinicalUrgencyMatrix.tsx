// Drferdi — ClinicalUrgencyMatrix: 2-axis positioning matrix (mortality tier × momentum level)
'use client'

import type { MomentumLevel } from '@/lib/clinical/momentum-engine'
import type { MortalityProxyRisk } from '@/types/abyss/trajectory'
import { MOMENTUM_LEVEL_CONFIG, MORTALITY_TIER_CONFIG } from '@/types/abyss/trajectory'

// ── Axis definitions ──────────────────────────────────────────────────────────

type MortalityTier = MortalityProxyRisk['mortality_proxy_tier']

/** X axis: mortality tier, left → right = low → very_high */
const X_TIERS: MortalityTier[] = ['low', 'moderate', 'high', 'very_high']

/** Y axis: momentum level, bottom → top = stable → critical */
const Y_LEVELS: MomentumLevel[] = ['STABLE', 'DRIFTING', 'ACCELERATING', 'CONVERGING', 'CRITICAL_MOMENTUM']

// ── Quadrant label helpers ────────────────────────────────────────────────────

/** Combined danger index 0–8 (xi + yi combined) */
function dangerIndex(xi: number, yi: number): number {
  return xi + yi
}

function cellBg(xi: number, yi: number, isActive: boolean): string {
  if (isActive) return 'transparent'
  const idx = dangerIndex(xi, yi)
  if (idx >= 7) return 'color-mix(in srgb, var(--c-critical) 10%, transparent)'
  if (idx >= 5) return 'color-mix(in srgb, var(--c-asesmen) 8%, transparent)'
  if (idx >= 3) return 'color-mix(in srgb, var(--c-warning) 6%, transparent)'
  return 'color-mix(in srgb, var(--c-ok) 5%, transparent)'
}

function cellBorder(xi: number, yi: number, isActive: boolean): string {
  if (isActive) return '1px solid var(--line-base)'
  const idx = dangerIndex(xi, yi)
  if (idx >= 7) return '1px solid color-mix(in srgb, var(--c-critical) 18%, transparent)'
  if (idx >= 5) return '1px solid color-mix(in srgb, var(--c-asesmen) 14%, transparent)'
  if (idx >= 3) return '1px solid color-mix(in srgb, var(--c-warning) 12%, transparent)'
  return '1px solid color-mix(in srgb, var(--c-ok) 10%, transparent)'
}

// ── Quadrant labels (4 corners) ───────────────────────────────────────────────

const CORNER_LABELS: Partial<Record<string, string>> = {
  '0-0': 'Stabil',
  '3-0': 'Monitor',
  '0-4': 'Eskalasi',
  '3-4': 'Darurat',
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ClinicalUrgencyMatrixProps {
  momentumLevel: MomentumLevel
  mortalityTier: MortalityTier
}

export function ClinicalUrgencyMatrix({ momentumLevel, mortalityTier }: ClinicalUrgencyMatrixProps) {
  const activeXi = X_TIERS.indexOf(mortalityTier)
  const activeYi = Y_LEVELS.indexOf(momentumLevel)

  const mCfg = MOMENTUM_LEVEL_CONFIG[momentumLevel]
  const tCfg = MORTALITY_TIER_CONFIG[mortalityTier]

  return (
    <div
      style={{
        borderRadius: 8,
        border: '1px solid var(--line-base)',
        background: 'var(--bg-card)',
        padding: '14px 16px',
      }}
      aria-label="Matriks urgensi klinis"
    >
      {/* Header */}
      <div
        style={{
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
          marginBottom: 12,
        }}
      >
        Matriks Urgensi Klinis
      </div>

      {/* X axis label */}
      <div
        style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          textAlign: 'center',
          marginBottom: 4,
          fontFamily: 'var(--font-mono)',
        }}
      >
        Tier Mortalitas →
      </div>

      {/* X axis headers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '52px repeat(4, 1fr)',
          gap: 3,
          marginBottom: 3,
        }}
      >
        <div />
        {X_TIERS.map((tier) => (
          <div
            key={tier}
            style={{
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              color: MORTALITY_TIER_CONFIG[tier].color,
              textAlign: 'center',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {tier === 'very_high' ? 'V.Tinggi' : MORTALITY_TIER_CONFIG[tier].label.replace('Risiko ', '')}
          </div>
        ))}
      </div>

      {/* Grid rows (Y reversed: top = highest severity) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {[...Y_LEVELS].reverse().map((level, reversedYi) => {
          const yi = Y_LEVELS.length - 1 - reversedYi
          const lCfg = MOMENTUM_LEVEL_CONFIG[level]

          return (
            <div
              key={level}
              style={{
                display: 'grid',
                gridTemplateColumns: '52px repeat(4, 1fr)',
                gap: 3,
                alignItems: 'center',
              }}
            >
              {/* Y label */}
              <div
                style={{
                  fontSize: 11,
                  color: lCfg.color,
                  fontFamily: 'var(--font-mono)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  textAlign: 'right',
                  paddingRight: 4,
                }}
              >
                {lCfg.label}
              </div>

              {/* Cells */}
              {X_TIERS.map((tier, xi) => {
                const isActive = xi === activeXi && yi === activeYi
                const cornerKey = `${xi}-${yi}`
                const cornerLabel = CORNER_LABELS[cornerKey]

                return (
                  <div
                    key={tier}
                    style={{
                      height: 28,
                      borderRadius: 4,
                      background: cellBg(xi, yi, isActive),
                      border: cellBorder(xi, yi, isActive),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                    aria-label={isActive ? `Posisi pasien: ${lCfg.label}, ${MORTALITY_TIER_CONFIG[tier].label}` : undefined}
                  >
                    {/* Corner labels */}
                    {cornerLabel && !isActive && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', opacity: 0.5, fontFamily: 'var(--font-mono)' }}>
                        {cornerLabel}
                      </span>
                    )}

                    {/* Active patient marker */}
                    {isActive && (
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: mCfg.color,
                          boxShadow: `0 0 0 3px ${mCfg.color}40`,
                          animation: 'pulse 1.5s ease-in-out infinite',
                        }}
                        aria-hidden="true"
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div
        style={{
          marginTop: 10,
          paddingTop: 8,
          borderTop: '1px solid var(--line-base)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: mCfg.color,
              boxShadow: `0 0 0 2px ${mCfg.color}40`,
            }}
          />
          <span style={{ fontSize: 11, color: mCfg.color, fontFamily: 'var(--font-mono)' }}>
            {mCfg.label}
          </span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>·</span>
        <span style={{ fontSize: 11, color: tCfg.color, fontFamily: 'var(--font-mono)' }}>
          {tCfg.label}
        </span>
      </div>
    </div>
  )
}
