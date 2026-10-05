// Drferdi — AcuteAttackRiskRadar: SVG pentagon radar chart for 5 acute risk scores
'use client'

import type { AcuteAttackRisk24h } from '@/types/abyss/trajectory'
import { ACUTE_RISK_LABELS } from '@/types/abyss/trajectory'

// ── Geometry ──────────────────────────────────────────────────────────────────

const CX = 115
const CY = 105
const R = 72

/** 5 axes, evenly spaced 72° apart, starting from top */
const AXIS_ANGLES = [-90, -18, 54, 126, 198]

const RISK_KEYS: (keyof AcuteAttackRisk24h)[] = [
  'hypertensive_crisis_risk',
  'glycemic_crisis_risk',
  'sepsis_like_deterioration_risk',
  'shock_decompensation_risk',
  'stroke_acs_suspicion_risk',
]

function polarToXY(angleDeg: number, radius: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180
  return {
    x: CX + radius * Math.cos(rad),
    y: CY + radius * Math.sin(rad),
  }
}

function pointsString(pts: { x: number; y: number }[]): string {
  return pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
}

// ── Color ─────────────────────────────────────────────────────────────────────

function riskFillColor(maxScore: number): string {
  if (maxScore >= 80) return 'color-mix(in srgb, var(--c-critical) 22%, transparent)'
  if (maxScore >= 60) return 'color-mix(in srgb, var(--c-critical) 18%, transparent)'
  if (maxScore >= 30) return 'color-mix(in srgb, var(--c-asesmen) 15%, transparent)'
  return 'color-mix(in srgb, var(--c-ok) 15%, transparent)'
}

function riskStrokeColor(maxScore: number): string {
  if (maxScore >= 80) return 'var(--c-critical)'
  if (maxScore >= 60) return 'var(--c-critical)'
  if (maxScore >= 30) return 'var(--c-asesmen)'
  return 'var(--c-ok)'
}

// ── Label anchor ──────────────────────────────────────────────────────────────

function textAnchor(angleDeg: number): 'start' | 'middle' | 'end' {
  const a = ((angleDeg % 360) + 360) % 360
  if (a > 315 || a < 45) return 'middle'   // top
  if (a >= 45 && a < 135) return 'start'   // right side
  if (a >= 135 && a < 225) return 'middle' // bottom
  return 'end'                              // left side
}

// ── Component ─────────────────────────────────────────────────────────────────

interface AcuteAttackRiskRadarProps {
  risks: AcuteAttackRisk24h
}

export function AcuteAttackRiskRadar({ risks }: AcuteAttackRiskRadarProps) {
  const scores = RISK_KEYS.map((k) => Math.min(100, Math.max(0, risks[k])))
  const maxScore = Math.max(...scores)

  // Data polygon points
  const dataPts = scores.map((score, i) =>
    polarToXY(AXIS_ANGLES[i], (score / 100) * R),
  )

  // Grid ring polygons at 25 / 50 / 75 / 100
  const gridRings = [0.25, 0.5, 0.75, 1].map((frac) =>
    AXIS_ANGLES.map((a) => polarToXY(a, R * frac)),
  )

  // Axis endpoints
  const axisEnds = AXIS_ANGLES.map((a) => polarToXY(a, R))

  // Label positions (outside the chart)
  const labelPts = AXIS_ANGLES.map((a) => polarToXY(a, R + 18))

  const fillColor = riskFillColor(maxScore)
  const strokeColor = riskStrokeColor(maxScore)

  return (
    <div
      style={{
        borderRadius: 8,
        border: '1px solid var(--line-base)',
        background: 'var(--bg-card)',
        padding: '14px 16px',
      }}
      aria-label="Radar risiko serangan akut 24 jam"
    >
      <div
        style={{
          fontSize: 12,
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: 10,
        }}
      >
        Risiko Serangan Akut 24J — Radar
      </div>

      <svg
        width="100%"
        viewBox="0 0 230 218"
        style={{ display: 'block', maxWidth: 320, margin: '0 auto' }}
        role="img"
        aria-label="Pentagon radar chart 5 risiko akut"
      >
        {/* Grid rings */}
        {gridRings.map((ring, ri) => (
          <polygon
            key={ri}
            points={pointsString(ring)}
            fill="none"
            stroke="var(--line-base)"
            strokeWidth={0.8}
            opacity={0.5}
          />
        ))}

        {/* Axis lines */}
        {axisEnds.map((end, i) => (
          <line
            key={i}
            x1={CX} y1={CY}
            x2={end.x.toFixed(2)} y2={end.y.toFixed(2)}
            stroke="var(--line-base)"
            strokeWidth={0.8}
            opacity={0.4}
          />
        ))}

        {/* Data polygon */}
        <polygon
          points={pointsString(dataPts)}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={1.5}
          strokeLinejoin="round"
          opacity={0.9}
        />

        {/* Data point dots */}
        {dataPts.map((pt, i) => (
          <circle
            key={i}
            cx={pt.x.toFixed(2)}
            cy={pt.y.toFixed(2)}
            r={3}
            fill={strokeColor}
          >
            <title>{ACUTE_RISK_LABELS[RISK_KEYS[i]] ?? RISK_KEYS[i]}: {Math.round(scores[i])}</title>
          </circle>
        ))}

        {/* Labels */}
        {labelPts.map((lp, i) => (
          <text
            key={i}
            x={lp.x.toFixed(2)}
            y={lp.y.toFixed(2)}
            textAnchor={textAnchor(AXIS_ANGLES[i])}
            dominantBaseline="middle"
            fontSize={12}
            fill="var(--text-muted)"
            fontFamily="var(--font-sans)"
          >
            {ACUTE_RISK_LABELS[RISK_KEYS[i]] ?? RISK_KEYS[i]}
          </text>
        ))}

        {/* Center score */}
        <text
          x={CX} y={CY}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={12}
          fontWeight={700}
          fill={strokeColor}
          fontFamily="var(--font-mono)"
        >
          {Math.round(maxScore)}
        </text>
      </svg>
    </div>
  )
}
