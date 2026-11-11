// Architected and built by Drferdi.
'use client'

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useEffect } from 'react'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

/**
 * Menjaga semua ScrollTrigger tetap akurat: layout homepage bergeser setelah
 * mount (gambar, font, konten dinamis), sehingga posisi pin yang diukur di
 * awal jadi basi — section pinned tampak "tumpang tindih" dengan tetangganya.
 * Komponen ini me-refresh ScrollTrigger saat window load dan setiap tinggi
 * body berubah berarti (debounced), dengan guard agar refresh yang mengubah
 * tinggi spacer tidak memicu loop.
 */
export function ScrollTriggerSync() {
  useEffect(() => {
    let debounce: ReturnType<typeof setTimeout> | undefined
    let lastHeight = document.body.offsetHeight

    const refresh = () => {
      ScrollTrigger.refresh()
      lastHeight = document.body.offsetHeight
    }

    const observer = new ResizeObserver(() => {
      const height = document.body.offsetHeight
      if (Math.abs(height - lastHeight) < 4) return
      clearTimeout(debounce)
      debounce = setTimeout(refresh, 300)
    })
    observer.observe(document.body)

    window.addEventListener('load', refresh)

    return () => {
      observer.disconnect()
      clearTimeout(debounce)
      window.removeEventListener('load', refresh)
    }
  }, [])

  return null
}
