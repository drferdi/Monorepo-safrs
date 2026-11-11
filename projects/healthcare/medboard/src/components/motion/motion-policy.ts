export type MotionEffect = 'none' | 'shared' | 'portal' | 'depth' | 'curtain'

const immediateRoutes = ['/emr', '/calculator', '/icdx', '/telemedicine', '/voice', '/dashboard', '/audit', '/report', '/admin', '/join']
const references = ['/atlas', '/sentrapedia', '/critical-mind']
const team = ['/hub', '/acars', '/chat']
const matches = (pathname: string, routes: string[]) => routes.some((route) => pathname === route || pathname.startsWith(`${route}/`))

export function selectRouteEffect(from: string, to: string, reducedMotion: boolean): MotionEffect {
  if (reducedMotion || from === to || matches(from, immediateRoutes) || matches(to, immediateRoutes)) return 'none'
  if (matches(from, ['/atlas']) || matches(to, ['/atlas'])) return 'portal'
  if (matches(to, ['/hub', '/acars'])) return 'curtain'
  if (matches(from, references) !== matches(to, references) || matches(from, team) !== matches(to, team)) return 'depth'
  return 'shared'
}

export function motionDestination(href: string, currentHref: string): string | null {
  try {
    const current = new URL(currentHref)
    const next = new URL(href, current)
    if (!['http:', 'https:'].includes(next.protocol) || next.origin !== current.origin || next.username || next.password || next.search || next.hash || next.pathname === current.pathname) return null
    return `${next.pathname}${next.search}${next.hash}`
  } catch {
    return null
  }
}

export function curtainPath(progress: number): string {
  const p = Math.min(1, Math.max(0, progress))
  const edge = Math.round(p * 120)
  const curve = Math.round(p * 100)
  return `M0 0 H100 V${edge} Q50 ${curve} 0 ${edge} Z`
}

export class MotionTransaction {
  private controller = new AbortController()
  private resolveCommit!: (committed: boolean) => void
  private timer: ReturnType<typeof setTimeout>
  readonly committed: Promise<boolean>
  settled = false
  armed = false

  constructor(readonly from: string, readonly target: string | null, timeoutMs: number) {
    this.committed = new Promise((resolve) => { this.resolveCommit = resolve })
    this.timer = setTimeout(() => this.cancel(), timeoutMs)
  }

  get signal(): AbortSignal { return this.controller.signal }

  arm() { this.armed = true }

  commit() {
    if (this.settled) return
    this.settled = true
    this.resolveCommit(true)
  }

  cancel() {
    clearTimeout(this.timer)
    this.controller.abort()
    if (this.settled) return
    this.settled = true
    this.resolveCommit(false)
  }
}

export class MotionCoordinator {
  private active: MotionTransaction | null = null

  begin(from: string, target: string | null = null, timeoutMs = 1200): MotionTransaction {
    const previous = this.active
    this.active = new MotionTransaction(from, target, timeoutMs)
    previous?.cancel()
    return this.active
  }

  notifyCommit(pathname: string) {
    if (this.active?.armed && pathname === this.active.target) this.active.commit()
  }

  isCurrent(transaction: MotionTransaction): boolean { return this.active === transaction }

  finish(transaction: MotionTransaction) {
    if (this.isCurrent(transaction)) this.active = null
    transaction.cancel()
  }

  cancel() {
    const previous = this.active
    this.active = null
    previous?.cancel()
  }
}
