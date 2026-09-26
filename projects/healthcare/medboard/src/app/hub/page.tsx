'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { isDoctorProfession } from '@/lib/crew-access'
import { resolveCrewRankBadgeSrc, resolveCrewSentraTitle } from '@/lib/crew-profile'

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

function getOrgInitials(name: string): string {
  return (
    name
      .replace(
        /^(dr\.|apt\.|Sp\.\w+|A\.Md\.\w+|M\.\w+|SH|M\.Kn|CMDC|CLM|MIB|Farm|Amd\.Keb),?\s*/gi,
        ''
      )
      .split(' ')
      .filter(word => word.length > 1)
      .map(word => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || '??'
  )
}

type HubTab = 'roster' | 'organisation'
const HUB_ACCENT = '#E67E22'

const HUB_TABS: { key: HubTab; label: string }[] = [
  { key: 'roster', label: 'Roster' },
  { key: 'organisation', label: 'Sentra Organisation' },
]

// ─── Organisation Data ─────────────────────────────────────────────────────────
interface OrgMember {
  name: string
  title: string
  subtitle?: string
}

interface OrgDivision {
  name: string
  children: OrgMember[]
}

const ORG_DIVISIONS: OrgDivision[] = [
  {
    name: 'I. Executive & System Development',
    children: [
      {
        name: 'dr. Ferdi Iskandar SH, M.Kn, CMDC, CLM',
        title: 'Chief Executive Officer (CEO) & Lead Full-Stack Architect',
        subtitle: 'Arah strategis, kebijakan eksekutif, dan arsitektur pengembangan teknologi',
      },
    ],
  },
  {
    name: 'II. Clinical Audit & Quality Assurance',
    children: [
      {
        name: 'dr. Dibya Arfianda, Sp.OG',
        title: 'Lead Clinical Algorithm Strategist & Medical Auditor',
        subtitle: 'Perancangan algoritma klinis dan standar audit medis',
      },
      {
        name: 'dr. Boyong Baskoro, Sp.OG',
        title: 'Senior Medical Auditor & Clinical Algorithm Specialist',
        subtitle: 'Eksekusi audit tata laksana medis dan parameter algoritma',
      },
      {
        name: 'Kevin Susanto, MIT',
        title: 'Head of Quality Assurance & Control (QA/QC)',
        subtitle: 'Pengendalian mutu layanan, sistem, dan kepatuhan SOP',
      },
    ],
  },
  {
    name: 'III. Medical Operations & Data Management',
    children: [
      {
        name: 'dr. Auliya',
        title: 'Clinical Operations Medical Officer',
        subtitle: 'Operasional medis harian dan implementasi program klinis',
      },
      {
        name: 'dr. Armando Hadyono Joko Sasmito',
        title: 'Chief of Diagnostic Audit',
        subtitle: 'Validasi dan evaluasi akurasi diagnosis medis',
      },
      {
        name: 'apt. Umul Farida M., Farm',
        title: 'Chief of Pharmaceutical Audit & Medication Safety',
        subtitle:
          'Memvalidasi algoritma farmakoterapi, mengevaluasi risiko interaksi obat, dan mengaudit standar kepatuhan peresepan klinis',
      },
      {
        name: 'Nurmayatul Handayani, A.Md.RMIK',
        title: 'Health Information Management (HIM) Specialist & Document Evaluator',
        subtitle: 'Audit dokumen rekam medis dan tata kelola informasi kesehatan',
      },
    ],
  },
  {
    name: 'IV. Infrastructure & External Relations',
    children: [
      {
        name: 'Oriza Rahmawati, Amd.Keb',
        title: 'Clinical & Patient Liaison Officer',
        subtitle: 'Komunikasi operasional klinis, faskes, dan pasien',
      },
      {
        name: 'Joseph Arianto',
        title: 'Corporate Liaison Officer',
        subtitle: 'Hubungan strategis, kemitraan eksternal, dan komunikasi B2B',
      },
      {
        name: 'Michael Subrata',
        title: 'Head of IT Infrastructure',
        subtitle: 'Keandalan, keamanan, dan pemeliharaan infrastruktur teknologi',
      },
    ],
  },
]

const CORE_PRINCIPLES = [
  {
    label: 'Patient Safety Above All',
    desc: 'Tidak ada fitur, deadline, atau business logic yang dapat mengabaikan keselamatan pasien.',
  },
  {
    label: 'Humans Decide, AI Supports',
    desc: 'AI bersifat assistive — dokter memegang akuntabilitas final atas semua keputusan klinis.',
  },
  {
    label: 'Zero Fabrication',
    desc: 'Jarak antara klaim dan realita = pelanggaran governance. Tidak boleh ada data yang dikarang.',
  },
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
  const organisationMemberCount = ORG_DIVISIONS.reduce(
    (count, division) => count + division.children.length,
    0
  )
  const executiveLead = ORG_DIVISIONS[0]?.children[0]

  return (
    <div style={{ width: '100%', maxWidth: 1240 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            letterSpacing: '0.2em',
            color: 'var(--text-muted)',
          }}
        >
          CREW HUB
        </p>
        <h1
          style={{
            margin: '8px 0 0',
            fontSize: 28,
            fontWeight: 600,
            color: 'var(--text-main)',
            letterSpacing: '-0.01em',
          }}
        >
          {activeTab === 'roster' ? 'Roster' : 'Sentra Organisation'}
        </h1>

        {/* Tab navigation */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            marginTop: 16,
            marginBottom: 4,
          }}
        >
          {HUB_TABS.map(tab => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '7px 18px',
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 400,
                  letterSpacing: '0.06em',
                  color: isActive ? HUB_ACCENT : 'var(--text-muted)',
                  background: isActive ? 'rgba(230,126,34,0.08)' : 'transparent',
                  border: isActive
                    ? '1px solid rgba(230,126,34,0.2)'
                    : '1px solid var(--line-base)',
                  borderRadius: 99,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {activeTab === 'roster' && (
          <div
            style={{
              marginTop: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {loading ? 'Memuat...' : `${roster.length} anggota terdaftar`}
            </span>
            {!loading && totalOnline > 0 && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  padding: '3px 10px',
                  borderRadius: 99,
                  background: 'rgba(76,175,80,0.08)',
                  border: '1px solid rgba(76,175,80,0.15)',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 99,
                    background: '#4CAF50',
                    animation: 'onlinePulse 2s ease-in-out infinite',
                  }}
                />
                {totalOnline} online
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Tab: Roster ── */}
      {activeTab === 'roster' && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 14,
              marginBottom: 28,
            }}
          >
            {summaryCards.map(item => (
              <div
                key={item.label}
                style={{
                  borderRadius: 16,
                  border: '1px solid var(--line-base)',
                  background: 'linear-gradient(135deg, var(--bg-nav), var(--bg-card))',
                  padding: '16px 18px',
                  display: 'grid',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                  }}
                >
                  {item.label}
                </span>
                <span
                  style={{
                    fontSize: 28,
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    letterSpacing: '-0.03em',
                  }}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          {/* Roster Grid */}
          {!loading && loadError ? (
            <div
              style={{
                borderRadius: 16,
                border: '1px solid var(--line-base)',
                background: 'linear-gradient(135deg, var(--bg-nav), var(--bg-card))',
                padding: '20px 22px',
                color: 'var(--text-main)',
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}
              >
                Status Roster
              </div>
              <div style={{ fontSize: 16, lineHeight: 1.6 }}>{loadError}</div>
            </div>
          ) : !loading && roster.length === 0 ? (
            <div
              style={{
                borderRadius: 16,
                border: '1px solid var(--line-base)',
                background: 'linear-gradient(135deg, var(--bg-nav), var(--bg-card))',
                padding: '20px 22px',
                color: 'var(--text-main)',
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}
              >
                Status Roster
              </div>
              <div style={{ fontSize: 16, lineHeight: 1.6 }}>
                Belum ada anggota roster yang tampil saat ini.
              </div>
            </div>
          ) : (
            !loading && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: 20,
                }}
              >
                {roster.map((member, idx) => {
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
                  const rosterMeta = [{ label: 'Role Akses', value: accessRoleLabel }]
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
                      className="hub-card"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: 18,
                        border: '1px solid var(--line-base)',
                        background: 'linear-gradient(160deg, var(--bg-nav), var(--bg-card))',
                        overflow: 'hidden',
                        minHeight: 320,
                        animation: `hubCardIn 0.35s ease ${idx * 80}ms both`,
                        color: 'inherit',
                        textDecoration: 'none',
                      }}
                    >
                      {/* Card top — accent bar */}
                      <div
                        style={{
                          height: 2,
                          background:
                            'linear-gradient(90deg, rgba(230,126,34,0.96), rgba(230,126,34,0.16), transparent)',
                          opacity: isOnline ? 1 : 0.78,
                        }}
                      />

                      {/* Avatar row */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 10,
                          padding: '14px 14px 0',
                        }}
                      >
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <img
                            src={avatarUrl}
                            alt={fullName}
                            style={{
                              width: 58,
                              height: 58,
                              borderRadius: 16,
                              objectFit: 'cover',
                              background: 'var(--bg-canvas)',
                              border: '1px solid var(--line-base)',
                            }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              bottom: -1,
                              right: -1,
                              width: 13,
                              height: 13,
                              borderRadius: 99,
                              background: isOnline ? '#4CAF50' : 'var(--text-muted)',
                              border: '2.5px solid var(--bg-nav)',
                              opacity: isOnline ? 1 : 0.3,
                            }}
                          />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: 'var(--text-main)',
                              lineHeight: 1.25,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {fullName}
                          </div>
                          {degreesLabel && (
                            <div
                              style={{
                                fontSize: 10.5,
                                color: 'var(--text-muted)',
                                lineHeight: 1.3,
                                marginTop: 2,
                              }}
                            >
                              {degreesLabel}
                            </div>
                          )}
                          <div
                            style={{
                              display: 'grid',
                              gap: 3,
                              marginTop: 4,
                              minHeight: 38,
                            }}
                          >
                            <div
                              style={{
                                minHeight: 17,
                                display: 'grid',
                                gridTemplateColumns: '54px minmax(0, 1fr)',
                                gap: 6,
                                alignItems: 'start',
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 10,
                                  color: 'var(--text-muted)',
                                  letterSpacing: '0.08em',
                                  textTransform: 'uppercase',
                                  lineHeight: 1.4,
                                }}
                              >
                                Profesi
                              </span>
                              <span
                                style={{
                                  fontSize: 12,
                                  color: 'var(--text-main)',
                                  lineHeight: 1.35,
                                  display: '-webkit-box',
                                  WebkitLineClamp: 1,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                }}
                              >
                                {professionLabel}
                              </span>
                            </div>
                            <div
                              style={{
                                minHeight: 17,
                                display: 'grid',
                                gridTemplateColumns: '54px minmax(0, 1fr)',
                                gap: 6,
                                alignItems: 'start',
                                opacity: sentraTitle ? 0.9 : 0.72,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 10,
                                  color: 'var(--text-muted)',
                                  letterSpacing: '0.08em',
                                  textTransform: 'uppercase',
                                  lineHeight: 1.4,
                                }}
                              >
                                Jabatan
                              </span>
                              <span
                                style={{
                                  fontSize: 12,
                                  color: 'var(--text-muted)',
                                  lineHeight: 1.35,
                                  display: '-webkit-box',
                                  WebkitLineClamp: 1,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {sentraTitle || '\u00A0'}
                              </span>
                            </div>
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              flexWrap: 'wrap',
                              marginTop: 7,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 10,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                color: isOnline ? '#7fd38a' : 'var(--text-muted)',
                                padding: '4px 8px',
                                borderRadius: 999,
                                border: isOnline
                                  ? '1px solid rgba(76,175,80,0.22)'
                                  : '1px solid var(--line-base)',
                                background: isOnline
                                  ? 'rgba(76,175,80,0.1)'
                                  : 'rgba(255,255,255,0.03)',
                              }}
                            >
                              {isOnline ? 'Online' : 'Offline'}
                            </span>
                            {hasEmployeeId ? (
                              <span
                                style={{
                                  fontSize: 10,
                                  letterSpacing: '0.08em',
                                  textTransform: 'uppercase',
                                  color: 'var(--text-muted)',
                                  padding: '4px 8px',
                                  borderRadius: 999,
                                  border: '1px solid var(--line-base)',
                                  background: 'rgba(255,255,255,0.03)',
                                }}
                              >
                                NIP
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {rankBadgeSrc ? (
                          <img
                            src={rankBadgeSrc}
                            alt={`Rank ${member.role}`}
                            style={{
                              width: 52,
                              height: 52,
                              objectFit: 'contain',
                              flexShrink: 0,
                              opacity: 0.95,
                            }}
                          />
                        ) : null}
                      </div>

                      {/* Divider */}
                      <div
                        style={{
                          margin: '10px 14px 0',
                          height: 1,
                          background: 'var(--line-base)',
                          opacity: 0.42,
                        }}
                      />

                      {/* Details section */}
                      <div
                        style={{
                          padding: '10px 14px 12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                          flex: 1,
                        }}
                      >
                        {/* Compact identity belt */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            flexWrap: 'wrap',
                          }}
                        >
                          <span
                            style={{
                              minWidth: 24,
                              height: 24,
                              padding: '0 8px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: 999,
                              background: 'rgba(230,126,34,0.1)',
                              border: '1px solid rgba(230,126,34,0.18)',
                              color: '#f0b264',
                              fontSize: 9,
                              fontWeight: 700,
                              letterSpacing: '0.08em',
                              flexShrink: 0,
                            }}
                          >
                            {professionMark}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              letterSpacing: '0.08em',
                              textTransform: 'uppercase',
                              color: 'var(--text-muted)',
                              padding: '3px 8px',
                              borderRadius: 999,
                              border: '1px solid var(--line-base)',
                              background: 'rgba(255,255,255,0.03)',
                              minWidth: 0,
                              flex: '0 1 auto',
                            }}
                          >
                            {accessRoleLabel}
                          </span>
                          {hasCredentials && (
                            <span
                              style={{
                                fontSize: 10,
                                letterSpacing: '0.06em',
                                color: 'var(--text-muted)',
                                padding: '2px 7px',
                                borderRadius: 4,
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid var(--line-base)',
                              }}
                            >
                              STR/SIP
                            </span>
                          )}
                        </div>

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'minmax(0, 1fr)',
                            gap: 6,
                          }}
                        >
                          {rosterMeta.map(item => (
                            <div
                              key={item.label}
                              style={{
                                border: '1px solid var(--line-base)',
                                borderRadius: 10,
                                padding: '7px 9px',
                                background: 'rgba(255,255,255,0.02)',
                                display: 'grid',
                                gap: 3,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 9,
                                  color: 'var(--text-muted)',
                                  letterSpacing: '0.12em',
                                  textTransform: 'uppercase',
                                }}
                              >
                                {item.label}
                              </span>
                              <span
                                style={{
                                  fontSize: 12,
                                  color: 'var(--text-main)',
                                  lineHeight: 1.35,
                                }}
                              >
                                {item.value}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div
                          style={{
                            display: 'grid',
                            gap: 6,
                            paddingTop: 2,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 9,
                              color: 'var(--text-muted)',
                              letterSpacing: '0.12em',
                              textTransform: 'uppercase',
                            }}
                          >
                            Link
                          </span>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              flexWrap: 'wrap',
                            }}
                          >
                            {profileLinks.map(item => (
                              <span
                                key={item.label}
                                title={item.label}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: 22,
                                  height: 22,
                                  opacity: item.value ? 0.96 : 0.28,
                                }}
                              >
                                <img
                                  src={item.iconSrc}
                                  alt={`${item.label} logo`}
                                  style={{
                                    width: 18,
                                    height: 18,
                                    objectFit: 'contain',
                                    flexShrink: 0,
                                    filter:
                                      'brightness(0) saturate(100%) invert(84%) sepia(18%) saturate(440%) hue-rotate(343deg) brightness(98%) contrast(92%)',
                                  }}
                                />
                              </span>
                            ))}
                          </div>
                        </div>

                        <div
                          style={{
                            marginTop: 'auto',
                            paddingTop: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 10,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 10,
                              color: 'var(--text-muted)',
                              letterSpacing: '0.08em',
                              textTransform: 'uppercase',
                            }}
                          >
                            Buka Profile
                          </span>
                          <span
                            style={{
                              fontSize: 14,
                              lineHeight: 1,
                              color: 'rgba(240, 178, 100, 0.92)',
                            }}
                          >
                            →
                          </span>
                        </div>
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
      {activeTab === 'organisation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div
            className="hub-org-hero-grid"
            style={{
              display: 'grid',
              gap: 18,
              alignItems: 'stretch',
            }}
          >
            <div
              style={{
                borderRadius: 18,
                border: '1px solid var(--line-base)',
                background: 'rgba(255,255,255,0.015)',
                padding: '22px 24px',
                display: 'grid',
                gap: 18,
              }}
            >
              <div style={{ display: 'grid', gap: 10 }}>
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.22em',
                    color: HUB_ACCENT,
                    textTransform: 'uppercase',
                  }}
                >
                  Governance Structure
                </div>
                <div
                  style={{
                    fontSize: 'clamp(24px, 3vw, 34px)',
                    lineHeight: 1.08,
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    letterSpacing: '-0.03em',
                    maxWidth: 640,
                  }}
                >
                  Struktur organisasi Sentra yang lebih rapi, formal, dan mudah dibaca lintas
                  divisi.
                </div>
                <div
                  style={{
                    fontSize: 14,
                    lineHeight: 1.75,
                    color: 'var(--text-muted)',
                    maxWidth: 720,
                  }}
                >
                  Organisasi dibingkai sebagai sistem kerja profesional: eksekutif, audit klinis,
                  operasi medis, dan relasi eksternal. Setiap divisi ditampilkan sebagai unit
                  tanggung jawab yang jelas, bukan sekadar daftar nama.
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: 12,
                  paddingTop: 16,
                  borderTop: '1px solid var(--line-base)',
                }}
              >
                {[
                  {
                    label: 'Divisi',
                    value: String(ORG_DIVISIONS.length),
                    hint: 'cluster organisasi aktif',
                  },
                  {
                    label: 'Profesional',
                    value: String(organisationMemberCount),
                    hint: 'jabatan inti tercatat',
                  },
                  {
                    label: 'Executive Lead',
                    value: executiveLead ? '1' : '0',
                    hint: executiveLead?.name || 'belum diatur',
                  },
                ].map(item => (
                  <div key={item.label} style={{ display: 'grid', gap: 6 }}>
                    <span
                      style={{
                        fontSize: 10,
                        letterSpacing: '0.14em',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                      }}
                    >
                      {item.label}
                    </span>
                    <span
                      style={{
                        fontSize: 30,
                        lineHeight: 1,
                        color: 'var(--text-main)',
                        letterSpacing: '-0.04em',
                      }}
                    >
                      {item.value}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: 'var(--text-muted)',
                        lineHeight: 1.55,
                      }}
                    >
                      {item.hint}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="hub-org-map-panel"
              style={{
                borderRadius: 18,
                border: '1px solid var(--line-base)',
                background: 'rgba(255,255,255,0.012)',
                padding: '14px',
                display: 'grid',
                gap: 14,
                minWidth: 0,
              }}
            >
              <div style={{ display: 'grid', gap: 6 }}>
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.2em',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                  }}
                >
                  Organisation Map
                </div>
                <div
                  style={{
                    fontSize: 15,
                    color: 'var(--text-main)',
                    lineHeight: 1.6,
                  }}
                >
                  Peta struktur resmi untuk membaca jalur komando, ownership divisi, dan keterkaitan
                  antar fungsi.
                </div>
              </div>
              <div
                className="hub-org-map-frame"
                style={{
                  borderRadius: 14,
                  border: '1px solid var(--line-base)',
                  overflow: 'hidden',
                  background: 'rgba(255,255,255,0.02)',
                  padding: 6,
                }}
              >
                <img
                  src="/org.png"
                  alt="Sentra Healthcare Solutions — Struktur Organisasi"
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                    objectFit: 'contain',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Core Principles */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 14,
            }}
          >
            {CORE_PRINCIPLES.map((p, i) => (
              <div
                key={i}
                style={{
                  borderRadius: 18,
                  border: '1px solid var(--line-base)',
                  background: 'rgba(255,255,255,0.012)',
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      width: 32,
                      height: 32,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 99,
                      background: 'rgba(230,126,34,0.08)',
                      border: '1px solid rgba(230,126,34,0.2)',
                      color: '#E67E22',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {i + 1}
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--text-main)',
                    }}
                  >
                    {p.label}
                  </span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: 'var(--text-muted)',
                    lineHeight: 1.6,
                  }}
                >
                  {p.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Division cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {ORG_DIVISIONS.map((division, di) => (
              <div
                key={di}
                style={{
                  borderRadius: 18,
                  border: '1px solid var(--line-base)',
                  background: 'rgba(255,255,255,0.012)',
                  overflow: 'hidden',
                }}
              >
                {/* Division header */}
                <div
                  style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--line-base)',
                    background: 'rgba(255,255,255,0.015)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 14,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'grid', gap: 6 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: '0.16em',
                        color: HUB_ACCENT,
                        textTransform: 'uppercase',
                      }}
                    >
                      Division {String(di + 1).padStart(2, '0')}
                    </span>
                    <span
                      style={{
                        fontSize: 18,
                        fontWeight: 600,
                        letterSpacing: '-0.01em',
                        color: 'var(--text-main)',
                      }}
                    >
                      {division.name.replace(/^[IVX]+\.\s*/, '')}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      letterSpacing: '0.12em',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      padding: '5px 10px',
                      borderRadius: 999,
                      border: '1px solid var(--line-base)',
                      background: 'rgba(255,255,255,0.03)',
                    }}
                  >
                    {division.children.length} posisi inti
                  </span>
                </div>

                {/* Members */}
                <div
                  style={{
                    padding: '18px 20px 20px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: 14,
                  }}
                >
                  {division.children.map((member, mi) => {
                    const initials = getOrgInitials(member.name)
                    const isCEO = mi === 0 && di === 0

                    return (
                      <div
                        key={mi}
                        style={{
                          display: 'grid',
                          gap: 14,
                          padding: '16px',
                          borderRadius: 16,
                          border: isCEO
                            ? '1px solid rgba(230,126,34,0.2)'
                            : '1px solid var(--line-base)',
                          background: isCEO ? 'rgba(230,126,34,0.045)' : 'rgba(255,255,255,0.018)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            gap: 14,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 14,
                              minWidth: 0,
                              flex: 1,
                            }}
                          >
                            <span
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: 14,
                                background: isCEO
                                  ? 'rgba(230,126,34,0.12)'
                                  : 'rgba(255,255,255,0.04)',
                                border: isCEO
                                  ? '1px solid rgba(230,126,34,0.25)'
                                  : '1px solid var(--line-base)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 13,
                                fontWeight: 700,
                                color: isCEO ? HUB_ACCENT : 'var(--text-muted)',
                                flexShrink: 0,
                              }}
                            >
                              {initials}
                            </span>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div
                                style={{
                                  fontSize: 15,
                                  fontWeight: 600,
                                  color: 'var(--text-main)',
                                  lineHeight: 1.35,
                                }}
                              >
                                {member.name}
                              </div>
                              <div
                                style={{
                                  fontSize: 13,
                                  color: isCEO ? HUB_ACCENT : '#D9C8B1',
                                  marginTop: 4,
                                  lineHeight: 1.45,
                                }}
                              >
                                {member.title}
                              </div>
                            </div>
                          </div>
                          {isCEO && (
                            <span
                              style={{
                                fontSize: 10,
                                letterSpacing: '0.14em',
                                color: HUB_ACCENT,
                                textTransform: 'uppercase',
                                padding: '5px 9px',
                                borderRadius: 999,
                                border: '1px solid rgba(230,126,34,0.2)',
                                background: 'rgba(230,126,34,0.08)',
                                flexShrink: 0,
                              }}
                            >
                              Executive
                            </span>
                          )}
                        </div>
                        {member.subtitle && (
                          <div
                            style={{
                              display: 'grid',
                              gap: 8,
                              paddingTop: 12,
                              borderTop: '1px solid rgba(255,255,255,0.04)',
                            }}
                          >
                            <span
                              style={{
                                fontSize: 10,
                                letterSpacing: '0.14em',
                                textTransform: 'uppercase',
                                color: HUB_ACCENT,
                              }}
                            >
                              Fokus Tugas
                            </span>
                            <div
                              style={{
                                fontSize: 12,
                                color: 'var(--text-muted)',
                                lineHeight: 1.68,
                                padding: '10px 12px',
                                borderRadius: 12,
                                background: 'rgba(255,255,255,0.022)',
                                border: '1px solid rgba(255,255,255,0.04)',
                              }}
                            >
                              {member.subtitle}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div
            style={{
              textAlign: 'center',
              padding: '12px 0 4px',
              fontSize: 11,
              color: 'var(--text-muted)',
              letterSpacing: '0.06em',
            }}
          >
            Sentra Healthcare Solutions — Struktur Organisasi & Nomenklatur Profesional
          </div>
        </div>
      )}

      <style>{`
        @keyframes hubCardIn {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes onlinePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .hub-card {
          transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
        }
        .hub-card:hover {
          border-color: rgba(230, 126, 34, 0.3);
          box-shadow: 0 18px 36px rgba(0,0,0,0.18);
          transform: translateY(-2px);
        }
        .hub-org-hero-grid {
          grid-template-columns: minmax(0, 0.82fr) minmax(0, 1.18fr);
        }
        .hub-org-map-panel {
          min-width: 0;
        }
        .hub-org-map-frame img {
          transform: scale(1.02);
          transform-origin: center top;
        }
        @media (max-width: 1080px) {
          .hub-org-hero-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}
