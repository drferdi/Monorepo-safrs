'use client'

import { lazy, Suspense, useEffect, useState } from 'react'
import { getCrewSentraLeadershipTitle } from '@/lib/crew-profile'
import type { AdminSession } from './_components/AdminCommandCenter'
import styles from './page.module.css'

/* ── Lazy-loaded tab components ── */

const AdminCommandCenter = lazy(() => import('./_components/AdminCommandCenter'))
const AdminRpaMonitoring = lazy(() => import('./_components/AdminRpaMonitoring'))
const AdminUserAccess = lazy(() => import('./_components/AdminUserAccess'))
const AdminDevUpdates = lazy(() => import('./_components/AdminDevUpdates'))
const AdminNotam = lazy(() => import('./_components/AdminNotam'))
const AdminInstitutionsTab = lazy(() => import('./_components/AdminInstitutionsTab'))
const AdminAnalytics = lazy(() => import('./_components/AdminAnalytics'))
const AdminEklaimReadiness = lazy(() => import('./_components/AdminEklaimReadiness'))
const AdminOperationalSummary = lazy(() => import('./_components/AdminOperationalSummary'))
const AdminPlaceholder = lazy(() => import('./_components/AdminPlaceholder'))

/* ── Types ── */

type AdminSection =
  | 'command-center'
  | 'rpa'
  | 'user-access'
  | 'dev-updates'
  | 'notam'
  | 'institutions'
  | 'integrations'
  | 'icdx'
  | 'acars'
  | 'audit'
  | 'analytics'
  | 'eklaim'
  | 'ops-summary'

interface TabGroup {
  key: string
  label: string
  sections: { key: AdminSection; label: string }[]
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

const TAB_GROUPS: TabGroup[] = [
  {
    key: 'operations',
    label: 'OPERATIONS',
    sections: [
      { key: 'command-center', label: 'COMMAND CENTER' },
      { key: 'rpa', label: 'RPA & LAPORAN' },
    ],
  },
  {
    key: 'users',
    label: 'USERS',
    sections: [
      { key: 'user-access', label: 'USER & AKSES' },
      { key: 'dev-updates', label: 'UPDATE DEV' },
      { key: 'notam', label: 'NOTAM' },
      { key: 'institutions', label: 'INSTITUSI' },
    ],
  },
  {
    key: 'system',
    label: 'SYSTEM',
    sections: [
      { key: 'integrations', label: 'INTEGRASI' },
      { key: 'icdx', label: 'ICD-X' },
      { key: 'acars', label: 'ACARS' },
    ],
  },
  {
    key: 'insight',
    label: 'INSIGHT',
    sections: [
      { key: 'audit', label: 'AUDIT' },
      { key: 'analytics', label: 'ANALITIK' },
      { key: 'eklaim', label: 'E-KLAIM' },
      { key: 'ops-summary', label: 'OPS SUMMARY' },
    ],
  },
]

function getGroupForSection(section: AdminSection): string {
  for (const g of TAB_GROUPS) {
    if (g.sections.some(s => s.key === section)) return g.key
  }
  return TAB_GROUPS[0].key
}

/* ── Tab Loading Fallback ── */

function TabLoader() {
  return <div className={styles.tabLoader}>LOADING...</div>
}

/* ── Component ── */

export default function AdminPage() {
  const [activeSection, setActiveSection] = useState<AdminSection>('command-center')
  const [session, setSession] = useState<AdminSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const activeGroup = getGroupForSection(activeSection)
  const activeGroupObj = TAB_GROUPS.find(g => g.key === activeGroup)!
  const sentraPositionLabel =
    getCrewSentraLeadershipTitle(session?.role) || session?.role || 'Posisi belum diatur'

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('/api/auth/session', { cache: 'no-store' })
        if (!res.ok) {
          setError('Akses ditolak.')
          return
        }
        const data = (await res.json()) as { user?: AdminSession }
        if (data.user) {
          const allowed = new Set(['CEO', 'CEO_SENTRA', 'ADMINISTRATOR', 'CHIEF_EXECUTIVE_OFFICER'])
          if (!allowed.has(data.user.role)) {
            setError('Halaman ini hanya untuk Admin.')
            return
          }
          setSession(data.user)
        } else {
          setError('Session tidak ditemukan.')
        }
      } catch {
        setError('Gagal memuat session.')
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [])

  if (loading) {
    return <div className={styles.pageState}>LOADING ADMIN...</div>
  }

  if (error) {
    return <div className={cx(styles.pageState, styles.errorState)}>{error}</div>
  }

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.hero}>
          <p className={styles.heroEyebrow}>Management Console</p>
          <div className={styles.heroCopy}>
            <h1 className={styles.heroTitle}>Admin Dashboard</h1>
            <p className={styles.heroDescription}>
              Pusat kendali operasional Sentra untuk memantau crew, orkestrasi modul, health system,
              dan sinyal risiko harian tanpa kehilangan ritme visual yang tenang.
            </p>
          </div>
        </div>
        <div className={styles.sessionCard}>
          <div className={styles.sessionHeader}>
            <span className={styles.sessionLabel}>Session</span>
            <span className={styles.secureBadge}>Secure Access</span>
          </div>
          <div className={styles.sessionIdentity}>
            <div className={styles.sessionName}>{session?.displayName || 'Admin'}</div>
            <div className={styles.sessionRoleText}>{sentraPositionLabel}</div>
          </div>
          <div className={styles.sessionPills}>
            <span className={styles.sessionPill}>{session?.role || 'Unknown'}</span>
            <span className={cx(styles.sessionPill, styles.sessionPillMuted)}>
              Multi-tab console
            </span>
          </div>
        </div>
      </div>

      {/* ── Level 1: Group Tabs ── */}
      <div className={styles.groupTabs}>
        {TAB_GROUPS.map(group => {
          const isActive = activeGroup === group.key
          return (
            <button
              key={group.key}
              onClick={() => setActiveSection(group.sections[0].key)}
              className={cx(styles.groupTab, isActive && styles.groupTabActive)}
            >
              {group.label}
            </button>
          )
        })}
      </div>

      {/* ── Level 2: Section Pills ── */}
      <div className={styles.sectionTabs}>
        {activeGroupObj.sections.map(sec => {
          const isActive = activeSection === sec.key
          return (
            <button
              key={sec.key}
              onClick={() => setActiveSection(sec.key)}
              className={cx(styles.sectionTab, isActive && styles.sectionTabActive)}
            >
              {sec.label}
            </button>
          )
        })}
      </div>

      {/* ── Section Content ── */}
      <div className={styles.sectionContent}>
        <Suspense fallback={<TabLoader />}>
          {activeSection === 'command-center' && <AdminCommandCenter session={session} />}
          {activeSection === 'rpa' && <AdminRpaMonitoring />}
          {activeSection === 'user-access' && <AdminUserAccess />}
          {activeSection === 'dev-updates' && <AdminDevUpdates />}
          {activeSection === 'notam' && <AdminNotam />}
          {activeSection === 'institutions' && <AdminInstitutionsTab />}
          {activeSection === 'integrations' && (
            <AdminPlaceholder
              section="Integrasi Eksternal"
              description="Monitoring koneksi ke SATUSEHAT, P-Care BPJS, SIK Dinkes, dan e-Puskesmas."
              prerequisites={[
                'API client untuk SATUSEHAT',
                'API client untuk P-Care BPJS',
                'Konfigurasi endpoint Dinkes',
              ]}
            />
          )}
          {activeSection === 'icdx' && (
            <AdminPlaceholder
              section="ICD-X Converter"
              description="Statistik konversi kode ICD-10 (WHO, INA-CBGs, P-Care). Total konversi, success rate, kode paling sering dicari."
              prerequisites={[
                'Logging konversi ICD-X (belum ada)',
                'Database untuk menyimpan query history',
              ]}
            />
          )}
          {activeSection === 'acars' && (
            <AdminPlaceholder
              section="ACARS Chat"
              description="Monitoring komunikasi tim: total pesan, channel aktif, file sharing."
              prerequisites={[
                'Message persistence (saat ini hanya in-memory)',
                'Database untuk menyimpan chat history',
              ]}
            />
          )}
          {activeSection === 'audit' && (
            <AdminPlaceholder
              section="Audit & Keamanan"
              description="Log aktivitas, percobaan login gagal, akses data pasien, export data."
              prerequisites={['Prisma database aktif (DATABASE_URL)', 'Login attempt tracking']}
            />
          )}
          {activeSection === 'analytics' && <AdminAnalytics />}
          {activeSection === 'eklaim' && <AdminEklaimReadiness />}
          {activeSection === 'ops-summary' && <AdminOperationalSummary />}
        </Suspense>
      </div>
    </div>
  )
}
