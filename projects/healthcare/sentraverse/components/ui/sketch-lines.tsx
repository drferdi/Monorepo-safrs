// Architected and built by Drferdi.
'use client'

import { motion } from 'framer-motion'
import { useMemo } from 'react'

type SketchLine = {
  orientation: 'h' | 'v'
  offset: number
  start: number
  length: number
  delay: number
  duration: number
  repeatDelay: number
}

// PRNG deterministik (mulberry32) — posisi garis acak tapi identik antara SSR dan klien.
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeSketchLines(seed: number, count: number): SketchLine[] {
  const random = mulberry32(seed)
  const rand = (min: number, max: number) => min + random() * (max - min)
  return Array.from(
    { length: count },
    (_, i): SketchLine => ({
      orientation: i % 2 === 0 ? 'h' : 'v',
      offset: rand(8, 92),
      start: rand(0, 45),
      length: rand(20, 55),
      delay: rand(0, 5),
      duration: rand(2, 3.5),
      repeatDelay: rand(2.5, 7),
    })
  )
}

type SketchLinesProps = {
  seed?: number
  count?: number
  /** Kelas warna garis, mis. "bg-[#002147]/30" */
  colorClass?: string
  /** true: garis ter-draw sekali saat masuk viewport lalu menetap (tidak memudar). */
  persist?: boolean
}

/**
 * Garis konstruksi acak (vertikal + horizontal). Default: ter-draw lalu memudar,
 * looping dengan timing masing-masing. Dengan `persist`, garis ter-draw sekali
 * lalu stay. Layer dekoratif pointer-events-none.
 */
export function SketchLines({
  seed = 20260708,
  count = 8,
  colorClass = 'bg-[var(--sentra-audrey-corner-border)]',
  persist = false,
}: SketchLinesProps) {
  const lines = useMemo(() => makeSketchLines(seed, count), [seed, count])

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      {lines.map((line, index) => {
        const scaleKey = line.orientation === 'h' ? 'scaleX' : 'scaleY'
        return (
          <motion.div
            key={index}
            className={`absolute ${colorClass}`}
            style={
              line.orientation === 'h'
                ? {
                    top: `${line.offset}%`,
                    left: `${line.start}%`,
                    width: `${line.length}%`,
                    height: 1,
                    transformOrigin: 'left center',
                  }
                : {
                    left: `${line.offset}%`,
                    top: `${line.start}%`,
                    height: `${line.length}%`,
                    width: 1,
                    transformOrigin: 'center top',
                  }
            }
            {...(persist
              ? {
                  initial: { [scaleKey]: 0, opacity: 0 },
                  whileInView: { [scaleKey]: 1, opacity: 0.7 },
                  viewport: { once: true },
                  transition: {
                    delay: line.delay * 0.35,
                    duration: line.duration * 0.6,
                    ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
                  },
                }
              : {
                  animate: {
                    [scaleKey]: [0, 1, 1, 1],
                    opacity: [0, 0.7, 0.7, 0],
                  },
                  transition: {
                    delay: line.delay,
                    duration: line.duration,
                    times: [0, 0.35, 0.8, 1],
                    ease: 'easeInOut' as const,
                    repeat: Infinity,
                    repeatDelay: line.repeatDelay,
                  },
                })}
          />
        )
      })}
    </div>
  )
}
