'use client'

import { useEffect, useState } from 'react'

/**
 * TCMA Architecture Diagram — hand-drawn / sketch aesthetic.
 * Minimal, monochrome, seperti coretan dokter di whiteboard.
 */

const LAYERS = [
  {
    id: 'cognitive',
    label: 'Lapisan Kognitif',
    note: 'Neuro-Symbolic Controller',
    items: ['Meta Kognisi', 'Reasoning', 'Knowledge Graph', 'Explainability'],
    system: 'System 2 — deliberatif',
  },
  {
    id: 'dynamic',
    label: 'Lapisan Dinamik',
    note: 'Neural Dynamics Engine',
    items: ['Spiking Networks', 'E/I Balance', 'Oscillation', 'Population'],
    system: 'signal propagation',
  },
  {
    id: 'structural',
    label: 'Lapisan Struktural',
    note: 'Atlas-Constrained Architecture',
    items: ['Brain Atlas', 'Connectome', 'Region Map', 'Synaptic Wiring'],
    system: 'System 1 — intuitif',
  },
]

const FLOW_LABELS = ['evidence → reasoning', 'top-down modulation', 'spike propagation']

export default function TCMADiagram() {
  const [flowIdx, setFlowIdx] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const t = setInterval(() => setFlowIdx(p => (p + 1) % FLOW_LABELS.length), 3200)
    return () => clearInterval(t)
  }, [])

  if (!mounted) return null

  return (
    <div
      style={{
        margin: '36px 0',
        padding: '28px 24px 24px',
        borderRadius: 2,
        border: '1px solid var(--line-base)',
        background: 'transparent',
        fontFamily: "'Georgia', 'Times New Roman', serif",
      }}
    >
      {/* Title — hand-written feel */}
      <div
        style={{
          fontSize: 11,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: 6,
          opacity: 0.6,
        }}
      >
        fig. 1
      </div>
      <div
        style={{
          fontSize: 16,
          color: 'var(--text-main)',
          fontStyle: 'italic',
          marginBottom: 24,
          opacity: 0.85,
        }}
      >
        Tiga Lapisan Kognisi Klinis &mdash; TCMA
      </div>

      {/* Layers */}
      {LAYERS.map((layer, idx) => (
        <div key={layer.id}>
          {/* Connection — simple dashed line */}
          {idx > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 32,
              }}
            >
              <div
                style={{
                  width: 1,
                  height: '100%',
                  borderLeft: '1px dashed var(--text-muted)',
                  opacity: 0.25,
                }}
              />
            </div>
          )}

          {/* Layer */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '28px 1fr',
              gap: 12,
              alignItems: 'start',
            }}
          >
            {/* Number */}
            <div
              style={{
                fontSize: 22,
                fontWeight: 400,
                color: 'var(--text-muted)',
                opacity: 0.35,
                textAlign: 'right',
                fontStyle: 'italic',
                lineHeight: 1.1,
                paddingTop: 2,
              }}
            >
              {idx + 1}
            </div>

            {/* Content */}
            <div>
              <div
                style={{
                  fontSize: 14,
                  color: 'var(--text-main)',
                  marginBottom: 2,
                  opacity: 0.9,
                }}
              >
                {layer.label}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  fontStyle: 'italic',
                  marginBottom: 8,
                  opacity: 0.6,
                }}
              >
                {layer.note} &mdash; {layer.system}
              </div>

              {/* Items — like handwritten notes */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 4,
                }}
              >
                {layer.items.map((item, i) => (
                  <span
                    key={item}
                    style={{ fontSize: 12, color: 'var(--text-muted)', opacity: 0.7 }}
                  >
                    {item}
                    {i < layer.items.length - 1 ? ' ·' : ''}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Flow annotation — rotating label */}
      <div
        style={{
          marginTop: 28,
          paddingTop: 16,
          borderTop: '1px solid var(--line-base)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            fontStyle: 'italic',
            opacity: 0.5,
          }}
        >
          signal aktif:
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-main)',
            fontStyle: 'italic',
            opacity: 0.65,
            transition: 'opacity 0.8s ease',
          }}
        >
          {FLOW_LABELS[flowIdx]} &rarr;
        </div>
      </div>

      {/* Signature */}
      <div
        style={{
          marginTop: 28,
          paddingTop: 16,
          borderTop: '1px solid var(--line-base)',
          textAlign: 'right',
        }}
      >
        <div
          style={{
            fontSize: 20,
            fontStyle: 'italic',
            color: 'var(--text-main)',
            opacity: 0.7,
            marginBottom: 4,
          }}
        >
          Ferdi Iskandar
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            opacity: 0.5,
            letterSpacing: '0.04em',
          }}
        >
          dr., SH, MKN, CLM, CMDC
        </div>
      </div>
    </div>
  )
}
