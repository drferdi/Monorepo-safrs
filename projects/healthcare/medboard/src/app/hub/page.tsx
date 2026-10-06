'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { isDoctorProfession } from '@/lib/crew-access'
import { resolveCrewRankBadgeSrc, resolveCrewSentraTitle } from '@/lib/crew-profile'
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
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.head}>
        <p className={styles.meta}>CREW HUB</p>
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
      {activeTab === 'organisation' && (
        <div className={styles.section}>
          <div className={styles.heroGrid}>
            <div className={`${styles.card} ${styles.heroCol}`}>
              <div className={styles.eyebrow}>Governance Structure</div>
              <h2 className={styles.heroLead}>
                Struktur organisasi Sentra yang lebih rapi, formal, dan mudah dibaca lintas divisi.
              </h2>
              <p className={styles.heroBody}>
                Organisasi dibingkai sebagai sistem kerja profesional: eksekutif, audit klinis,
                operasi medis, dan relasi eksternal. Setiap divisi ditampilkan sebagai unit
                tanggung jawab yang jelas, bukan sekadar daftar nama.
              </p>

              <div className={styles.orgStats}>
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
                  <div key={item.label} className={styles.orgStat}>
                    <span className={styles.kpiLabel}>{item.label}</span>
                    <span className={styles.orgStatValue}>{item.value}</span>
                    <span className={styles.kpiHint}>{item.hint}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${styles.card} ${styles.heroCol}`}>
              <h2 className={styles.cardTitle}>Organisation Map</h2>
              <p className={styles.muted} style={{ margin: 0 }}>
                Peta struktur resmi untuk membaca jalur komando, ownership divisi, dan keterkaitan
                antar fungsi.
              </p>
              <div className={styles.mapFrame}>
                <img src="/org.png" alt="Sentra Healthcare Solutions — Struktur Organisasi" />
              </div>
            </div>
          </div>

          {/* Core Principles */}
          <div className={styles.principles}>
            {CORE_PRINCIPLES.map((p, i) => (
              <div key={i} className={`${styles.card} ${styles.principle}`}>
                <h3 className={styles.cardTitle}>{p.label}</h3>
                <p>{p.desc}</p>
              </div>
            ))}
          </div>

          {/* Division cards */}
          <div className={styles.divisions}>
            {ORG_DIVISIONS.map((division, di) => (
              <div key={di} className={`${styles.card} ${styles.division}`}>
                {/* Division header */}
                <div className={styles.divisionHead}>
                  <div>
                    <div className={styles.eyebrow}>
                      Division {String(di + 1).padStart(2, '0')}
                    </div>
                    <h3 className={styles.cardTitle}>{division.name.replace(/^[IVX]+\.\s*/, '')}</h3>
                  </div>
                  <span className="ui-badge ui-badge--neutral">
                    {division.children.length} posisi inti
                  </span>
                </div>

                {/* Members */}
                <div className={styles.divisionMembers}>
                  {division.children.map((member, mi) => {
                    const initials = getOrgInitials(member.name)
                    const isCEO = mi === 0 && di === 0

                    return (
                      <div key={mi} className={styles.orgMember}>
                        <div className={styles.orgMemberTop}>
                          <div className={styles.orgMemberMain}>
                            <span
                              className={`${styles.initials}${isCEO ? ` ${styles.initialsLead}` : ''}`}
                            >
                              {initials}
                            </span>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div className={styles.orgName}>{member.name}</div>
                              <div className={styles.orgTitle}>{member.title}</div>
                            </div>
                          </div>
                          {isCEO && <span className="ui-badge ui-badge--primary">Executive</span>}
                        </div>
                        {member.subtitle && (
                          <div className={styles.focus}>
                            <span className={styles.eyebrow}>Fokus Tugas</span>
                            <div className={styles.muted}>{member.subtitle}</div>
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
          <div className={styles.footer}>
            Sentra Healthcare Solutions — Struktur Organisasi & Nomenklatur Profesional
          </div>
        </div>
      )}
    </div>
  )
}
