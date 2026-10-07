'use client'

// Ported from apps/corporate/ferdiiskandar-main/components/SmoothScrollProvider.tsx
import { useSmoothScroll } from '@/lib/use-smooth-scroll'
import { usePathname } from 'next/navigation'

export default function SmoothScrollProvider() {
  const pathname = usePathname()
  return pathname === '/' ? null : <LegacySmoothScroll />
}

function LegacySmoothScroll() {
  useSmoothScroll()
  return null
}
