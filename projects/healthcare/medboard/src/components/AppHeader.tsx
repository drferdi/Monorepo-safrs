'use client'

import { LogOut, User } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { initials } from './shell/initials'

interface ProfileResponse {
  user?: { displayName?: string; profession?: string }
  profile?: { fullName?: string }
}

function formatHeaderDate(value: Date): string {
  return value.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function AppHeader() {
  const [name, setName] = useState('')
  const [profession, setProfession] = useState('')
  const [today, setToday] = useState(() => new Date())
  const [menuOpen, setMenuOpen] = useState(false)
  const [logoutError, setLogoutError] = useState<string | null>(null)
  const accountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/auth/profile', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: ProfileResponse | null) => {
        if (!alive) return
        setName(data?.profile?.fullName || data?.user?.displayName || '')
        setProfession(data?.user?.profession || '')
      })
      .catch(() => {
        if (alive) setName('')
      })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    const intervalId = window.setInterval(() => setToday(new Date()), 60_000)
    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !accountRef.current?.contains(event.target)) setMenuOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  async function handleLogout() {
    setLogoutError(null)
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
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

  return (
    <header className="app-header">
      <span aria-hidden />
      <a className="app-header__brand" href="https://sentrahai.com/" target="_blank" rel="noopener noreferrer">
        <img src="/sentradash.png" alt="" width={22} height={22} />
        <span>MedBoard</span>
      </a>
      <div className="app-header__end">
        <span className="app-header__date">{formatHeaderDate(today)}</span>
        <div className="app-header__account" ref={accountRef}>
          <button
            type="button"
            className="app-header__avatar"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            title={name || 'Akun'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {initials(name)}
          </button>
          {menuOpen ? (
            <div className="app-header__menu" role="menu">
              <div className="app-header__menu-who">
                <div className="app-header__menu-name">{name || 'Crew'}</div>
                {profession ? <div className="app-header__menu-meta">{profession}</div> : null}
              </div>
              <Link href="/" role="menuitem" className="app-header__menu-item" onClick={() => setMenuOpen(false)}>
                <User size={16} strokeWidth={1.75} aria-hidden />
                Profil User
              </Link>
              <button type="button" role="menuitem" className="app-header__menu-item" onClick={handleLogout}>
                <LogOut size={16} strokeWidth={1.75} aria-hidden />
                Keluar
              </button>
              {logoutError ? (
                <p role="alert" className="app-header__menu-error">
                  {logoutError}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
