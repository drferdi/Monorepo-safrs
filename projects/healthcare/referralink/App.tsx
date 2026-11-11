import React, { Suspense, lazy, useEffect, useState } from 'react'

import { deleteSandboxSession, getSandboxSession } from './services/authService'
import {
  openSentraverse,
  parseWorkspaceHash,
  toWorkspaceHash,
  type WorkspaceView,
} from './services/workspaceRoutes'

const ThemeProvider = lazy(() =>
  import('./components/medlink/theme-provider').then((module) => ({
    default: module.ThemeProvider,
  }))
)

const SiteHeader = lazy(() =>
  import('./components/medlink/site-header').then((module) => ({
    default: module.SiteHeader,
  }))
)

const MedLinkDashboard = lazy(() => import('./vite-pages/MedLinkDashboard'))
const SentraBoardDashboard = lazy(() => import('./vite-pages/SentraBoardDashboard'))
const LogbookDashboard = lazy(() => import('./vite-pages/LogbookDashboard'))
const CredentialDashboard = lazy(() => import('./vite-pages/CredentialDashboard'))
const SentrapediaDashboard = lazy(() => import('./vite-pages/SentrapediaDashboard'))
const NotificationDashboard = lazy(() => import('./vite-pages/NotificationDashboard'))
const SettingsDashboard = lazy(() => import('./vite-pages/SettingsDashboard'))
const Login = lazy(() => import('./vite-pages/Login'))

function AppFallback() {
  return (
    <div className="medlink-app-fallback" role="status">
      Memuat MEDLINK…
    </div>
  )
}

const App: React.FC = () => {
  const [sessionState, setSessionState] = useState<'loading' | 'authenticated' | 'anonymous'>(
    'loading'
  )
  const [logoutError, setLogoutError] = useState<string | null>(null)
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>(() =>
    parseWorkspaceHash(window.location.hash)
  )

  useEffect(() => {
    let active = true
    void getSandboxSession().then((session) => {
      if (active) setSessionState(session.authenticated ? 'authenticated' : 'anonymous')
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const syncHash = () => {
      setWorkspaceView(parseWorkspaceHash(window.location.hash))
    }
    window.addEventListener('hashchange', syncHash)
    return () => window.removeEventListener('hashchange', syncHash)
  }, [])

  const navigateTo = (view: WorkspaceView) => {
    const nextHash = toWorkspaceHash(view)
    if (window.location.hash === nextHash) setWorkspaceView(view)
    else window.location.hash = nextHash
  }

  const handleLogin = async () => {
    const session = await getSandboxSession()
    setLogoutError(null)
    setSessionState(session.authenticated ? 'authenticated' : 'anonymous')
  }

  const handleLogout = async () => {
    setLogoutError(null)
    try {
      await deleteSandboxSession()
      setSessionState('anonymous')
    } catch {
      setLogoutError('Gagal keluar dari MEDLINK. Sesi tetap aktif; coba lagi.')
    }
  }

  const renderWorkspace = () => {
    switch (workspaceView) {
      case 'sentraboard':
        return <SentraBoardDashboard onOpenMedLink={() => navigateTo('medlink')} />
      case 'logbook':
        return <LogbookDashboard />
      case 'credential':
        return <CredentialDashboard />
      case 'sentrapedia':
        return <SentrapediaDashboard />
      case 'notifications':
        return <NotificationDashboard onOpenLogbook={() => navigateTo('logbook')} />
      case 'settings':
        return <SettingsDashboard onOpenLogbook={() => navigateTo('logbook')} />
      case 'medlink':
        return <MedLinkDashboard />
    }
  }

  if (sessionState === 'loading') return <AppFallback />

  if (sessionState === 'anonymous') {
    return (
      <Suspense fallback={<AppFallback />}>
        <Login onComplete={handleLogin} />
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<AppFallback />}>
      <ThemeProvider>
        <div
          className={`medlink-shell medlink-shell--bounded${
            workspaceView === 'sentraboard' ? ' medlink-shell--sentraboard' : ''
          }`}
        >
          {logoutError ? (
            <div role="alert" aria-live="assertive">
              <span>{logoutError}</span>
              <button type="button" onClick={handleLogout}>
                Coba lagi
              </button>
            </div>
          ) : null}
          <SiteHeader
            activeView={workspaceView}
            onNavigate={navigateTo}
            onOpenSentraverse={() => openSentraverse()}
            onLogout={handleLogout}
          />
          <div className="medlink-shell__body">
            <div key={workspaceView} className="medlink-route-transition">
              {renderWorkspace()}
            </div>
          </div>
        </div>
      </ThemeProvider>
    </Suspense>
  )
}

export default App
