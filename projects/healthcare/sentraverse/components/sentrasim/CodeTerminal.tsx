'use client'

import { Fragment, useEffect, useRef, useState } from 'react'

import type { SimulationState } from '@/components/sentrasim/types'
import { getTerminalDelay, sleep } from '@/components/showcase/thinking-stack-config'

// Highlighter lokal — versi thinking-stack-config bergantung kelas CSS yang
// di-scope ke #expertise (Showcase), jadi tidak berwarna di luar section itu.
const TOKEN_PATTERN =
  /\b(import|from|export|function|const|return|async|await)\b|\b(assertSafe)\b|\b(runGateRegistry|assessTTV|resolveTriageVerdict|matchClinicalPatterns|buildActionProtocol)\b|\b(PatientInput|ActionProtocol|Promise)\b|('[^']*')/g

const TOKEN_COLOR = {
  keyword: '#c792ea',
  guard: '#ffcb6b',
  fn: '#82aaff',
  type: '#f78c6c',
  string: '#c3e88d',
} as const

function HighlightedCode({ text }: { text: string }) {
  const tokens: React.ReactNode[] = []
  let cursor = 0
  let key = 0

  for (const match of text.matchAll(TOKEN_PATTERN)) {
    if (match.index > cursor) tokens.push(text.slice(cursor, match.index))
    const [value, keyword, guard, fn, type, stringValue] = match
    const color = keyword
      ? TOKEN_COLOR.keyword
      : guard
        ? TOKEN_COLOR.guard
        : fn
          ? TOKEN_COLOR.fn
          : type
            ? TOKEN_COLOR.type
            : stringValue
              ? TOKEN_COLOR.string
              : undefined
    tokens.push(
      <span key={key++} style={{ color, fontWeight: guard ? 600 : undefined }}>
        {value}
      </span>
    )
    cursor = match.index + value.length
  }
  if (cursor < text.length) tokens.push(text.slice(cursor))

  return <Fragment>{tokens}</Fragment>
}

type Gate = 'start' | 'showVitalsAnomaly' | 'trajectoryOpen' | 'showDiagnosis' | 'showManagement'

type CodeChunk = {
  gate: Gate
  lines: string[]
}

/**
 * Kode nyata mengikuti nama modul asli di lib/emergency-detector dan
 * lib/iskandar-diagnosis-engine (lihat ENGINE REGISTRY di BlueprintStory).
 * "aman" secara literal: setiap tahap punya guard assertSafe sebelum lanjut.
 */
const CODE_CHUNKS: CodeChunk[] = [
  {
    gate: 'start',
    lines: [
      "import { runGateRegistry } from './emergency-detector/gate-registry';",
      "import { assessTTV } from './emergency-detector/ttv-inference';",
      "import { resolveTriageVerdict } from './emergency-detector/triage-verdict';",
      "import { matchClinicalPatterns } from './iskandar-diagnosis-engine/pattern-engine';",
      "import { buildActionProtocol } from './iskandar-diagnosis-engine/action-protocols';",
      '',
      'export async function reason(patient: PatientInput): Promise<ActionProtocol> {',
      '  const gates = runGateRegistry(patient.vitals);',
      "  assertSafe(gates.redFlags, 'guard: red-flag check');",
    ],
  },
  {
    gate: 'showVitalsAnomaly',
    lines: ['', '  const ttv = assessTTV(patient.vitals);'],
  },
  {
    gate: 'trajectoryOpen',
    lines: ['', '  const verdict = resolveTriageVerdict(ttv, gates);'],
  },
  {
    gate: 'showDiagnosis',
    lines: ['', '  const patterns = matchClinicalPatterns(patient.symptoms);'],
  },
  {
    gate: 'showManagement',
    lines: [
      '',
      '  const protocol = buildActionProtocol(verdict, patterns);',
      '  assertSafe(protocol.requiresPhysicianReview === true);',
      '',
      '  return protocol;',
      '}',
    ],
  },
]

type Line = { id: number; text: string; complete: boolean }

type CodeTerminalProps = {
  simulation: SimulationState
}

export function CodeTerminal({ simulation }: CodeTerminalProps) {
  const [lines, setLines] = useState<Line[]>([])
  const typedGatesRef = useRef<Set<Gate>>(new Set())
  const idRef = useRef(0)
  const cancelledRef = useRef(false)
  const queueRef = useRef(Promise.resolve())

  useEffect(() => {
    cancelledRef.current = false
    return () => {
      cancelledRef.current = true
    }
  }, [])

  useEffect(() => {
    const active: Gate[] = ['start']
    if (simulation.showVitalsAnomaly) active.push('showVitalsAnomaly')
    if (simulation.trajectoryOpen) active.push('trajectoryOpen')
    if (simulation.showDiagnosis) active.push('showDiagnosis')
    if (simulation.showManagement) active.push('showManagement')

    if (!simulation.isRunning) return

    const pending = CODE_CHUNKS.filter(
      (chunk) => active.includes(chunk.gate) && !typedGatesRef.current.has(chunk.gate)
    )
    if (pending.length === 0) return

    queueRef.current = queueRef.current.then(async () => {
      for (const chunk of pending) {
        if (cancelledRef.current) return
        typedGatesRef.current.add(chunk.gate)
        for (const rawLine of chunk.lines) {
          if (cancelledRef.current) return
          await typeLine(rawLine, setLines, idRef, cancelledRef)
        }
      }
    })
  }, [
    simulation.isRunning,
    simulation.showVitalsAnomaly,
    simulation.trajectoryOpen,
    simulation.showDiagnosis,
    simulation.showManagement,
  ])

  const showSafeBanner = simulation.isComplete

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 480,
        maxHeight: 480,
        border: '1px solid #3a3a3a',
        borderRadius: 8,
        background: '#1e1e1e',
        overflow: 'hidden',
        boxShadow: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '8px 12px',
          background: '#232323',
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5f57' }} />
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#febc2e' }} />
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#28c840' }} />
        <span
          style={{
            marginLeft: 6,
            fontFamily: 'ui-monospace, monospace',
            fontSize: 10,
            color: '#888',
            letterSpacing: '0.04em',
          }}
        >
          clinical-reasoning.ts
        </span>
      </div>

      {/* Aksen double-rule ala kartu Sentra: garis accent + garis tipis di bawahnya */}
      <div style={{ height: 2, background: 'var(--sentra-accent, #eb5939)' }} />
      <div style={{ height: 1, background: '#3a3a3a' }} />

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '10px 0',
          fontFamily: 'ui-monospace, monospace',
          fontSize: 12,
          lineHeight: 1.7,
          color: '#e4e4e4',
        }}
      >
        {lines.length === 0 ? (
          <div style={{ padding: '2px 14px', color: '#666', fontStyle: 'italic' }}>
            Menunggu simulasi dijalankan...
          </div>
        ) : (
          lines.map((line, index) => (
            <div key={line.id} style={{ display: 'flex' }}>
              <span
                style={{
                  flexShrink: 0,
                  width: 28,
                  textAlign: 'right',
                  paddingRight: 10,
                  marginRight: 8,
                  color: '#565656',
                  userSelect: 'none',
                  borderRight: '1px solid #2c2c2c',
                }}
              >
                {index + 1}
              </span>
              <span style={{ whiteSpace: 'pre-wrap' }}>
                <HighlightedCode text={line.text} />
                {!line.complete ? <Cursor /> : null}
              </span>
            </div>
          ))
        )}
        {showSafeBanner && (
          <div style={{ display: 'flex' }}>
            <span style={{ flexShrink: 0, width: 28, marginRight: 8 }} />
            <span style={{ color: '#4ade80' }}>
              {'// ✓ SAFE — physician review required before action'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function Cursor() {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 7,
        height: 14,
        marginLeft: 2,
        background: '#e4e4e4',
        verticalAlign: 'text-bottom',
        animation: 'sdxSmoothBlink 1s steps(1) infinite',
      }}
    />
  )
}

async function typeLine(
  targetText: string,
  setLines: React.Dispatch<React.SetStateAction<Line[]>>,
  idRef: React.MutableRefObject<number>,
  cancelledRef: React.RefObject<boolean>
) {
  const id = idRef.current++
  setLines((current) => [...current, { id, text: '', complete: false }])

  const setCurrentText = (text: string) => {
    if (cancelledRef.current) return
    setLines((current) => current.map((item) => (item.id === id ? { ...item, text } : item)))
  }

  for (let i = 0; i < targetText.length; i += 1) {
    if (cancelledRef.current) return
    setCurrentText(targetText.slice(0, i + 1))
    await sleep(getTerminalDelay(targetText[i] ?? '', i, 16))
  }

  if (cancelledRef.current) return
  setLines((current) =>
    current.map((item) => (item.id === id ? { ...item, complete: true } : item))
  )
}
