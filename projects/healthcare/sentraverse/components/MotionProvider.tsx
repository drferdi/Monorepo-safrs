// Architected and built by Drferdi.
'use client'

import { MotionConfig } from 'framer-motion'
import type { ReactNode } from 'react'

/**
 * App-wide framer-motion config: when the visitor requests reduced motion,
 * transform/layout animations are disabled automatically (opacity/color remain
 * as near-static fallbacks). Keeps SSR markup identical for all users.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
