'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const NEON_COLORS = [
  '#00ff88', // neon green
  '#00ffff', // neon cyan
  '#ff6b6b', // neon red
  '#ff9f40', // neon orange
  '#ee82ee', // neon violet
  '#40e0d0', // neon turquoise
  '#ffff54', // neon yellow
  '#ff1493', // neon pink
]

const CODE_SNIPPETS = [
  '>>> Initializing Sentra Healthcare OS v2.4.1...',
  '>>> Loading patient database from remote cluster...',
  '>>> EMR sync: 847 records synchronized in 0.24s',
  '>>> AI diagnostic module loaded successfully',
  '>>> Connecting to BPJS bridge API... ESTABLISHED',
  '>>> Lab integration: 12 devices online',
  '>>> Pharmacy stock: 2,341 items in inventory',
  '>>> ICD-10 database: 18,543 codes indexed',
  '>>> SenAuto engine: Natural language processor ready',
  '>>> Real-time vitals monitoring activated',
  '>>> Telemedicine module: 3 active sessions',
  '>>> e-Puskesmas gateway: Connected [SECURE]',
  '>>> LB1 reporting engine: Ready for monthly export',
  '>>> Backup system: Last snapshot 2 hours ago',
  '>>> System health: All services operational ✓',
  '>>> Waiting for incoming patient data stream...',
  '>>> Auto-scribe: Dictation mode available',
  '>>> Drug interaction checker: Database v2024.3',
  '>>> Radiology PACS: 4 studies awaiting review',
  '>>> Queue management: 12 patients in waiting list',
]

interface LineData {
  id: number
  text: string
  color: string
  glow: boolean
  isTyping: boolean
  displayedText: string
}

export function TypewriterFX(): React.ReactElement {
  const [lines, setLines] = useState<LineData[]>([])
  const lineIdRef = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const addLine = useCallback(() => {
    const text = CODE_SNIPPETS[Math.floor(Math.random() * CODE_SNIPPETS.length)]
    const color = NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)]
    const newLine: LineData = {
      id: lineIdRef.current++,
      text,
      color,
      glow: true,
      isTyping: true,
      displayedText: '',
    }

    setLines(prev => {
      const updated = [...prev, newLine]
      // Max 33 lines, kalau lebih hapus baris ke-2 (index 1), simpan baris pertama & yang terbaru
      if (updated.length > 33) {
        updated.splice(1, 1) // Hapus baris ke-2 (index 1)
      }
      return updated
    })
  }, [])

  // Typing effect for the active line
  useEffect(() => {
    if (lines.length === 0) return

    const lastLine = lines[lines.length - 1]
    if (!lastLine.isTyping) return

    let index = 0
    const typeInterval = setInterval(() => {
      if (index <= lastLine.text.length) {
        setLines(prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last && last.isTyping) {
            last.displayedText = last.text.slice(0, index)
          }
          return updated
        })
        index++
      } else {
        // Typing complete
        setLines(prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last) {
            last.isTyping = false
          }
          return updated
        })
        clearInterval(typeInterval)
      }
    }, 25)

    return () => clearInterval(typeInterval)
  }, [lines.length, lines[lines.length - 1]?.isTyping])

  // Add new line every 2.5 seconds
  useEffect(() => {
    addLine() // Initial line
    const interval = setInterval(addLine, 2500)
    return () => clearInterval(interval)
  }, [addLine])

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [lines])

  return (
    <div
      ref={containerRef}
      className="typewriter-fx"
      style={{
        position: 'fixed',
        top: 80,
        right: 20,
        zIndex: 100,
        pointerEvents: 'none',
        fontSize: 13,
        textAlign: 'left',
        width: 360,
        maxHeight: 'calc(100vh - 120px)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: '12px 16px',
      }}
    >
      {/* Scanline effect */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 136, 0.03) 2px, rgba(0, 255, 136, 0.03) 4px)',
          pointerEvents: 'none',
        }}
      />

      {/* Header */}
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: 12,
          fontSize: 13,
          letterSpacing: '0.15em',
          color: '#00ff88',
          opacity: 0.6,
          textTransform: 'uppercase',
        }}
      >
        ● SYSTEM_LOG
      </div>

      {lines.map((line, index) => (
        <div
          key={line.id}
          style={{
            color: line.color,
            opacity: 0.3 + (index / lines.length) * 0.7,
            transform: `translateX(${(lines.length - 1 - index) * 2}px)`,
            transition: 'all 0.3s ease',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            textShadow: line.glow ? `0 0 10px ${line.color}40, 0 0 20px ${line.color}20` : 'none',
            position: 'relative',
          }}
        >
          <span style={{ opacity: 0.5, marginRight: 8 }}>[{String(line.id).padStart(4, '0')}]</span>
          {line.displayedText}
          {line.isTyping && <Cursor color={line.color} />}
        </div>
      ))}
    </div>
  )
}

function Cursor({ color }: { color: string }): React.ReactElement {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(v => !v)
    }, 400)
    return () => clearInterval(interval)
  }, [])

  return (
    <span
      style={{
        display: 'inline-block',
        width: 8,
        height: 14,
        background: color,
        marginLeft: 2,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.1s',
        boxShadow: `0 0 10px ${color}, 0 0 20px ${color}`,
        verticalAlign: 'middle',
      }}
    />
  )
}

export default TypewriterFX
