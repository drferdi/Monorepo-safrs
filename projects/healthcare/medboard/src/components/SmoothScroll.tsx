'use client'

import Lenis from 'lenis'
import { useEffect } from 'react'

/**
 * Smooth page scroll with Lenis (Chief 2026-10-07). Lists, dialogs and other areas with their own
 * scroll keep scrolling natively; nothing changes for people who turned motion off.
 */
export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const lenis = new Lenis({ autoRaf: true, allowNestedScroll: true, anchors: true })
    return () => lenis.destroy()
  }, [])

  return null
}
