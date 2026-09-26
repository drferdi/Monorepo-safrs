import { cn } from '@/lib/utils'

export const layoutGovernance = {
  sectionX: 'px-6 md:px-12',
  sectionY: {
    compact: 'py-12 md:py-16',
    standard: 'py-16 md:py-20',
    spacious: 'py-20 md:py-24',
    hero: 'py-20 md:py-24 lg:py-28',
  },
  container: {
    wide: 'mx-auto max-w-[1440px]',
    body: 'mx-auto max-w-[1200px]',
    reading: 'mx-auto max-w-[1140px]',
  },
} as const

export const typeGovernance = {
  eyebrow: 'font-jakarta text-[10px] md:text-xs font-bold uppercase tracking-[0.18em] text-accent',
  sectionTitle:
    'font-jakarta text-[32px] md:text-[45px] font-bold leading-[1.08] tracking-tight text-foreground',
  body: 'font-inter text-base md:text-lg leading-relaxed text-muted',
  bodySm: 'font-inter text-sm md:text-base leading-relaxed text-muted',
  editorialDisplay:
    '[font-family:var(--sentra-font-editorial)] text-foreground font-medium tracking-normal',
  editorialBody:
    '[font-family:var(--sentra-font-editorial)] text-muted leading-relaxed tracking-normal',
  meta: 'font-jakarta text-[10px] uppercase tracking-[0.16em] text-muted/70',
  monoMeta: 'font-mono text-[10px] uppercase tracking-[0.18em] text-muted/60',
} as const

export function sectionShell(
  container: keyof typeof layoutGovernance.container,
  rhythm: keyof typeof layoutGovernance.sectionY,
  ...extra: Array<string | false | null | undefined>
) {
  return cn(
    layoutGovernance.container[container],
    layoutGovernance.sectionX,
    layoutGovernance.sectionY[rhythm],
    ...extra
  )
}

const ALLOWED_PILOT_LOGIN_HOSTS = new Set([
  'sentrahai.com',
  'www.sentrahai.com',
  'app.sentrahai.com',
  'pilot.sentrahai.com',
  'dashboard.sentrahai.com',
])

export function getPilotLoginHref(rawValue?: string) {
  const fallback = '/dashboard'
  const candidate = rawValue?.trim()

  if (!candidate) {
    return { href: fallback, external: false }
  }

  if (candidate.startsWith('/')) {
    return { href: candidate, external: false }
  }

  try {
    const parsed = new URL(candidate)
    const isAllowedProtocol = parsed.protocol === 'https:'
    const isAllowedHost = ALLOWED_PILOT_LOGIN_HOSTS.has(parsed.hostname)

    if (!isAllowedProtocol || !isAllowedHost) {
      return { href: fallback, external: false }
    }

    return { href: parsed.toString(), external: true }
  } catch {
    return { href: fallback, external: false }
  }
}
