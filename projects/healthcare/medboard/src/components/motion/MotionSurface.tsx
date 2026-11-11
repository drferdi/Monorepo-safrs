'use client'

import { motion, useMotionValue, useSpring } from 'motion/react'
import { useEffect, type ReactNode, type PointerEvent } from 'react'
import { useReducedMotion } from '../shell/use-reduced-motion'
import { useDashboardMotion } from './MotionProvider'
import { motionPresets } from './motion-presets'

interface Props {
  children: ReactNode
  className?: string
  layoutId?: string
  layout?: boolean
}

export default function MotionSurface({ children, className = '', layoutId, layout = true }: Props) {
  const systemReduced = useReducedMotion()
  const context = useDashboardMotion()
  const reduced = systemReduced || Boolean(context?.reducedMotion)
  const tuning = context?.tuning ?? motionPresets.cinematic
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useSpring(x, { stiffness: tuning.stiffness, damping: tuning.damping })
  const rotateY = useSpring(y, { stiffness: tuning.stiffness, damping: tuning.damping })
  const reset = () => { x.set(0); y.set(0) }

  useEffect(() => {
    x.jump(0); y.jump(0)
    rotateX.jump(0); rotateY.jump(0)
  }, [reduced, tuning.tiltDegrees, x, y, rotateX, rotateY])

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (reduced || event.pointerType !== 'mouse' || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    if (event.currentTarget.contains(document.activeElement) || (event.target instanceof Element && event.target.closest('input,textarea,select,button,a,[contenteditable]'))) return reset()
    const rect = event.currentTarget.getBoundingClientRect()
    const px = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
    const py = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height))
    x.set((.5 - py) * tuning.tiltDegrees * 2)
    y.set((px - .5) * tuning.tiltDegrees * 2)
    event.currentTarget.style.setProperty('--motion-light-x', `${px * 100}%`)
    event.currentTarget.style.setProperty('--motion-light-y', `${py * 100}%`)
  }

  return (
    <motion.div
      className={`motion-surface ${className}`}
      layout={layout && !reduced}
      layoutId={layoutId}
      data-reduced-motion={reduced || undefined}
      data-motion-preset={context?.preset ?? 'cinematic'}
      style={{ rotateX, rotateY, transformPerspective: 1200 }}
      transition={{ layout: { duration: reduced ? 0 : tuning.layoutMs / 1000, ease: tuning.layoutEase } }}
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
      onFocusCapture={reset}
    >
      {children}
    </motion.div>
  )
}
