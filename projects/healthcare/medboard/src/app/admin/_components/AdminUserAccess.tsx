'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

import styles from './AdminUserAccess.module.css'

import { CREW_ACCESS_PROFESSIONS, CREW_ACCESS_SERVICE_AREAS } from '@/lib/crew-access'
import {
  CREW_PROFILE_BLOOD_TYPES,
  CREW_PROFILE_DEGREES,
  CREW_PROFILE_MAX_DEGREES,
  CREW_PROFILE_MAX_POSITIONS,
  CREW_PROFILE_POSITIONS,
  type CrewProfileData,
  isCrewProfileDegree,
  isCrewProfilePosition,
  resolveCrewProfileAvatarUrl,
} from '@/lib/crew-profile'
import { safeUrl } from '@/lib/sanitize-url'
import { sentenceCase } from '@/lib/text/sentence-case'
import { Check, X } from 'lucide-react'

/* ── Types ── */

interface UserRecord {
  username: string
  displayName: string
  email: string
  institution: string
  profession: string
  role: string
  status: string
  profile: CrewProfileData | null
}

interface PendingRegistration {
  id: string
  email: string
  username: string
  displayName: string
  institution: string
  profession: string
  role: string
  profile: {
    fullName: string
    birthPlace: string
    birthDate: string
    gender: string
    domicile: string
    degrees: string[]
    jobTitles: string[]
  }
  credentials: {
    employeeId?: string
    strNumber?: string
    sipNumber?: string
    serviceAreas: string[]
    serviceAreaOther?: string
  }
  createdAt: string
}

const ROLES = [
  'CEO',
  'CEO_SENTRA',
  'ADMINISTRATOR',
  'DOKTER',
  'DOKTER_GIGI',
  'PERAWAT',
  'BIDAN',
  'APOTEKER',
  'TRIAGE_OFFICER',
]

function cx(...classNames: Array<string | false | null | undefined>): string {
  return classNames.filter(Boolean).join(' ')
}

function ensureText(value: unknown): string {
  return typeof value === 'string' ? value : String(value ?? '')
}

function ensureStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => ensureText(item).trim()).filter(Boolean)
}

function normalizeProfile(profile: unknown): CrewProfileData | null {
  if (!profile || typeof profile !== 'object') return null

  const source = profile as Partial<CrewProfileData>
  return {
    fullName: ensureText(source.fullName).trim(),
    birthPlace: ensureText(source.birthPlace).trim(),
    birthDate: ensureText(source.birthDate).trim(),
    gender: ensureText(source.gender).trim() as CrewProfileData['gender'],
    domicile: ensureText(source.domicile).trim(),
    bloodType: ensureText(source.bloodType).trim() as CrewProfileData['bloodType'],
    degrees: ensureStringArray(source.degrees).filter(
      (item): item is CrewProfileData['degrees'][number] => isCrewProfileDegree(item)
    ),
    jobTitles: ensureStringArray(source.jobTitles).filter(
      (item): item is CrewProfileData['jobTitles'][number] => isCrewProfilePosition(item)
    ),
    employeeId: ensureText(source.employeeId).trim(),
    strNumber: ensureText(source.strNumber).trim(),
    sipNumber: ensureText(source.sipNumber).trim(),
    serviceAreas: ensureStringArray(source.serviceAreas) as CrewProfileData['serviceAreas'],
    serviceAreaOther: ensureText(source.serviceAreaOther).trim(),
    institutionAdditional: ensureText(source.institutionAdditional).trim(),
    avatarUrl: ensureText(source.avatarUrl).trim(),
    whatsappNumber: ensureText(source.whatsappNumber).trim(),
    githubUrl: ensureText(source.githubUrl).trim(),
    linkedinUrl: ensureText(source.linkedinUrl).trim(),
    gravatarUrl: ensureText(source.gravatarUrl).trim(),
    blogUrl: ensureText(source.blogUrl).trim(),
    instagramUrl: ensureText(source.instagramUrl).trim(),
    tiktokUrl: ensureText(source.tiktokUrl).trim(),
    youtubeUrl: ensureText(source.youtubeUrl).trim(),
  }
}

function normalizeUserRecord(user: unknown): UserRecord {
  const source = (user && typeof user === 'object' ? user : {}) as Partial<UserRecord>
  return {
    username: ensureText(source.username).trim(),
    displayName: ensureText(source.displayName).trim(),
    email: ensureText(source.email).trim(),
    institution: ensureText(source.institution).trim(),
    profession: ensureText(source.profession).trim(),
    role: ensureText(source.role).trim(),
    status: ensureText(source.status).trim() || 'ACTIVE',
    profile: normalizeProfile(source.profile),
  }
}

function normalizePendingRegistration(registration: unknown): PendingRegistration | null {
  if (!registration || typeof registration !== 'object') return null
  const source = registration as Partial<PendingRegistration> & {
    profile?: Partial<PendingRegistration['profile']>
    credentials?: Partial<PendingRegistration['credentials']>
  }

  const id = ensureText(source.id).trim()
  if (!id) return null

  return {
    id,
    email: ensureText(source.email).trim(),
    username: ensureText(source.username).trim(),
    displayName: ensureText(source.displayName).trim(),
    institution: ensureText(source.institution).trim(),
    profession: ensureText(source.profession).trim(),
    role: ensureText(source.role).trim(),
    createdAt: ensureText(source.createdAt).trim(),
    profile: {
      fullName: ensureText(source.profile?.fullName).trim(),
      birthPlace: ensureText(source.profile?.birthPlace).trim(),
      birthDate: ensureText(source.profile?.birthDate).trim(),
      gender: ensureText(source.profile?.gender).trim(),
      domicile: ensureText(source.profile?.domicile).trim(),
      degrees: ensureStringArray(source.profile?.degrees),
      jobTitles: ensureStringArray(source.profile?.jobTitles),
    },
    credentials: {
      employeeId: ensureText(source.credentials?.employeeId).trim(),
      strNumber: ensureText(source.credentials?.strNumber).trim(),
      sipNumber: ensureText(source.credentials?.sipNumber).trim(),
      serviceAreas: ensureStringArray(source.credentials?.serviceAreas),
      serviceAreaOther: ensureText(source.credentials?.serviceAreaOther).trim(),
    },
  }
}

function formatRole(role: string): string {
  switch (role) {
    case 'CEO':
    case 'CEO_SENTRA':
      return 'Chief Executive Officer'
    case 'ADMINISTRATOR':
      return 'Administrator'
    case 'DOKTER':
      return 'Dokter'
    case 'DOKTER_GIGI':
      return 'Dokter Gigi'
    case 'PERAWAT':
      return 'Perawat'
    case 'BIDAN':
      return 'Bidan'
    case 'APOTEKER':
      return 'Apoteker'
    case 'TRIAGE_OFFICER':
      return 'Triage Officer'
    default:
      return role
  }
}

function formatRoleShort(role: string): string {
  switch (role) {
    case 'CEO':
    case 'CEO_SENTRA':
      return 'CEO'
    case 'ADMINISTRATOR':
      return 'Admin'
    case 'DOKTER':
      return 'Dokter'
    case 'DOKTER_GIGI':
      return 'Dr. Gigi'
    case 'PERAWAT':
      return 'Perawat'
    case 'BIDAN':
      return 'Bidan'
    case 'APOTEKER':
      return 'Apoteker'
    case 'TRIAGE_OFFICER':
      return 'Triage'
    default:
      return role
  }
}

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'baru saja'
  if (mins < 60) return `${mins}m lalu`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h lalu`
  const days = Math.floor(hours / 24)
  return `${days}d lalu`
}

/* ── Component ── */

export default function AdminUserAccess() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [institutions, setInstitutions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  /* Pending registrations */
  const [pendingRegs, setPendingRegs] = useState<PendingRegistration[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  /* Filters */
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterInstitution, setFilterInstitution] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  /* Selection */
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null)

  /* Socket for online users */
  const socketRef = useRef<Socket | null>(null)

  /* User stats from overview */
  const [onlineToday, setOnlineToday] = useState(0)
  const [onlineNow, setOnlineNow] = useState(0)
  // Fetched from /api/admin/overview but not rendered yet — underscore-prefixed
  // so the unused-vars rule allows the plumbing to stay in place.
  const [_recentLogins, setRecentLogins] = useState<string[]>([])
  const [_topUsers, setTopUsers] = useState<
    Array<{
      username: string
      dashboardCount: number
      emrClinicalCount: number
      totalActivity: number
    }>
  >([])

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' })
      if (!res.ok) {
        setError('Gagal memuat data crew.')
        return
      }
      const data = (await res.json()) as { ok: boolean; users?: unknown[] }
      if (data.ok) {
        setUsers(
          Array.isArray(data.users)
            ? data.users.map((item) => normalizeUserRecord(item)).filter((item) => item.username)
            : []
        )
      }
    } catch {
      setError('Gagal memuat data crew.')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchInstitutions = useCallback(async () => {
    try {
      const res = await fetch('/api/institutions', { cache: 'no-store' })
      if (!res.ok) return
      const data = (await res.json()) as {
        ok: boolean
        institutions: string[]
      }
      if (data.ok) setInstitutions(data.institutions)
    } catch {
      /* noop */
    }
  }, [])

  const fetchPendingRegistrations = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/overview', { cache: 'no-store' })
      if (!res.ok) return
      const data = (await res.json()) as {
        ok: boolean
        pendingRegistrations?: unknown[]
        kpi?: { onlineToday?: number }
        recentLogins?: string[]
        topUsers?: Array<{
          username: string
          dashboardCount: number
          emrClinicalCount: number
          totalActivity: number
        }>
      }
      if (data.ok) {
        if (data.pendingRegistrations) {
          setPendingRegs(
            data.pendingRegistrations
              .map((item) => normalizePendingRegistration(item))
              .filter((item): item is PendingRegistration => item !== null)
          )
        }
        if (data.kpi?.onlineToday !== undefined) {
          setOnlineToday(data.kpi.onlineToday)
        }
        if (data.recentLogins) {
          setRecentLogins(data.recentLogins)
        }
        if (data.topUsers) {
          setTopUsers(data.topUsers)
        }
      }
    } catch {
      /* noop */
    }
  }, [])

  useEffect(() => {
    void fetchUsers()
    void fetchInstitutions()
    void fetchPendingRegistrations()
  }, [fetchUsers, fetchInstitutions, fetchPendingRegistrations])

  /* Socket.IO for online users */
  useEffect(() => {
    const socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('user:join')
    })

    socket.on('users:online', (users: Array<{ userId: string }>) => {
      setOnlineNow(users.length)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  /* ── Approve / Reject handlers ── */

  async function handleApprove(id: string) {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/admin/registrations/${id}/approve`, {
        method: 'POST',
      })
      const body = (await res.json()) as { ok: boolean; error?: string }
      if (!body.ok) {
        alert(body.error || 'Gagal menyetujui.')
        return
      }
      await Promise.all([fetchUsers(), fetchPendingRegistrations()])
    } catch {
      alert('Gagal menyetujui pendaftaran.')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleReject(id: string) {
    if (!confirm('Tolak pendaftaran ini?')) return
    setActionLoading(id)
    try {
      const res = await fetch(`/api/admin/registrations/${id}/reject`, {
        method: 'POST',
      })
      const body = (await res.json()) as { ok: boolean; error?: string }
      if (!body.ok) {
        alert(body.error || 'Gagal menolak.')
        return
      }
      await Promise.all([fetchUsers(), fetchPendingRegistrations()])
    } catch {
      alert('Gagal menolak pendaftaran.')
    } finally {
      setActionLoading(null)
    }
  }

  /* ── Filter logic ── */
  const filtered = users.filter((u) => {
    if (search) {
      const q = search.toLowerCase()
      const match =
        u.username.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.profile?.fullName || '').toLowerCase().includes(q)
      if (!match) return false
    }
    if (filterRole && u.role !== filterRole) return false
    if (filterInstitution && u.institution !== filterInstitution) return false
    if (filterStatus) {
      const status = u.status || 'ACTIVE'
      if (status !== filterStatus) return false
    }
    return true
  })

  const selectedUser = selectedUsername ? users.find((u) => u.username === selectedUsername) : null

  /* ── Analytics computations ── */
  const roleCounts: Record<string, number> = {}
  for (const r of ROLES) roleCounts[r] = 0
  for (const u of users) {
    if (roleCounts[u.role] !== undefined) {
      roleCounts[u.role]++
    } else {
      roleCounts[u.role] = 1
    }
  }

  const pendingCount = pendingRegs.length

  if (loading) {
    return (
      <div className={`${styles.statusMessage} ${styles.loadingMessage}`}>
        Loading user access...
      </div>
    )
  }

  if (error) {
    return <div className={`${styles.statusMessage} ${styles.errorMessage}`}>{error}</div>
  }

  const uniqueInstitutions = [...new Set(users.map((u) => u.institution).filter(Boolean))]

  return (
    <div>
      {/* ══════════════════════════════════════════════════════
          SECTION 1: Role Breakdown Cards
          ══════════════════════════════════════════════════════ */}
      <div className={styles.roleCardsRow}>
        {ROLES.map((role) => (
          <div key={role} className={styles.roleCard}>
            <div className={styles.roleLabel}>{formatRoleShort(role)}</div>
            <div className={cx(styles.roleValue, roleCounts[role] === 0 && styles.roleValueMuted)}>
              {roleCounts[role] || 0}
            </div>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          SECTION 2: Summary Stats Row (4 KPI cards)
          ══════════════════════════════════════════════════════ */}
      <div className={styles.summaryGrid}>
        {/* Total Terdaftar */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Total terdaftar</div>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiValue}>{users.length}</span>
            {pendingCount > 0 && <span className={styles.kpiBadge}>+{pendingCount}</span>}
          </div>
          <div className={styles.kpiSub}>user terdaftar</div>
        </div>

        {/* Login Hari Ini */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Login hari ini</div>
          <div className={styles.kpiValue}>{onlineToday}</div>
          <div className={styles.kpiSub}>user yang login hari ini</div>
        </div>

        {/* Online Sekarang */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Online sekarang</div>
          <div className={styles.kpiValue}>{onlineNow}</div>
          <div className={styles.kpiSub}>user sedang online</div>
        </div>

        {/* Pending Registrasi */}
        <div className={cx(styles.kpiCard, pendingCount > 0 && styles.kpiCardPending)}>
          <div className={styles.kpiLabel}>Pending registrasi</div>
          <div className={cx(styles.kpiValue, pendingCount > 0 && styles.kpiValueAccent)}>
            {pendingCount}
          </div>
          <div className={styles.kpiSub}>menunggu review</div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          SECTION 3: Pending Registrations
          ══════════════════════════════════════════════════════ */}
      {pendingCount > 0 && (
        <div className={styles.pendingPanel}>
          <div className={styles.pendingHeader}>
            <p className={styles.pendingTitle}>Pendaftaran menunggu</p>
            <span className={styles.pendingCountText}>{pendingCount} menunggu review</span>
          </div>

          <div className={styles.pendingGrid}>
            {pendingRegs.map((reg) => (
              <PendingCard
                key={reg.id}
                reg={reg}
                loading={actionLoading === reg.id}
                onApprove={() => handleApprove(reg.id)}
                onReject={() => handleReject(reg.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          SECTION 4: Search & Filters (from AdminCrewTab)
          ══════════════════════════════════════════════════════ */}
      <div className={styles.filterRow}>
        <input
          type="text"
          placeholder="Cari nama, username, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          title="Filter role"
          aria-label="Filter role"
          className={styles.filterSelect}
        >
          <option value="">Semua Role</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {formatRole(r)}
            </option>
          ))}
        </select>
        <select
          value={filterInstitution}
          onChange={(e) => setFilterInstitution(e.target.value)}
          title="Filter institusi"
          aria-label="Filter institusi"
          className={styles.filterSelect}
        >
          <option value="">Semua Institusi</option>
          {uniqueInstitutions.map((inst) => (
            <option key={inst} value={inst}>
              {inst}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          title="Filter status"
          aria-label="Filter status"
          className={styles.filterSelect}
        >
          <option value="">Semua Status</option>
          <option value="ACTIVE">Aktif</option>
          <option value="INACTIVE">Nonaktif</option>
        </select>
      </div>

      {/* ── Count ── */}
      <p className={styles.resultCount}>
        {filtered.length} User{filtered.length !== 1 ? 'S' : ''} Ditemukan
      </p>

      {/* ══════════════════════════════════════════════════════
          SECTION 5: User Table (from AdminCrewTab)
          ══════════════════════════════════════════════════════ */}
      <div className={cx(styles.tablePanel, selectedUser && styles.tablePanelWithMargin)}>
        {filtered.length === 0 ? (
          <div className={styles.emptyState}>Tidak ada user yang cocok</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr className={styles.tableHeaderRow}>
                {['Nama', 'Profesi', 'Role', 'Institusi', 'Status'].map((h) => (
                  <th key={h} className={styles.tableHeaderCell}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const isActive = (u.status || 'ACTIVE') === 'ACTIVE'
                const isSelected = selectedUsername === u.username
                const degrees = u.profile?.degrees?.length
                  ? `, ${u.profile.degrees.join(', ')}`
                  : ''
                return (
                  <tr
                    key={u.username}
                    onClick={() => setSelectedUsername(isSelected ? null : u.username)}
                    className={cx(
                      styles.tableRow,
                      isSelected && styles.tableRowSelected,
                      !isActive && styles.tableRowInactive
                    )}
                  >
                    <td className={styles.tableCell}>
                      <div className={styles.userIdentity}>
                        <img
                          src={safeUrl(u.profile?.avatarUrl, '/avatar/doctor-m.png')}
                          alt={u.displayName}
                          className={styles.userAvatar}
                        />
                        <div>
                          <div className={styles.userFullName}>
                            {u.profile?.fullName || u.displayName}
                            {degrees}
                          </div>
                          <div className={styles.userHandle}>@{u.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className={cx(styles.tableCell, styles.primaryTextCell)}>{u.profession}</td>
                    <td className={cx(styles.tableCell, styles.primaryTextCell)}>
                      {formatRole(u.role)}
                    </td>
                    <td className={cx(styles.tableCell, styles.secondaryTextCell)}>
                      {u.institution}
                    </td>
                    <td className={styles.tableCell}>
                      <span
                        className={cx(
                          styles.statusBadge,
                          isActive ? styles.statusBadgeActive : styles.statusBadgeInactive
                        )}
                      >
                        {isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          SECTION 6: Detail / Edit Panel (from AdminCrewTab)
          ══════════════════════════════════════════════════════ */}
      {selectedUser && (
        <UserEditPanel
          user={selectedUser}
          institutions={institutions}
          onSaved={() => {
            void fetchUsers()
          }}
          onClose={() => setSelectedUsername(null)}
        />
      )}
    </div>
  )
}

/* ── Pending Registration Card ── */

function PendingCard({
  reg,
  loading: busy,
  onApprove,
  onReject,
}: {
  reg: PendingRegistration
  loading: boolean
  onApprove: () => void
  onReject: () => void
}) {
  const avatar = resolveCrewProfileAvatarUrl({
    gender: reg.profile.gender as CrewProfileData['gender'],
    profession: reg.profession,
    serviceAreas: reg.credentials.serviceAreas as CrewProfileData['serviceAreas'],
  })

  return (
    <div className={styles.pendingCard}>
      <div className={styles.pendingCardHeader}>
        <img src={avatar} alt={reg.displayName} className={styles.pendingAvatar} />
        <div className={styles.pendingCardBody}>
          <div className={styles.pendingName}>{reg.profile.fullName || reg.displayName}</div>
          <div className={styles.pendingMeta}>
            {reg.profession} &middot; {formatRole(reg.role)}
          </div>
        </div>
      </div>

      <div className={styles.pendingDetails}>
        <div>{reg.institution}</div>
        {reg.profile.degrees.length > 0 && <div>Gelar: {reg.profile.degrees.join(', ')}</div>}
        {reg.profile.jobTitles.length > 0 && <div>Jabatan: {reg.profile.jobTitles.join(', ')}</div>}
        {reg.credentials.serviceAreas.length > 0 && (
          <div>Layanan: {reg.credentials.serviceAreas.join(', ')}</div>
        )}
        {reg.credentials.employeeId && <div>NIP: {reg.credentials.employeeId}</div>}
        {reg.credentials.strNumber && <div>STR: {reg.credentials.strNumber}</div>}
        <div className={styles.pendingTimestamp}>Daftar: {timeAgo(reg.createdAt)}</div>
      </div>

      <div className={styles.pendingActions}>
        <button onClick={onApprove} disabled={busy} className={styles.primaryButtonBlock}>
          {busy ? '...' : 'Terima'}
        </button>
        <button onClick={onReject} disabled={busy} className={styles.secondaryButton}>
          Tolak
        </button>
      </div>
    </div>
  )
}

/* ── User Edit Panel ── */

function UserEditPanel({
  user,
  institutions,
  onSaved,
  onClose,
}: {
  user: UserRecord
  institutions: string[]
  onSaved: () => void
  onClose: () => void
}) {
  /* Auth fields */
  const [displayName, setDisplayName] = useState(user.displayName)
  const [email, setEmail] = useState(user.email || '')
  const [institution, setInstitution] = useState(user.institution || '')
  const [profession, setProfession] = useState(user.profession || '')
  const [role, setRole] = useState(user.role || '')

  /* Profile fields */
  const profile = user.profile
  const [fullName, setFullName] = useState(profile?.fullName || '')
  const [birthPlace, setBirthPlace] = useState(profile?.birthPlace || '')
  const [birthDate, setBirthDate] = useState(profile?.birthDate || '')
  const [gender, setGender] = useState(profile?.gender || '')
  const [domicile, setDomicile] = useState(profile?.domicile || '')
  const [bloodType, setBloodType] = useState(profile?.bloodType || '')
  const [degrees, setDegrees] = useState<string[]>(ensureStringArray(profile?.degrees))
  const [jobTitles, setJobTitles] = useState<string[]>(ensureStringArray(profile?.jobTitles))
  const [employeeId, setEmployeeId] = useState(profile?.employeeId || '')
  const [strNumber, setStrNumber] = useState(profile?.strNumber || '')
  const [sipNumber, setSipNumber] = useState(profile?.sipNumber || '')
  const [serviceAreas, setServiceAreas] = useState<string[]>(
    ensureStringArray(profile?.serviceAreas)
  )
  const [serviceAreaOther, setServiceAreaOther] = useState(profile?.serviceAreaOther || '')
  const [institutionAdditional, setInstitutionAdditional] = useState(
    profile?.institutionAdditional || ''
  )
  const [whatsappNumber, setWhatsappNumber] = useState(profile?.whatsappNumber || '')
  const [githubUrl, setGithubUrl] = useState(profile?.githubUrl || '')
  const [linkedinUrl, setLinkedinUrl] = useState(profile?.linkedinUrl || '')
  const [gravatarUrl, setGravatarUrl] = useState(profile?.gravatarUrl || '')
  const [blogUrl, setBlogUrl] = useState(profile?.blogUrl || '')
  const [instagramUrl, setInstagramUrl] = useState(profile?.instagramUrl || '')
  const [tiktokUrl, setTiktokUrl] = useState(profile?.tiktokUrl || '')
  const [youtubeUrl, setYoutubeUrl] = useState(profile?.youtubeUrl || '')

  /* UI state */
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [saveMsgOk, setSaveMsgOk] = useState(false)
  const [resetPwMode, setResetPwMode] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  const isInactive = (user.status || 'ACTIVE') === 'INACTIVE'

  /* Reset state only when switching to a different user */
  const prevUsername = useRef(user.username)
  useEffect(() => {
    if (prevUsername.current === user.username) return
    prevUsername.current = user.username
    setDisplayName(user.displayName)
    setEmail(user.email || '')
    setInstitution(user.institution || '')
    setProfession(user.profession || '')
    setRole(user.role || '')
    const p = user.profile
    setFullName(p?.fullName || '')
    setBirthPlace(p?.birthPlace || '')
    setBirthDate(p?.birthDate || '')
    setGender(p?.gender || '')
    setDomicile(p?.domicile || '')
    setBloodType(p?.bloodType || '')
    setDegrees(ensureStringArray(p?.degrees))
    setJobTitles(ensureStringArray(p?.jobTitles))
    setEmployeeId(p?.employeeId || '')
    setStrNumber(p?.strNumber || '')
    setSipNumber(p?.sipNumber || '')
    setServiceAreas(ensureStringArray(p?.serviceAreas))
    setServiceAreaOther(p?.serviceAreaOther || '')
    setInstitutionAdditional(p?.institutionAdditional || '')
    setWhatsappNumber(p?.whatsappNumber || '')
    setGithubUrl(p?.githubUrl || '')
    setLinkedinUrl(p?.linkedinUrl || '')
    setGravatarUrl(p?.gravatarUrl || '')
    setBlogUrl(p?.blogUrl || '')
    setInstagramUrl(p?.instagramUrl || '')
    setTiktokUrl(p?.tiktokUrl || '')
    setYoutubeUrl(p?.youtubeUrl || '')
    setSaveMsg('')
    setResetPwMode(false)
    setNewPassword('')
    setPwMsg('')
  }, [user])

  function showToast(msg: string, ok: boolean) {
    setSaveMsg(msg)
    setSaveMsgOk(ok)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    if (ok) {
      toastTimer.current = setTimeout(() => setSaveMsg(''), 4000)
    }
  }

  async function handleSaveAuth() {
    setSaving(true)
    setSaveMsg('')
    try {
      const res = await fetch(`/api/admin/users/${user.username}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          email,
          institution,
          profession,
          role,
        }),
      })
      const body = (await res.json()) as { ok: boolean; error?: string }
      if (!body.ok) {
        showToast(body.error || 'Gagal menyimpan.', false)
        return
      }
      showToast('Data akun berhasil disimpan.', true)
      onSaved()
    } catch {
      showToast('Gagal menyimpan.', false)
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveProfile() {
    setSaving(true)
    setSaveMsg('')
    try {
      const res = await fetch(`/api/admin/users/${user.username}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          birthPlace,
          birthDate,
          gender,
          domicile,
          bloodType,
          degrees,
          jobTitles,
          employeeId,
          strNumber,
          sipNumber,
          serviceAreas,
          serviceAreaOther,
          institutionAdditional,
          whatsappNumber,
          githubUrl,
          linkedinUrl,
          gravatarUrl,
          blogUrl,
          instagramUrl,
          tiktokUrl,
          youtubeUrl,
        }),
      })
      const body = (await res.json()) as { ok: boolean; error?: string }
      if (!body.ok) {
        showToast(body.error || 'Gagal menyimpan profil.', false)
        return
      }
      showToast('Data profil berhasil disimpan.', true)
      onSaved()
    } catch {
      showToast('Gagal menyimpan profil.', false)
    } finally {
      setSaving(false)
    }
  }

  async function handleResetPassword() {
    if (!newPassword || newPassword.length < 8) {
      setPwMsg('Password minimal 8 karakter.')
      return
    }
    setSaving(true)
    setPwMsg('')
    try {
      const res = await fetch(`/api/admin/users/${user.username}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      })
      const body = (await res.json()) as { ok: boolean; error?: string }
      if (!body.ok) {
        showToast(body.error || 'Gagal reset password.', false)
        return
      }
      showToast('Password berhasil direset.', true)
      setNewPassword('')
      setResetPwMode(false)
    } catch {
      setPwMsg('Gagal reset password.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteUser() {
    if (!confirm(`Hapus permanen user @${user.username}? Tindakan ini tidak dapat dibatalkan.`))
      return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/users/${user.username}/delete`, {
        method: 'DELETE',
      })
      const body = (await res.json()) as { ok: boolean; error?: string }
      if (!body.ok) {
        showToast(body.error || 'Gagal menghapus user.', false)
        return
      }
      onClose()
      onSaved()
    } catch {
      showToast('Gagal menghapus user.', false)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleStatus() {
    const action = isInactive ? 'reactivate' : 'deactivate'
    const label = isInactive ? 'mengaktifkan' : 'menonaktifkan'
    if (!isInactive && !confirm(`Nonaktifkan user ${user.username}?`)) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/users/${user.username}/${action}`, {
        method: 'POST',
      })
      const body = (await res.json()) as { ok: boolean; error?: string }
      if (!body.ok) {
        showToast(body.error || `Gagal ${label} user.`, false)
        return
      }
      showToast(isInactive ? 'User berhasil diaktifkan.' : 'User berhasil dinonaktifkan.', true)
      onSaved()
    } catch {
      showToast(`Gagal ${label} user.`, false)
    } finally {
      setSaving(false)
    }
  }

  function toggleArrayItem(
    arr: string[],
    item: string,
    setter: (v: string[]) => void,
    max?: number
  ) {
    if (arr.includes(item)) {
      setter(arr.filter((x) => x !== item))
    } else {
      if (max && arr.length >= max) return
      setter([...arr, item])
    }
  }

  return (
    <div className={styles.editPanel}>
      {/* ── Toast Banner ── */}
      {saveMsg && (
        <div
          className={cx(
            styles.toastBanner,
            saveMsgOk ? styles.toastBannerSuccess : styles.toastBannerError
          )}
        >
          <span
            className={cx(
              styles.toastMessage,
              saveMsgOk ? styles.toastMessageSuccess : styles.toastMessageError
            )}
          >
            {saveMsgOk ? <Check size={14} /> : <X size={14} />} {saveMsg}
          </span>
          <button onClick={() => setSaveMsg('')} className={styles.iconButton}>
            &times;
          </button>
        </div>
      )}

      {/* Panel Header */}
      <div className={styles.editPanelHeader}>
        <div>
          <span className={styles.panelSectionLabel}>Edit user</span>
          <span className={styles.panelUsername}>@{user.username}</span>
        </div>
        <button onClick={onClose} className={styles.closeButton}>
          &times;
        </button>
      </div>

      <div className={styles.editPanelGrid}>
        {/* ── Left Column: Auth Fields ── */}
        <div>
          <p className={styles.panelSectionLabelBlock}>Data akun</p>

          <div className={styles.formGrid}>
            <div>
              <label className={styles.fieldLabel}>Display name</label>
              <input
                className={styles.fieldInput}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                title="Display name user"
                aria-label="Display name user"
              />
            </div>
            <div>
              <label className={styles.fieldLabel}>Email</label>
              <input
                className={styles.fieldInput}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                title="Email user"
                aria-label="Email user"
              />
            </div>
            <div>
              <label className={styles.fieldLabel}>Institusi</label>
              <select
                className={styles.fieldSelect}
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                title="Institusi user"
                aria-label="Institusi user"
              >
                <option value="">-- Pilih --</option>
                {institutions.map((inst) => (
                  <option key={inst} value={inst}>
                    {inst}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={styles.fieldLabel}>Profesi</label>
              <select
                className={styles.fieldSelect}
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                title="Profesi user"
                aria-label="Profesi user"
              >
                <option value="">-- Pilih --</option>
                {CREW_ACCESS_PROFESSIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={styles.fieldLabel}>Role</label>
              <select
                className={styles.fieldSelect}
                value={role}
                onChange={(e) => setRole(e.target.value)}
                title="Role user"
                aria-label="Role user"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {formatRole(r)}
                  </option>
                ))}
              </select>
            </div>

            <button onClick={handleSaveAuth} disabled={saving} className={styles.primaryButtonWide}>
              {saving ? 'Menyimpan...' : 'Simpan akun'}
            </button>
          </div>

          {/* ── Actions ── */}
          <div className={styles.actionsSection}>
            <p className={styles.panelSectionLabelTight}>Aksi</p>

            {!resetPwMode ? (
              <button onClick={() => setResetPwMode(true)} className={styles.outlineButton}>
                Reset password
              </button>
            ) : (
              <div className={styles.passwordRow}>
                <input
                  type="password"
                  placeholder="Password baru (min 8)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={styles.fieldInput}
                />
                <button
                  onClick={handleResetPassword}
                  disabled={saving}
                  className={styles.outlineButtonCompact}
                >
                  Set
                </button>
                <button
                  onClick={() => {
                    setResetPwMode(false)
                    setNewPassword('')
                  }}
                  className={cx(styles.outlineButtonCompact, styles.outlineButtonMuted)}
                >
                  Batal
                </button>
              </div>
            )}
            {pwMsg && (
              <p
                className={cx(
                  styles.inlineMessage,
                  pwMsg.includes('berhasil')
                    ? styles.inlineMessageSuccess
                    : styles.inlineMessageError
                )}
              >
                {pwMsg}
              </p>
            )}

            <button
              onClick={handleToggleStatus}
              disabled={saving}
              className={cx(
                styles.outlineButton,
                isInactive ? styles.outlineButtonSuccess : styles.outlineButtonDanger
              )}
            >
              {isInactive ? 'Aktifkan user' : 'Nonaktifkan user'}
            </button>

            <button
              onClick={handleDeleteUser}
              disabled={saving}
              className={cx(styles.outlineButton, styles.outlineButtonDanger)}
              style={{ marginTop: 4, opacity: 0.75 }}
              title="Hapus user secara permanen dari sistem"
            >
              Hapus user permanen
            </button>
          </div>
        </div>

        {/* ── Right Column: Profile Fields ── */}
        <div>
          <p className={styles.panelSectionLabelBlock}>Data profil</p>

          <div className={styles.formGrid}>
            <div>
              <label className={styles.fieldLabel}>Nama lengkap</label>
              <input
                className={styles.fieldInput}
                value={fullName}
                data-tidy="name"
                onChange={(e) => setFullName(e.target.value)}
                title="Nama lengkap user"
                aria-label="Nama lengkap user"
              />
            </div>

            <div className={styles.twoColumnGrid}>
              <div>
                <label className={styles.fieldLabel}>Tempat lahir</label>
                <input
                  className={styles.fieldInput}
                  value={birthPlace}
                  onChange={(e) => setBirthPlace(e.target.value)}
                  title="Tempat lahir user"
                  aria-label="Tempat lahir user"
                />
              </div>
              <div>
                <label className={styles.fieldLabel}>Tanggal lahir</label>
                <input
                  className={styles.fieldInput}
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  title="Tanggal lahir user"
                  aria-label="Tanggal lahir user"
                />
              </div>
            </div>

            <div className={styles.twoColumnGrid}>
              <div>
                <label className={styles.fieldLabel}>Gender</label>
                <select
                  className={styles.fieldSelect}
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  title="Gender user"
                  aria-label="Gender user"
                >
                  <option value="">-- Pilih --</option>
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>
              <div>
                <label className={styles.fieldLabel}>Golongan darah</label>
                <select
                  className={styles.fieldSelect}
                  value={bloodType}
                  onChange={(e) => setBloodType(e.target.value)}
                  title="Golongan darah user"
                  aria-label="Golongan darah user"
                >
                  <option value="">-- Pilih --</option>
                  {CREW_PROFILE_BLOOD_TYPES.map((bt) => (
                    <option key={bt} value={bt}>
                      {bt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={styles.fieldLabel}>Domisili</label>
              <input
                className={styles.fieldInput}
                value={domicile}
                onChange={(e) => setDomicile(e.target.value)}
                title="Domisili user"
                aria-label="Domisili user"
              />
            </div>

            {/* Degrees -- chip toggle */}
            <div>
              <label className={styles.fieldLabel}>Gelar (maks {CREW_PROFILE_MAX_DEGREES})</label>
              <div className={styles.chipRow}>
                {CREW_PROFILE_DEGREES.map((d) => (
                  <ChipToggle
                    key={d}
                    label={d}
                    active={degrees.includes(d)}
                    onClick={() =>
                      toggleArrayItem(degrees, d, setDegrees, CREW_PROFILE_MAX_DEGREES)
                    }
                  />
                ))}
              </div>
            </div>

            {/* Job Titles -- grouped chip toggle */}
            <div>
              <label className={styles.fieldLabel}>
                Jabatan (maks {CREW_PROFILE_MAX_POSITIONS})
              </label>
              {jobTitles.length > 0 && (
                <div className={styles.selectedChips}>
                  {jobTitles.map((jt) => (
                    <span key={jt} className={styles.selectedChip}>
                      {jt}
                      <button
                        onClick={() => setJobTitles(jobTitles.filter((x) => x !== jt))}
                        className={styles.selectedChipButton}
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className={styles.selectorPanel}>
                <div>
                  <p className={styles.selectorGroupTitle}>Sentra</p>
                  <div className={styles.chipRow}>
                    {CREW_PROFILE_POSITIONS.filter((_, i) => i < 7).map((jt) => (
                      <ChipToggle
                        key={jt}
                        label={jt}
                        active={jobTitles.includes(jt)}
                        disabled={
                          !jobTitles.includes(jt) && jobTitles.length >= CREW_PROFILE_MAX_POSITIONS
                        }
                        onClick={() =>
                          toggleArrayItem(jobTitles, jt, setJobTitles, CREW_PROFILE_MAX_POSITIONS)
                        }
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <p className={styles.selectorGroupTitle}>Puskesmas</p>
                  <div className={styles.chipRow}>
                    {CREW_PROFILE_POSITIONS.filter((_, i) => i >= 7).map((jt) => (
                      <ChipToggle
                        key={jt}
                        label={jt}
                        active={jobTitles.includes(jt)}
                        disabled={
                          !jobTitles.includes(jt) && jobTitles.length >= CREW_PROFILE_MAX_POSITIONS
                        }
                        onClick={() =>
                          toggleArrayItem(jobTitles, jt, setJobTitles, CREW_PROFILE_MAX_POSITIONS)
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.threeColumnGrid}>
              <div>
                <label className={styles.fieldLabel}>NIP</label>
                <input
                  className={styles.fieldInput}
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  title="NIP user"
                  aria-label="NIP user"
                />
              </div>
              <div>
                <label className={styles.fieldLabel}>STR</label>
                <input
                  className={styles.fieldInput}
                  value={strNumber}
                  onChange={(e) => setStrNumber(e.target.value)}
                  title="STR user"
                  aria-label="STR user"
                />
              </div>
              <div>
                <label className={styles.fieldLabel}>SIP</label>
                <input
                  className={styles.fieldInput}
                  value={sipNumber}
                  onChange={(e) => setSipNumber(e.target.value)}
                  title="SIP user"
                  aria-label="SIP user"
                />
              </div>
            </div>

            {/* Service Areas -- chip toggle */}
            <div>
              <label className={styles.fieldLabel}>Area layanan</label>
              <div className={styles.chipRow}>
                {CREW_ACCESS_SERVICE_AREAS.map((sa) => (
                  <ChipToggle
                    key={sa}
                    label={sa}
                    active={serviceAreas.includes(sa)}
                    onClick={() => toggleArrayItem(serviceAreas, sa, setServiceAreas)}
                  />
                ))}
              </div>
              {serviceAreas.includes('Lainnya') && (
                <input
                  className={cx(styles.fieldInput, styles.topSpacing)}
                  placeholder="Sebutkan area layanan lainnya..."
                  value={serviceAreaOther}
                  onChange={(e) => setServiceAreaOther(e.target.value)}
                />
              )}
            </div>

            <div>
              <label className={styles.fieldLabel}>Institusi tambahan</label>
              <input
                className={styles.fieldInput}
                value={institutionAdditional}
                onChange={(e) => setInstitutionAdditional(e.target.value)}
                title="Institusi tambahan user"
                aria-label="Institusi tambahan user"
              />
            </div>

            <div>
              <label className={styles.fieldLabel}>WhatsApp aktif</label>
              <input
                className={styles.fieldInput}
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="+62 8xx xxxx xxxx"
              />
            </div>

            <div className={styles.twoColumnGrid}>
              <div>
                <label className={styles.fieldLabel}>GitHub</label>
                <input
                  className={styles.fieldInput}
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="github.com/username"
                />
              </div>
              <div>
                <label className={styles.fieldLabel}>LinkedIn</label>
                <input
                  className={styles.fieldInput}
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="linkedin.com/in/username"
                />
              </div>
            </div>

            <div className={styles.twoColumnGrid}>
              <div>
                <label className={styles.fieldLabel}>Gravatar</label>
                <input
                  className={styles.fieldInput}
                  value={gravatarUrl}
                  onChange={(e) => setGravatarUrl(e.target.value)}
                  placeholder="gravatar.com/username"
                />
              </div>
              <div>
                <label className={styles.fieldLabel}>Blog</label>
                <input
                  className={styles.fieldInput}
                  value={blogUrl}
                  onChange={(e) => setBlogUrl(e.target.value)}
                  placeholder="blog.drferdi.id"
                />
              </div>
            </div>

            <div className={styles.twoColumnGrid}>
              <div>
                <label className={styles.fieldLabel}>Instagram</label>
                <input
                  className={styles.fieldInput}
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="instagram.com/username"
                />
              </div>
              <div>
                <label className={styles.fieldLabel}>TikTok</label>
                <input
                  className={styles.fieldInput}
                  value={tiktokUrl}
                  onChange={(e) => setTiktokUrl(e.target.value)}
                  placeholder="tiktok.com/@username"
                />
              </div>
            </div>

            <div>
              <label className={styles.fieldLabel}>YouTube</label>
              <input
                className={styles.fieldInput}
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="youtube.com/@channel"
              />
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className={styles.primaryButtonWide}
            >
              {saving ? 'Menyimpan...' : 'Simpan profil'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Logbook Klinis (full width below 2-col grid) ── */}
      <LogbookSection username={user.username} />
    </div>
  )
}

/* ── Logbook Klinis Section ── */

interface LogbookEntry {
  id: string
  action: string
  endpoint: string
  result: string
  timestamp: string
}

function LogbookSection({ username }: { username: string }) {
  const [entries, setEntries] = useState<LogbookEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const pageSize = 5

  const fetchLogbook = useCallback(
    async (p: number) => {
      setLoading(true)
      try {
        const res = await fetch(
          `/api/admin/users/${username}/logbook?page=${p}&pageSize=${pageSize}`,
          { cache: 'no-store' }
        )
        if (!res.ok) return
        const data = (await res.json()) as {
          ok: boolean
          entries: LogbookEntry[]
          total: number
        }
        if (data.ok) {
          setEntries(data.entries)
          setTotal(data.total)
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false)
      }
    },
    [username]
  )

  useEffect(() => {
    void fetchLogbook(page)
  }, [page, fetchLogbook])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  function formatTime(iso: string): string {
    try {
      return new Date(iso).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return iso
    }
  }

  function resultBadgeClassName(r: string): string {
    if (r === 'success') return `${styles.resultBadge} ${styles.resultBadgeSuccess}`
    if (r === 'failure' || r === 'forbidden')
      return `${styles.resultBadge} ${styles.resultBadgeError}`
    return `${styles.resultBadge} ${styles.resultBadgeDefault}`
  }

  return (
    <div className={styles.logbookSection}>
      <p className={styles.logbookTitle}>Logbook klinis</p>

      {loading ? (
        <div className={styles.logbookLoading}>Memuat logbook...</div>
      ) : entries.length === 0 ? (
        <div className={styles.logbookEmpty}>Belum ada aktivitas klinis tercatat.</div>
      ) : (
        <>
          <table className={styles.logbookTable}>
            <thead>
              <tr className={styles.logbookHeaderRow}>
                <th className={styles.thCenter}>#</th>
                <th className={styles.thLeft}>Aksi</th>
                <th className={styles.thLeft}>Endpoint</th>
                <th className={styles.thCenter}>Status</th>
                <th className={styles.thRight}>Waktu</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={e.id} className={styles.logbookRow}>
                  <td className={styles.tdCenterMuted}>{(page - 1) * pageSize + i + 1}</td>
                  <td className={styles.tdDefault}>{e.action}</td>
                  <td className={styles.tdEndpoint}>{e.endpoint}</td>
                  <td className={styles.tdCenter}>
                    <span className={resultBadgeClassName(e.result)}>{sentenceCase(e.result)}</span>
                  </td>
                  <td className={styles.tdRightMuted}>{formatTime(e.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className={styles.paginationRow}>
            <span className={styles.paginationInfo}>
              {total} entri &middot; Halaman {page}/{totalPages}
            </span>
            <div className={styles.paginationActions}>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={cx(
                  styles.paginationButton,
                  page <= 1 && styles.paginationButtonDisabled
                )}
              >
                &laquo; Prev
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className={cx(
                  styles.paginationButton,
                  page >= totalPages && styles.paginationButtonDisabled
                )}
              >
                Next &raquo;
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/* ── Chip Toggle ── */

function ChipToggle({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string
  active: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cx(
        styles.chipToggle,
        active && styles.chipToggleActive,
        disabled && styles.chipToggleDisabled
      )}
    >
      {label}
    </button>
  )
}
