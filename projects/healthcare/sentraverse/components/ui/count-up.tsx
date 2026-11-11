// Architected and built by Drferdi.
'use client'

import { useInView, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

type CountUpProps = {
  /** Final numeric value the counter settles on. */
  value: number
  /** Fixed decimal places, rendered with a dot (e.g. 97.2). */
  decimals?: number
  /** Use id-ID thousands grouping (4100 -> "4.100"). Overrides decimals. */
  idLocale?: boolean
  prefix?: string
  suffix?: string
  /** Animation length in seconds. */
  duration?: number
  className?: string
}

function formatValue(value: number, decimals: number, idLocale: boolean): string {
  if (idLocale) return Math.round(value).toLocaleString('id-ID')
  return value.toFixed(decimals)
}

/**
 * Count-up that runs once on first viewport entry.
 * SSR/no-JS renders the final value; prefers-reduced-motion skips the count.
 */
export function CountUp({
  value,
  decimals = 0,
  idLocale = false,
  prefix = '',
  suffix = '',
  duration = 1.4,
  className,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -40px 0px' })
  const reduceMotion = useReducedMotion()
  const [display, setDisplay] = useState(() => formatValue(value, decimals, idLocale))
  const started = useRef(false)

  useEffect(() => {
    if (!inView || reduceMotion || started.current) return
    started.current = true

    let frame = 0
    const start = performance.now()
    const durationMs = duration * 1000

    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(formatValue(value * eased, decimals, idLocale))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [inView, reduceMotion, value, decimals, idLocale, duration])

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  )
}
