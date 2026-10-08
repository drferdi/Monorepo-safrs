'use client'

import { LayoutGroup, MotionConfig } from 'motion/react'
import { usePathname, useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useReducedMotion } from '../shell/use-reduced-motion'
import { abortable, curtainTransition, depthTransition, sharedTransition } from './effects'
import { MotionCoordinator, motionDestination, selectRouteEffect, type MotionEffect, type MotionTransaction } from './motion-policy'
import type { PortalRenderer } from './portal'
import { motionPresetKey, motionPresets, restoreMotionPreset, type MotionPreset, type MotionTuning } from './motion-presets'

type PreviewEffect = Exclude<MotionEffect, 'none'>
interface MotionContextValue {
  viewport: { current: HTMLDivElement | null }
  navigate: (href: string, scroll?: boolean) => boolean
  preview: (effect: PreviewEffect, commit: () => void) => void
  reducedMotion: boolean
  setReducedMotion: (value: boolean) => void
  cancel: () => void
  preset: MotionPreset
  setPreset: (preset: MotionPreset) => void
  tuning: MotionTuning
  suspended: boolean
}
const MotionContext = createContext<MotionContextValue | null>(null)
export const useDashboardMotion = () => useContext(MotionContext)

export default function MotionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const systemReduced = useReducedMotion()
  const [reducedOverride, setReducedOverride] = useState(false)
  const [preset, setPresetState] = useState<MotionPreset>('cinematic')
  const [suspended, setSuspended] = useState(false)
  const tuning = motionPresets[preset]
  const reduced = systemReduced || reducedOverride
  const viewport = useRef<HTMLDivElement>(null)
  const overlay = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const curtain = useRef<SVGPathElement>(null)
  const portal = useRef<PortalRenderer | null>(null)
  const coordinator = useRef(new MotionCoordinator())
  const pendingCommit = useRef<(() => Promise<void>) | null>(null)
  const currentPath = useRef(pathname)

  useLayoutEffect(() => {
    try { setPresetState(restoreMotionPreset(window.localStorage.getItem(motionPresetKey))) } catch { /* Storage can be unavailable in private contexts. */ }
  }, [])

  useLayoutEffect(() => {
    currentPath.current = pathname
    coordinator.current.notifyCommit(pathname)
  }, [pathname])

  const resetOverlay = useCallback(() => {
    if (overlay.current) {
      overlay.current.hidden = true
      delete overlay.current.dataset.effect
    }
    curtain.current?.setAttribute('d', 'M0 0 H100 V0 Q50 0 0 0 Z')
  }, [])

  const cancelVisuals = useCallback(() => {
    coordinator.current.cancel()
    pendingCommit.current = null
    resetOverlay()
    if (viewport.current) delete viewport.current.dataset.motionPhase
  }, [resetOverlay])

  const setPreset = useCallback((next: MotionPreset) => {
    void pendingCommit.current?.().catch(() => undefined)
    cancelVisuals()
    setPresetState(next)
    try { window.localStorage.setItem(motionPresetKey, next) } catch { /* The in-memory preference still works. */ }
  }, [cancelVisuals])

  useEffect(() => {
    const onVisibility = () => {
      setSuspended(document.hidden)
      if (document.hidden) {
        void pendingCommit.current?.().catch(() => undefined)
        cancelVisuals()
      }
    }
    window.addEventListener('popstate', cancelVisuals)
    document.addEventListener('visibilitychange', onVisibility)
    onVisibility()
    return () => {
      window.removeEventListener('popstate', cancelVisuals)
      document.removeEventListener('visibilitychange', onVisibility)
      cancelVisuals()
      portal.current?.dispose()
      portal.current = null
    }
  }, [cancelVisuals])

  useEffect(() => {
    if (reduced) {
      queueMicrotask(() => {
        void pendingCommit.current?.().catch(() => undefined)
        cancelVisuals()
      })
    }
  }, [reduced, cancelVisuals])

  const run = useCallback(async (
    effect: PreviewEffect,
    commit: (transaction: MotionTransaction) => Promise<void>,
    moveFocus: boolean,
    target: string | null = null,
  ) => {
    const host = viewport.current
    const layer = overlay.current
    const path = curtain.current
    if (!host || !layer || !path) return
    const transaction = coordinator.current.begin(currentPath.current, target)
    resetOverlay()
    host.dataset.motionPhase = effect
    let committed = false
    const update = async () => {
      if (committed || !coordinator.current.isCurrent(transaction)) return
      committed = true
      await commit(transaction)
    }
    pendingCommit.current = update
    const onAbort = () => {
      if (coordinator.current.isCurrent(transaction)) {
        resetOverlay()
        delete host.dataset.motionPhase
        void update().catch(() => undefined)
      }
    }
    transaction.signal.addEventListener('abort', onAbort, { once: true })
    const cover = (kind: 'portal' | 'curtain') => {
      const rect = host.getBoundingClientRect()
      const top = Math.max(0, rect.top)
      Object.assign(layer.style, {
        left: `${Math.max(0, rect.left)}px`, top: `${top}px`,
        width: `${rect.width}px`, height: `${Math.max(1, window.innerHeight - top)}px`,
      })
      layer.dataset.effect = kind
      layer.hidden = false
    }
    try {
      if (effect === 'shared' && !moveFocus) {
        await sharedTransition(host.querySelector<HTMLElement>('.motion-studio__feature') ?? host, update, transaction.signal, tuning)
      } else if (effect === 'depth' || effect === 'shared') {
        await depthTransition(host, update, transaction.signal, tuning)
      } else if (effect === 'curtain') {
        cover('curtain')
        await curtainTransition(path, update, transaction.signal, tuning)
      } else {
        try {
          const module = await abortable(import('./portal'), transaction.signal)
          if (!module || !coordinator.current.isCurrent(transaction)) return
          if (!canvas.current || canvas.current.dataset.portalState === 'lost') throw new Error('Portal unavailable')
          if (!portal.current) {
            const tokens = getComputedStyle(host)
            portal.current = module.createPortal(canvas.current, tokens.getPropertyValue('--primary').trim(), tokens.getPropertyValue('--accent').trim())
          }
          cover('portal')
          await portal.current.play(update, transaction.signal, tuning)
        } catch {
          if (coordinator.current.isCurrent(transaction)) {
            cover('curtain')
            await curtainTransition(path, update, transaction.signal, tuning)
          }
        }
      }
    } catch {
      // Decorative animation failure must never prevent the requested navigation.
      await update().catch(() => undefined)
    } finally {
      transaction.signal.removeEventListener('abort', onAbort)
      if (coordinator.current.isCurrent(transaction)) {
        await update().catch(() => undefined)
        resetOverlay()
        delete host.dataset.motionPhase
        pendingCommit.current = null
        if (moveFocus && !transaction.signal.aborted && !host.contains(document.activeElement)) {
          const heading = host.querySelector<HTMLElement>('h1')
          if (heading) {
            heading.tabIndex = -1
            heading.focus({ preventScroll: true })
          }
        }
        coordinator.current.finish(transaction)
      }
    }
  }, [resetOverlay, tuning])

  const navigate = useCallback((href: string, scroll?: boolean) => {
    const destination = motionDestination(href, window.location.href)
    if (!destination || !viewport.current || !overlay.current || !curtain.current) {
      cancelVisuals()
      return false
    }
    const target = new URL(destination, window.location.href).pathname
    const effect = selectRouteEffect(currentPath.current, target, reduced || window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    if (effect === 'none' || document.hidden) {
      cancelVisuals()
      return false
    }
    void run(effect, async (transaction) => {
      transaction.arm()
      router.push(destination, { scroll })
      await transaction.committed
    }, true, target)
    return true
  }, [router, run, cancelVisuals, reduced])

  const preview = useCallback((effect: PreviewEffect, commit: () => void) => {
    if (reduced || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      cancelVisuals()
      commit()
      return
    }
    void run(effect, async (transaction) => {
      commit()
      transaction.commit()
    }, false)
  }, [run, cancelVisuals, reduced])

  const context = useMemo(() => ({ viewport, navigate, preview, reducedMotion: reduced, setReducedMotion: setReducedOverride, cancel: cancelVisuals, preset, setPreset, tuning, suspended }), [navigate, preview, reduced, cancelVisuals, preset, setPreset, tuning, suspended])

  return (
    <MotionContext.Provider value={context}>
      <MotionConfig reducedMotion={reduced ? 'always' : 'user'}>
        <LayoutGroup id="medboard-workspace">{children}</LayoutGroup>
      </MotionConfig>
      <div className="dashboard-motion-overlay" ref={overlay} hidden aria-hidden="true">
        <canvas ref={canvas} className="dashboard-motion-portal" />
        <svg className="dashboard-motion-curtain" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path ref={curtain} d="M0 0 H100 V0 Q50 0 0 0 Z" />
        </svg>
      </div>
    </MotionContext.Provider>
  )
}

export function MotionViewport({ children }: { children: ReactNode }) {
  const context = useDashboardMotion()
  return <div className="app-page-stack" ref={context?.viewport}>{children}</div>
}
