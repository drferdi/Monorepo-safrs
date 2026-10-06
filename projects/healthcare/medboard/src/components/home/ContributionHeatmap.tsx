'use client'

import { useInView } from 'motion/react'
import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react'

import type { ActivityDay } from '@/lib/report/clinical-activity'

import styles from './ContributionHeatmap.module.css'

// After lab.xevrion.dev/lab/contribution-heatmap: GitHub's proportions, one hue at rising
// strength, a single tab stop with arrow keys inside, and a tooltip moved by ref so sweeping
// across the year never re-renders the cells.

const CELL = 10
const PITCH = 13
// Per column, so the whole year sweeps in under half a second.
const STAGGER_MS = 8
const LEVELS = [styles.level0, styles.level1, styles.level2, styles.level3, styles.level4]
// Lower bounds for levels 1 to 4, in clinical reports per day.
const THRESHOLDS = [1, 5, 10, 20]
const DAY_LABELS = ['', 'Sen', '', 'Rab', '', 'Jum', '']

// Dates are WIB day keys, read at UTC midnight so the formatters never shift them.
const shortDate = new Intl.DateTimeFormat('id-ID', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const longDate = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})
const monthName = new Intl.DateTimeFormat('id-ID', { month: 'short', timeZone: 'UTC' })
const number = new Intl.NumberFormat('id-ID')

function phrase(count: number) {
  return count === 0 ? 'Belum ada laporan klinis' : `${number.format(count)} laporan klinis`
}

function levelOf(count: number) {
  let level = 0
  for (const t of THRESHOLDS) if (count >= t) level++
  return level
}

export function ContributionHeatmap({ data }: { data: ActivityDay[] }) {
  const weeks = Math.ceil(data.length / 7)
  const wrapRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const tipText = useRef<HTMLSpanElement>(null)
  const inView = useInView(gridRef, { once: true, amount: 0.4 })
  // Roving tabindex: the grid is one tab stop, arrows move within it.
  const [focusIndex, setFocusIndex] = useState(data.length - 1)

  const cells = useMemo(
    () =>
      data.map((d) => {
        const date = new Date(`${d.date}T00:00:00Z`)
        return {
          level: levelOf(d.count),
          tip: `${phrase(d.count)} pada ${shortDate.format(date)}`,
          label: `${phrase(d.count)} pada ${longDate.format(date)}`,
          date,
        }
      }),
    [data]
  )

  // A month is labelled at the column holding its 1st; labels closer than 3 columns collide.
  const months = useMemo(() => {
    const out: { col: number; name: string }[] = []
    cells.forEach((cell, i) => {
      if (cell.date.getUTCDate() !== 1) return
      const col = Math.floor(i / 7)
      if (out.length && col - out[out.length - 1].col < 3) out.pop()
      out.push({ col, name: monthName.format(cell.date) })
    })
    return out
  }, [cells])

  // Open on the most recent weeks, the part people look at, and stay there when the column
  // narrows after the page around it settles.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const toRecent = () => {
      el.scrollLeft = el.scrollWidth
    }
    toRecent()
    const observer = new ResizeObserver(toRecent)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const show = (el: HTMLElement) => {
    const wrap = wrapRef.current
    const tip = tipRef.current
    const text = tipText.current
    const cell = cells[Number(el.dataset.i)]
    if (!wrap || !tip || !text || !cell) return
    text.textContent = cell.tip
    const box = wrap.getBoundingClientRect()
    const rect = el.getBoundingClientRect()
    const scale = wrap.offsetWidth / box.width || 1
    const width = tip.offsetWidth
    const centre = (rect.left - box.left + rect.width / 2) * scale
    // Clamped inside the chart so it never widens the page at the edges.
    const x = Math.min(Math.max(centre - width / 2, 0), wrap.offsetWidth - width)
    const y = (rect.top - box.top) * scale - tip.offsetHeight - 6
    tip.style.transform = `translate(${x}px, ${y}px)`
    tip.dataset.show = 'true'
  }
  const hide = () => {
    if (tipRef.current) tipRef.current.dataset.show = 'false'
  }

  const cellFrom = (target: EventTarget) => (target instanceof Element ? target.closest<HTMLElement>('[data-i]') : null)

  const move = (next: number) => {
    const i = Math.min(Math.max(next, 0), data.length - 1)
    setFocusIndex(i)
    gridRef.current?.querySelector<HTMLElement>(`[data-i="${i}"]`)?.focus()
  }

  return (
    <div ref={wrapRef} className={styles.wrap}>
      {/* Stays put while the weeks scroll, so rows keep their names. */}
      <div aria-hidden className={styles.days}>
        {DAY_LABELS.map((day, i) => (
          <span key={i} style={{ height: PITCH, lineHeight: `${CELL}px` }}>
            {day}
          </span>
        ))}
      </div>

      <div ref={scrollRef} className={styles.scroll} onScroll={hide}>
        <div style={{ width: weeks * PITCH - (PITCH - CELL) }}>
          <div aria-hidden className={styles.months}>
            {months.map((m) => (
              <span key={m.col} className={styles.month} style={{ left: m.col * PITCH }}>
                {m.name}
              </span>
            ))}
          </div>

          <div
            ref={gridRef}
            role="grid"
            aria-label={`Laporan klinis selama ${weeks} minggu terakhir`}
            aria-readonly
            data-shown={inView}
            className={styles.grid}
            style={{ gap: PITCH - CELL }}
            onPointerOver={(e) => {
              if (e.pointerType === 'touch') return
              const el = cellFrom(e.target)
              if (el) show(el)
            }}
            onPointerDown={(e) => {
              if (e.pointerType !== 'touch') return
              const el = cellFrom(e.target)
              if (el) show(el)
            }}
            onPointerLeave={(e) => {
              if (e.pointerType !== 'touch') hide()
            }}
            onFocus={(e) => {
              const el = cellFrom(e.target)
              if (!el) return
              setFocusIndex(Number(el.dataset.i))
              show(el)
            }}
            onBlur={(e) => {
              const next = e.relatedTarget
              if (!(next instanceof Node && gridRef.current?.contains(next))) hide()
            }}
            onKeyDown={(e) => {
              const el = cellFrom(e.target)
              if (!el) return
              if (e.key === 'Escape') return hide()
              const i = Number(el.dataset.i)
              const day = i % 7
              const moves: Record<string, number> = {
                ArrowUp: day > 0 ? i - 1 : i,
                ArrowDown: day < 6 ? i + 1 : i,
                ArrowLeft: i - 7,
                ArrowRight: i + 7,
                Home: day,
                End: (weeks - 1) * 7 + day,
              }
              if (!(e.key in moves)) return
              e.preventDefault()
              move(moves[e.key])
            }}
          >
            {Array.from({ length: 7 }, (_, day) => (
              <div key={day} role="row" className={styles.row} style={{ gap: PITCH - CELL }}>
                {Array.from({ length: weeks }, (_, week) => {
                  const i = week * 7 + day
                  const cell = cells[i]
                  if (!cell) return <div key={week} role="presentation" style={{ width: CELL }} />
                  return (
                    <Cell
                      key={week}
                      index={i}
                      column={week}
                      level={cell.level}
                      label={cell.label}
                      focusable={i === focusIndex}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Appears in 100 ms and leaves in 75 ms, so it never lingers. */}
      <div ref={tipRef} aria-hidden data-show="false" className={styles.tip}>
        <span ref={tipText} className={styles.tipText} />
      </div>
    </div>
  )
}

// Memoised so moving focus re-renders only the two cells whose tabindex changed.
const Cell = memo(function Cell({
  index,
  column,
  level,
  label,
  focusable,
}: {
  index: number
  column: number
  level: number
  label: string
  focusable: boolean
}) {
  return (
    <div
      role="gridcell"
      data-i={index}
      tabIndex={focusable ? 0 : -1}
      aria-label={label}
      className={`${styles.cell} ${LEVELS[level]}`}
      style={{ width: CELL, height: CELL, transitionDelay: `${column * STAGGER_MS}ms` }}
    />
  )
})

export function HeatmapLegend() {
  return (
    // Hidden from screen readers: every cell already names its own count.
    <div aria-hidden className={styles.legend}>
      <span className={styles.legendEdge}>Sedikit</span>
      {LEVELS.map((l) => (
        <span key={l} className={`${styles.legendCell} ${l}`} style={{ width: CELL, height: CELL }} />
      ))}
      <span className={styles.legendEdge}>Banyak</span>
    </div>
  )
}
