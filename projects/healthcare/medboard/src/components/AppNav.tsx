'use client'

import { PanelLeft } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { isNavActive, NAV_COLLAPSED_KEY, NAV_GROUPS, readNavCollapsed } from './shell/nav-items'

export default function AppNav() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(true)

  useEffect(() => {
    setCollapsed(readNavCollapsed(localStorage.getItem(NAV_COLLAPSED_KEY)))
  }, [])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
        event.preventDefault()
        toggleCollapsed()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function toggleCollapsed() {
    setCollapsed((previous) => {
      localStorage.setItem(NAV_COLLAPSED_KEY, String(!previous))
      return !previous
    })
  }

  return (
    <nav className={collapsed ? 'app-rail' : 'app-rail app-rail--open'} aria-label="Navigasi utama">
      <button
        type="button"
        className="app-rail__toggle"
        onClick={toggleCollapsed}
        aria-expanded={!collapsed}
        title={collapsed ? 'Lebarkan menu (Ctrl+B)' : 'Ciutkan menu (Ctrl+B)'}
      >
        <PanelLeft size={18} strokeWidth={1.75} aria-hidden />
      </button>
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="app-rail__group">
          {collapsed ? null : <div className="app-rail__group-label">{group.label}</div>}
          {group.items.map(({ href, label, icon: Icon }) => {
            const active = isNavActive(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                className={active ? 'app-rail__item is-active' : 'app-rail__item'}
                aria-current={active ? 'page' : undefined}
                aria-label={collapsed ? label : undefined}
                title={collapsed ? label : undefined}
              >
                <span className="app-rail__icon">
                  <Icon size={18} strokeWidth={1.75} aria-hidden />
                </span>
                {collapsed ? null : <span className="app-rail__label">{label}</span>}
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
