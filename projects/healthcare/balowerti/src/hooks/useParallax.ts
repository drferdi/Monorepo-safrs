// Architected and built by the one and only Drferdi.
// Chief's Parallax Hook

import { useEffect, useRef, useState } from 'react'

export const useParallax = (speed: number = 0.5) => {
  const [offset, setOffset] = useState(0)
  const elementRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let rafId: number

    const handleScroll = () => {
      if (rafId) return

      rafId = requestAnimationFrame(() => {
        const element = elementRef.current
        if (!element) {
          rafId = 0
          return
        }

        const rect = element.getBoundingClientRect()
        const windowHeight = window.innerHeight

        // Only calculate if element is in viewport
        if (rect.top < windowHeight && rect.bottom > 0) {
          const scrollProgress = (windowHeight - rect.top) / (windowHeight + rect.height)
          const newOffset = (scrollProgress - 0.5) * speed * 100
          setOffset(newOffset)
        }

        rafId = 0
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Initial calculation

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [speed])

  return { elementRef, offset }
}
