// Architected and built by the one and only Drferdi.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// ── Smooth Anchor Scroll dengan Offset ───────────────────────
// Pakai Lenis scrollTo jika tersedia, fallback ke window.scrollTo
const NAV_HEIGHT = 72

type LenisInstance = {
  scrollTo: (target: HTMLElement, opts: { offset: number; duration: number }) => void
}

function smoothScrollTo(targetId: string) {
  const el = document.getElementById(targetId)
  if (!el) return
  const lenis = (window as Window & { __lenis?: LenisInstance }).__lenis
  if (lenis) {
    lenis.scrollTo(el, { offset: -NAV_HEIGHT, duration: 1.4 })
  } else {
    const top = el.getBoundingClientRect().top + window.scrollY - NAV_HEIGHT
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  }
}

document.addEventListener('click', e => {
  const anchor = (e.target as HTMLElement).closest('a[href^="#"]') as HTMLAnchorElement | null
  if (!anchor) return
  const hash = anchor.getAttribute('href') ?? ''
  if (hash === '#' || hash === '') return
  const id = hash.slice(1)
  if (!document.getElementById(id)) return
  e.preventDefault()
  smoothScrollTo(id)
})

// ── Staggered Section Reveal ─────────────────────────────────
// Persistent IntersectionObserver — picks up lazy-loaded sections via MutationObserver
const revealObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = entry.target as HTMLElement
        target.classList.add('reveal-in-view')
        requestAnimationFrame(() => target.classList.add('revealed'))
        revealObserver.unobserve(entry.target)
      }
    })
  },
  { threshold: 0.18, rootMargin: '0px 0px -12% 0px' }
)

let revealIndex = 0

function observeRevealTargets() {
  const targets = document.querySelectorAll<HTMLElement>(
    '[data-reveal]:not(.reveal-observed), [data-reveal-children]:not(.reveal-observed)'
  )
  targets.forEach(target => {
    target.classList.add('reveal-observed')
    if (!target.style.getPropertyValue('--reveal-delay')) {
      const staggerDelay = Math.min(revealIndex * 70, 560)
      target.style.setProperty('--reveal-delay', `${staggerDelay}ms`)
      revealIndex++
    }
    revealObserver.observe(target)
  })
}

function initRevealObserver() {
  observeRevealTargets()

  // Watch for lazy-loaded sections arriving in DOM
  const mutationObserver = new MutationObserver(() => observeRevealTargets())
  mutationObserver.observe(document.body, { childList: true, subtree: true })
}

// ── Magnetic CTA ─────────────────────────────────────────────
// Aktif hanya untuk pointer device agar tidak ganggu touch interaction.
function initMagneticCta() {
  const supportsFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches
  if (!supportsFinePointer) return

  const ctas = Array.from(document.querySelectorAll<HTMLElement>('[data-magnetic]'))
  if (!ctas.length) return

  ctas.forEach(cta => {
    cta.classList.add('magnetic-cta')
    let rafId = 0
    const strength = Number(cta.dataset.magneticStrength ?? 8)

    const setAtRest = () => {
      cta.classList.remove('magnetic-active')
      cta.style.setProperty('--mx', '0px')
      cta.style.setProperty('--my', '0px')
      cta.style.setProperty('--ms', '1')
    }

    const onEnter = () => {
      cta.classList.add('magnetic-active')
      cta.style.setProperty('--ms', '1.012')
    }

    const onMove = (event: PointerEvent) => {
      const rect = cta.getBoundingClientRect()
      const offsetX = ((event.clientX - rect.left) / rect.width - 0.5) * strength * 2
      const offsetY = ((event.clientY - rect.top) / rect.height - 0.5) * strength * 2

      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        cta.style.setProperty('--mx', `${offsetX.toFixed(2)}px`)
        cta.style.setProperty('--my', `${offsetY.toFixed(2)}px`)
      })
    }

    const onLeave = () => {
      if (rafId) cancelAnimationFrame(rafId)
      setAtRest()
    }

    cta.addEventListener('pointerenter', onEnter)
    cta.addEventListener('pointermove', onMove)
    cta.addEventListener('pointerleave', onLeave)
    cta.addEventListener('blur', onLeave)
    cta.addEventListener('focus', onEnter)
  })
}

// Jalankan setelah React selesai render pertama kali
requestAnimationFrame(() =>
  setTimeout(() => {
    initRevealObserver()
    initMagneticCta()
  }, 100)
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
