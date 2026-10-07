'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { isDoctorProfession } from '@/lib/crew-access'
import { resolveCrewRankBadgeSrc, resolveCrewSentraTitle } from '@/lib/crew-profile'
import OrganisationTab from './OrganisationTab'
import styles from './hub.module.css'

interface RosterMember {
  username: string
  displayName: string
  profession: string
  role: string
  profile: {
    fullName: string
    gender: string
    degrees: string[]
    jobTitles: string[]
    avatarUrl: string
    strNumber: string
    sipNumber: string
    employeeId: string
    hasGithubUrl: boolean
    hasLinkedinUrl: boolean
    hasGravatarUrl: boolean
    hasBlogUrl: boolean
  } | null
}

interface OnlineUser {
  userId: string
  name: string
  role: string
  profession: string
  institution: string
}

function formatRole(role: string): string {
  switch (role) {
    case 'CEO':
      return 'Chief Executive Officer'
    case 'ADMINISTRATOR':
      return 'Administrator'
    case 'DOKTER':
      return 'Dokter'
    case 'PERAWAT':
      return 'Perawat'
    case 'BIDAN':
      return 'Bidan'
    case 'APOTEKER':
      return 'Apoteker'
    case 'TRIAGE_OFFICER':
      return 'Triage Officer'
    case 'AUDITOR':
      return 'Auditor'
    default:
      return role
  }
}

function formatProfessionLabel(profession: string): string {
  return profession || 'Belum diatur'
}

function getShiftLabel(profession: string): string {
  return isDoctorProfession(profession) ? '07:00 - 14:00 WIB' : '08:00 - 15:00 WIB'
}

function getProfessionMark(profession: string): string {
  switch (profession) {
    case 'Dokter':
      return 'DR'
    case 'Dokter Gigi':
      return 'DG'
    case 'Perawat':
      return 'PR'
    case 'Bidan':
      return 'BD'
    case 'Apoteker':
      return 'AP'
    case 'Triage Officer':
      return 'TO'
    default:
      return 'CR'
  }
}

type HubTab = 'roster' | 'organisation'

const HUB_TABS: { key: HubTab; label: string }[] = [
  { key: 'roster', label: 'Roster' },
  { key: 'organisation', label: 'Sentra Organisation' },
]

export default function HubPage() {
  const [activeTab, setActiveTab] = useState<HubTab>('roster')
  const [roster, setRoster] = useState<RosterMember[]>([])
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [session, setSession] = useState<{
    username: string
    displayName: string
    role: string
    profession: string
    institution: string
  } | null>(null)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    let alive = true

    async function init() {
      try {
        setLoadError('')
        const [rosterRes, sessionRes] = await Promise.all([
          fetch('/api/hub/roster', { cache: 'no-store' }),
          fetch('/api/auth/session', { cache: 'no-store' }),
        ])

        if (!alive) return

        if (rosterRes.ok) {
          const data = (await rosterRes.json()) as {
            ok: boolean
            roster: RosterMember[]
          }
          if (data.ok) {
            setRoster(data.roster)
          } else {
            setLoadError('Roster belum bisa dimuat.')
          }
        } else {
          setLoadError('Roster belum bisa dimuat.')
        }

        if (sessionRes.ok) {
          const sData = (await sessionRes.json()) as {
            ok: boolean
            user?: {
              username: string
              displayName: string
              role: string
              profession: string
              institution: string
            }
          }
          const src = sData.user
          if (src) setSession(src)
        }
      } catch {
        if (alive) setLoadError('Terjadi gangguan saat memuat roster.')
      } finally {
        if (alive) setLoading(false)
      }
    }

    void init()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!session) return

    const socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('user:join', {
        userId: session.username,
        name: session.displayName,
        role: session.role,
        profession: session.profession,
        institution: session.institution,
      })
    })

    socket.on('users:online', (users: OnlineUser[]) => {
      setOnlineUserIds(new Set(users.map(u => u.userId)))
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [session])

  const totalOnline = onlineUserIds.size
  const credentialedCount = roster.filter(
    member => !!(member.profile?.strNumber || member.profile?.sipNumber)
  ).length
  const clinicalCount = roster.filter(member =>
    ['Dokter', 'Dokter Gigi', 'Perawat', 'Bidan', 'Apoteker'].includes(member.profession)
  ).length
  const summaryCards = [
    { label: 'Crew Terdaftar', value: loading ? '...' : String(roster.length) },
    { label: 'Sedang Online', value: loading ? '...' : String(totalOnline) },
    {
      label: 'Kredensial Aktif',
      value: loading ? '...' : String(credentialedCount),
    },
    { label: 'Peran Klinis', value: loading ? '...' : String(clinicalCount) },
  ]

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.head}>
        <p className={styles.meta}>Crew Hub</p>
        <h1 className={styles.title}>{activeTab === 'roster' ? 'Roster' : 'Sentra Organisation'}</h1>

        {/* Tab navigation */}
        <div className="ui-tabs" role="tablist">
          {HUB_TABS.map(tab => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              className="ui-tab"
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'roster' && (
          <div className={styles.headRow}>
            <span className={styles.description}>
              {loading ? 'Memuat...' : `${roster.length} anggota terdaftar`}
            </span>
            {!loading && totalOnline > 0 && (
              <span className="ui-badge ui-badge--success">{totalOnline} online</span>
            )}
          </div>
        )}
      </div>

      {/* ── Tab: Roster ── */}
      {activeTab === 'roster' && (
        <>
          <div className={styles.kpis}>
            {summaryCards.map(item => (
              <div key={item.label} className={`${styles.card} ${styles.kpi}`}>
                <span className={styles.kpiLabel}>{item.label}</span>
                <span className={styles.kpiValue}>{item.value}</span>
              </div>
            ))}
          </div>

          {/* Roster Grid */}
          {!loading && loadError ? (
            <div className={`${styles.card} ${styles.status}`}>
              <div className={styles.small}>Status Roster</div>
              <div className={styles.statusText}>{loadError}</div>
            </div>
          ) : !loading && roster.length === 0 ? (
            <div className={`${styles.card} ${styles.status}`}>
              <div className={styles.small}>Status Roster</div>
              <div className={styles.statusText}>
                Belum ada anggota roster yang tampil saat ini.
              </div>
            </div>
          ) : (
            !loading && (
              <div className={styles.grid}>
                {roster.map(member => {
                  const isOnline = onlineUserIds.has(member.username)
                  const professionMark = getProfessionMark(member.profession)
                  const avatarUrl = member.profile?.avatarUrl || '/avatar.png'
                  const fullName = member.profile?.fullName || member.displayName
                  const degrees = member.profile?.degrees || []
                  const jobTitles = member.profile?.jobTitles || []
                  const hasCredentials = !!(member.profile?.strNumber || member.profile?.sipNumber)
                  const hasEmployeeId = !!member.profile?.employeeId
                  const rankBadgeSrc = resolveCrewRankBadgeSrc(member.role, jobTitles)
                  const degreesLabel = degrees.length > 0 ? degrees.join(', ') : ''
                  const accessRoleLabel = formatRole(member.role)
                  const professionLabel = formatProfessionLabel(member.profession)
                  const sentraTitle = resolveCrewSentraTitle(jobTitles, member.role)
                  const profileLinks = [
                    {
                      label: 'GitHub',
                      value: member.profile?.hasGithubUrl,
                      iconSrc: '/social/github.svg',
                    },
                    {
                      label: 'LinkedIn',
                      value: member.profile?.hasLinkedinUrl,
                      iconSrc: '/social/linkedin.svg',
                    },
                    {
                      label: 'Gravatar',
                      value: member.profile?.hasGravatarUrl,
                      iconSrc: '/social/gravatar.svg',
                    },
                    {
                      label: 'Blog',
                      value: member.profile?.hasBlogUrl,
                      iconSrc: '/social/blog.svg',
                    },
                  ]

                  return (
                    <Link
                      key={member.username}
                      href={`/hub/${encodeURIComponent(member.username)}`}
                      className={`${styles.card} ${styles.member}`}
                    >
                      <div className={styles.memberTop}>
                        <div className={styles.avatarWrap}>
                          <img src={avatarUrl} alt={fullName} className={styles.avatar} />
                          <div
                            className={`${styles.presence}${isOnline ? ` ${styles.presenceOn}` : ''}`}
                          />
                        </div>

                        <div className={styles.memberBody}>
                          <div className={styles.memberName}>{fullName}</div>
                          {degreesLabel && <div className={styles.memberDegrees}>{degreesLabel}</div>}
                        </div>

                        {rankBadgeSrc ? (
                          <img
                            src={rankBadgeSrc}
                            alt={`Rank ${member.role}`}
                            className={styles.rank}
                          />
                        ) : null}
                      </div>

                      <div className={styles.facts}>
                        <div className={styles.fact}>
                          <span className={styles.factLabel}>Profesi</span>
                          <span className={styles.factValue}>{professionLabel}</span>
                        </div>
                        <div className={styles.fact}>
                          <span className={styles.factLabel}>Jabatan</span>
                          <span className={styles.factValue}>{sentraTitle || ' '}</span>
                        </div>
                        <div className={styles.fact}>
                          <span className={styles.factLabel}>Role Akses</span>
                          <span className={styles.factValue}>{accessRoleLabel}</span>
                        </div>
                      </div>

                      <div className={styles.badges}>
                        <span
                          className={`ui-badge ${isOnline ? 'ui-badge--success' : 'ui-badge--neutral'}`}
                        >
                          {isOnline ? 'Online' : 'Offline'}
                        </span>
                        {hasEmployeeId ? <span className="ui-badge ui-badge--neutral">NIP</span> : null}
                        <span className="ui-badge ui-badge--primary">{professionMark}</span>
                        {hasCredentials && <span className="ui-badge ui-badge--neutral">STR/SIP</span>}
                      </div>

                      <div className={styles.memberFoot}>
                        <div className={styles.links}>
                          {profileLinks.map(item => (
                            <span
                              key={item.label}
                              title={item.label}
                              className={`${styles.linkIcon}${item.value ? '' : ` ${styles.linkOff}`}`}
                            >
                              <img src={item.iconSrc} alt={`${item.label} logo`} />
                            </span>
                          ))}
                        </div>
                        <span>Buka Profile</span>
                        <span className={styles.arrow}>→</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )
          )}
        </>
      )}

      {/* ── Tab: Sentra Organisation ── */}
      {activeTab === 'organisation' && <OrganisationTab />}
    </div>
  )
}
