'use client'

import Link from 'next/link'
import type { ComponentProps } from 'react'
import { useDashboardMotion } from './MotionProvider'

export default function MotionLink({ onNavigate, ...props }: ComponentProps<typeof Link>) {
  const motion = useDashboardMotion()
  return <Link {...props} onNavigate={(event) => {
    let canceled = false
    onNavigate?.({ preventDefault: () => { canceled = true; event.preventDefault() } })
    if (canceled || !motion) return
    if (typeof props.href !== 'string' || props.replace || props.as) {
      motion.cancel()
      return
    }
    if (motion.navigate(props.href, props.scroll)) event.preventDefault()
  }} />
}
