'use client'

import {
  ArrowRight,
  LogOutIcon,
  MoonIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  SunIcon,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTheme } from './ThemeProvider'

const NAV_ITEMS: Array<{
  href: string
  label: React.ReactNode
  collapsedLabel?: string
}> = [
  { href: '/admin', label: 'Admin' },
  { href: '/audit/logbook', label: 'Audit Log', collapsedLabel: 'AL' },
  { href: '/', label: 'Profil User' },
  { href: '/hub', label: 'Sentra HUB' },
  {
    href: '/emr',
    label: 'EMR Console',
    collapsedLabel: 'C',
  },
  { href: '/acars', label: 'Sentra Network' },
  { href: '/voice', label: 'Consult Audrey' },
  { href: '/telemedicine', label: 'Telemedicine' },
  { href: '/icdx', label: 'Smart ICD-10' },
  { href: '/calculator', label: 'SenCall' },
  { href: '/report', label: 'Report' },
]

const ACCENT = '#E67E22'

function formatSidebarDate(value: Date): string {
  return value.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export default function AppNav() {
  const pathname = usePathname()
  const { theme, toggle } = useTheme()
  const [crewName, setCrewName] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [logoutError, setLogoutError] = useState<string | null>(null)

  useEffect(() => {
    if (localStorage.getItem('puskesmas:nav-collapsed') === 'true') setCollapsed(true)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        toggle_collapse()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentDate(new Date())
    }, 60_000)

    return () => window.clearInterval(intervalId)
  }, [])

  function toggle_collapse() {
    setCollapsed((p) => {
      localStorage.setItem('puskesmas:nav-collapsed', String(!p))
      return !p
    })
  }

  useEffect(() => {
    let alive = true
    fetch('/api/auth/profile', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          d: {
            user?: { displayName?: string }
            profile?: { fullName?: string }
          } | null
        ) => {
          if (alive) setCrewName(d?.profile?.fullName || d?.user?.displayName || '')
        }
      )
      .catch(() => {
        if (alive) setCrewName('')
      })
    return () => {
      alive = false
    }
  }, [])

  async function handleLogout() {
    setLogoutError(null)
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
      if (!response.ok) {
        setLogoutError('Gagal logout. Silakan coba lagi.')
        return
      }
    } catch {
      setLogoutError('Koneksi bermasalah saat logout. Silakan coba lagi.')
      return
    }
    window.location.reload()
  }

  const w = collapsed ? 56 : 240
  const sidebarDate = formatSidebarDate(currentDate)

  return (
    <>
      <style>{`
        @keyframes nav-shine {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .nav-dashboard-title {
          background: linear-gradient(
            90deg,
            #C4956A 0%,
            #FDF6EC 30%,
            #ffffff 45%,
            #FFF8F0 50%,
            #ffffff 55%,
            #FDF6EC 70%,
            #C4956A 100%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: nav-shine 2.8s linear infinite;
        }
      `}</style>
      <nav className="app-nav" style={{ width: w, minWidth: w }}>
        {/* ── Header with Neumorphic Text ── */}
        <div className="nav-header" style={{ border: 'none' }}>
          {!collapsed ? (
            <a
              href="https://sentrahai.com/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '20px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                textDecoration: 'none',
              }}
            >
              <img
                src="/sentradash.png"
                alt="Sentra"
                style={{
                  width: 38,
                  height: 38,
                  objectFit: 'contain',
                  flexShrink: 0,
                  filter: 'brightness(0) invert(1) drop-shadow(0 0 6px rgba(255,255,255,0.4))',
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 400,
                    color: '#8a8278',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                  }}
                >
                  2026 Sentra Artificial Intelligence
                </div>
                <div
                  className="nav-dashboard-title"
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    lineHeight: 1.2,
                  }}
                >
                  MEDBOARD
                </div>
              </div>
            </a>
          ) : (
            <div style={{ padding: '16px 0', textAlign: 'center' }}>
              <img
                src="/sentradash.png"
                alt="Sentra"
                style={{
                  width: 30,
                  height: 30,
                  objectFit: 'contain',
                  filter: 'brightness(0) invert(1) drop-shadow(0 0 5px rgba(255,255,255,0.35))',
                }}
              />
            </div>
          )}
          <button
            className="nav-collapse-btn"
            onClick={toggle_collapse}
            title={collapsed ? 'Expand (Ctrl+B)' : 'Collapse (Ctrl+B)'}
          >
            {collapsed ? <PanelLeftOpenIcon size={14} /> : <PanelLeftCloseIcon size={14} />}
          </button>
        </div>

        {/* ── Menu — Aether MenuVertical style ── */}
        <div className="nav-menu">
          {NAV_ITEMS.map(({ href, label, collapsedLabel }) => {
            const isActive =
              pathname === href || (href === '/acars' && pathname.startsWith('/acars'))
            const isHovered = hovered === href
            const lit = isActive || isHovered

            return (
              <div
                key={href}
                className="nav-menu-row"
                onMouseEnter={() => setHovered(href)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Arrow — slides in from left */}
                <span
                  className="nav-menu-arrow"
                  style={{
                    opacity: lit ? 1 : 0,
                    transform: lit ? 'translateX(0)' : 'translateX(-100%)',
                    color: ACCENT,
                  }}
                >
                  <ArrowRight size={18} strokeWidth={2.5} />
                </span>

                {/* Label — shifts right & changes color */}
                <Link
                  href={href}
                  className="nav-menu-label"
                  style={{
                    color: lit ? ACCENT : 'var(--nav-muted)',
                    transform: lit ? 'translateX(0)' : 'translateX(-8px)',
                  }}
                >
                  {collapsed
                    ? typeof label === 'string'
                      ? label.slice(0, 1)
                      : (collapsedLabel ?? 'C')
                    : label}
                </Link>
              </div>
            )
          })}
        </div>

        {/* ── Footer controls ── */}
        <div className="nav-controls" style={{ padding: collapsed ? '12px 8px' : '12px 16px' }}>
          {logoutError && !collapsed && (
            <p
              role="alert"
              style={{
                marginBottom: 8,
                color: '#f87171',
                fontSize: 11,
                lineHeight: 1.3,
              }}
            >
              {logoutError}
            </p>
          )}
          <button
            className="nav-ctrl-btn"
            onClick={toggle}
            title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            style={{ justifyContent: collapsed ? 'center' : 'space-between' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {theme === 'dark' ? <MoonIcon size={13} /> : <SunIcon size={13} />}
              {!collapsed && <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>}
            </span>
            {!collapsed && (
              <div className={`theme-toggle-track ${theme}`}>
                <div className="theme-toggle-thumb" />
              </div>
            )}
          </button>

          <button
            className="nav-ctrl-btn nav-ctrl-btn--logout"
            onClick={handleLogout}
            title="Logout"
            style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
          >
            <LogOutIcon size={13} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>

        {/* ── Footer with Crew Info ── */}
        {!collapsed && (
          <div
            style={{
              padding: '20px 24px',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              marginTop: 'auto',
            }}
          >
            {crewName && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                {/* Crew Label */}
                <span
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.2em',
                    color: '#666',
                    textTransform: 'uppercase',
                    fontFamily: 'var(--font-mono)',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                  }}
                >
                  Crew
                </span>

                {/* Crew Name - Neumorphic */}
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: ACCENT,
                    letterSpacing: '0.05em',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.5), -1px -1px 2px rgba(255,255,255,0.08)',
                    padding: '8px 0',
                  }}
                >
                  {crewName}
                </span>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Spacer */}
      <div
        aria-hidden
        style={{
          width: w,
          minWidth: w,
          flexShrink: 0,
          transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
        }}
      />
    </>
  )
}
