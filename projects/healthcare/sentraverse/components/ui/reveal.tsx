// Architected and built by Drferdi.
'use client'

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1]

type RevealProps = {
  children: ReactNode
  /** Extra delay in seconds — use for stagger between sibling reveals. */
  delay?: number
  /** Initial vertical offset in px before the element settles into place. */
  y?: number
  className?: string
}

/**
 * Shared scroll-into-view reveal (fade + slide-up, runs once).
 * Animates transform/opacity only — never layout-affecting properties.
 * prefers-reduced-motion is honored app-wide via MotionProvider
 * (MotionConfig reducedMotion="user"), which keeps SSR markup identical.
 */
export function Reveal({ children, delay = 0, y = 24, className }: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -80px 0px' }}
      transition={{ duration: 0.6, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  )
}
