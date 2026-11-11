'use client'

import {
  Application,
  Badge,
  Book,
  ChevronDown,
  ChevronRight,
  CopyFile,
  Document,
  Earth,
  Favorite,
  Folder,
  History,
  Logout,
  Menu,
  Notification,
  Search,
  Settings,
  UserAvatar,
} from '@carbon/icons-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { UI_COPY } from '../../services/uiCopy'
import { SENTRAVERSE_URL, type WorkspaceView } from '../../services/workspaceRoutes'

interface SiteHeaderProps {
  activeView: WorkspaceView
  onNavigate: (view: WorkspaceView) => void
  onOpenSentraverse: () => void
  onLogout: () => void
}

export function SiteHeader({
  activeView,
  onNavigate,
  onOpenSentraverse,
  onLogout,
}: SiteHeaderProps) {
  const [search, setSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const isSentraboard = activeView === 'sentraboard'
  const normalizedSearch = search.trim().toLocaleLowerCase()
  const matches = (label: string) =>
    !normalizedSearch || label.toLocaleLowerCase().includes(normalizedSearch)
  const navItems = useMemo(
    () => ({
      sentraboard: matches('SentraBoard'),
      medlink: matches('MedLink'),
      logbook: matches('Logbook'),
      credential: matches('Credential'),
      sentrapedia: matches('Sentrapedia'),
      sentraverse: matches('Sentraverse'),
      notifications: matches(UI_COPY.navigation.notifications),
      settings: matches(UI_COPY.navigation.settings),
      history: matches(UI_COPY.navigation.history),
    }),
    [normalizedSearch]
  )

  useEffect(() => {
    if (!menuOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setMenuOpen(false)
      menuButtonRef.current?.focus()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen])

  const navigate = (view: WorkspaceView) => {
    onNavigate(view)
    setMenuOpen(false)
  }

  return (
    <aside
      className={`d01-sidebar${isSentraboard ? ' d01-sidebar--sentraboard' : ''}${menuOpen ? ' d01-sidebar--menu-open' : ''}`}
      aria-label="MEDLINK navigation"
    >
      <div className="d01-compact-bar">
        <strong>MEDLINK</strong>
        <span>
          <button type="button" aria-label={UI_COPY.navigation.logout} onClick={onLogout}>
            <Logout size={18} aria-hidden="true" />
          </button>
          <button
            ref={menuButtonRef}
            type="button"
            aria-label="Buka menu navigasi"
            aria-expanded={menuOpen}
            aria-controls="medlink-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Menu size={20} aria-hidden="true" />
          </button>
        </span>
      </div>
      <a className="d01-brand" href="#medlink" onClick={() => navigate('medlink')}>
        <span className="d01-brand__mark" aria-hidden="true">
          <img src="/images/logosentra.png" alt="" />
        </span>
        <span>
          <strong>Sentra Healthcare</strong>
          <small>
            {isSentraboard ? 'ARTIFICIAL INTELLIGENCE TECHNOLOGY' : 'ARTIFICIAL INTELLIGENCE'}
          </small>
        </span>
      </a>
      <label className="d01-search">
        <Search size={18} aria-hidden="true" />
        <input
          placeholder={UI_COPY.navigation.search}
          aria-label={UI_COPY.navigation.search}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <nav id="medlink-navigation" className="d01-nav" aria-label="Ruang kerja MEDLINK">
        {navItems.sentraboard ? (
          <a
            className={activeView === 'sentraboard' ? 'd01-nav__active' : ''}
            aria-current={activeView === 'sentraboard' ? 'page' : undefined}
            href="#sentraboard"
            onClick={() => navigate('sentraboard')}
          >
            <Application size={18} />
            SentraBoard
          </a>
        ) : null}
        {navItems.medlink ? (
          <a
            className={activeView === 'medlink' ? 'd01-nav__active' : ''}
            aria-current={activeView === 'medlink' ? 'page' : undefined}
            href="#medlink"
            onClick={() => navigate('medlink')}
          >
            {isSentraboard ? (
              <Favorite size={18} aria-hidden="true" />
            ) : (
              <span className="d01-nav__medical" aria-hidden="true">
                ✚
              </span>
            )}
            MedLink
          </a>
        ) : null}
        {navItems.logbook ? (
          <a
            className={activeView === 'logbook' ? 'd01-nav__active' : ''}
            aria-current={activeView === 'logbook' ? 'page' : undefined}
            href="#logbook"
            onClick={() => navigate('logbook')}
          >
            {isSentraboard ? <Book size={18} /> : <Document size={18} />}
            Logbook
          </a>
        ) : null}
        {navItems.credential || navItems.sentrapedia || navItems.sentraverse ? (
          <span>
            {isSentraboard ? <CopyFile size={18} /> : <Folder size={18} />}
            {UI_COPY.navigation.resources}
            {isSentraboard ? <ChevronDown className="d01-nav__resource-chevron" size={12} /> : null}
          </span>
        ) : null}
        <div className="d01-nav__children" aria-label="Resource modules">
          {navItems.credential ? (
            <a
              className={activeView === 'credential' ? 'd01-nav__active' : ''}
              aria-current={activeView === 'credential' ? 'page' : undefined}
              href="#credential"
              onClick={() => navigate('credential')}
            >
              {isSentraboard ? <Badge size={16} /> : <Document size={16} />}
              Credential
            </a>
          ) : null}
          {navItems.sentrapedia ? (
            <a
              className={activeView === 'sentrapedia' ? 'd01-nav__active' : ''}
              aria-current={activeView === 'sentrapedia' ? 'page' : undefined}
              href="#sentrapedia"
              onClick={() => navigate('sentrapedia')}
            >
              {isSentraboard ? <Book size={16} /> : <Document size={16} />}
              Sentrapedia
            </a>
          ) : null}
          {navItems.sentraverse ? (
            <button type="button" title={SENTRAVERSE_URL} onClick={onOpenSentraverse}>
              {isSentraboard ? <Earth size={16} /> : <Document size={16} />}
              Sentraverse
            </button>
          ) : null}
        </div>
        {navItems.history ? (
          <a href="#logbook" onClick={() => navigate('logbook')}>
            <History size={18} />
            {UI_COPY.navigation.history}
          </a>
        ) : null}
        {navItems.notifications ? (
          <a
            className={activeView === 'notifications' ? 'd01-nav__active' : ''}
            aria-current={activeView === 'notifications' ? 'page' : undefined}
            href="#notifications"
            onClick={() => navigate('notifications')}
          >
            <Notification size={18} />
            {UI_COPY.navigation.notifications}
          </a>
        ) : null}
      </nav>
      <div className="d01-sidebar__spacer" />
      <div className="d01-nav d01-nav--settings">
        {navItems.settings ? (
          <a
            className={activeView === 'settings' ? 'd01-nav__active' : ''}
            aria-current={activeView === 'settings' ? 'page' : undefined}
            href="#settings"
            onClick={() => navigate('settings')}
          >
            <Settings size={18} />
            {UI_COPY.navigation.settings}
          </a>
        ) : null}
      </div>
      <div className="d01-profile">
        {isSentraboard ? (
          <span className="d01-profile__initials" aria-hidden="true">
            DF
          </span>
        ) : (
          <UserAvatar size={36} />
        )}
        <span>
          <strong>dr Ferdi Iskandar</strong>
          {isSentraboard ? null : (
            <>
              <small>Dokter</small>
              <span className="d01-profile__status">
                <span className="d01-profile__status-dot" aria-hidden="true" />
                {UI_COPY.navigation.ready}
              </span>
            </>
          )}
        </span>
        <button type="button" aria-label={UI_COPY.navigation.logout} onClick={onLogout}>
          {isSentraboard ? <ChevronRight size={14} /> : <Logout size={16} />}
        </button>
      </div>
    </aside>
  )
}
