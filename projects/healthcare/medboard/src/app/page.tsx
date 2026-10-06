'use client'

import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

import { CREW_ACCESS_GENDERS, type CrewAccessGender } from '@/lib/crew-access'
import {
  CREW_PROFILE_BLOOD_TYPES,
  CREW_PROFILE_DEGREES,
  CREW_PROFILE_MAX_DEGREES,
  CREW_PROFILE_MAX_POSITIONS,
  CREW_PROFILE_SENTRA_ROLES,
  CREW_PROFILE_STRUCTURAL_POSITIONS,
  type CrewProfileData,
  type CrewProfileDegree,
  type CrewProfilePosition,
  createEmptyCrewProfile,
  resolveCrewRankBadgeSrc,
  resolveCrewSentraTitle,
  resolveCrewSentraTitles,
} from '@/lib/crew-profile'
import type { DevUpdateRecord } from '@/lib/dev-updates'
import { safeHref, safeUrl } from '@/lib/sanitize-url'

function calcAge(birthDate: string): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

const QUICK_LINKS = [
  {
    label: 'Satu Sehat',
    desc: 'Kemenkes',
    href: 'https://satusehat.kemkes.go.id/sdmk/dashboard',
    badge: 'KEMENKES',
  },
  {
    label: 'E-Rekam Medis',
    desc: 'EMR',
    href: 'https://kotakediri.epuskesmas.id/pelayanan?broadcastNotif=1',
    badge: 'EMR',
  },
  {
    label: 'P-Care BPJS',
    desc: 'BPJS',
    href: 'https://pcarejkn.bpjs-kesehatan.go.id/eclaim',
    badge: 'BPJS',
  },
]

/* ── Letta design tokens — theme-aware via CSS variables ── */
function useL() {
  return {
    bg: 'var(--bg-canvas)',
    bgPanel: 'var(--bg-card, #EDE4D9)',
    bgHero: 'linear-gradient(135deg, var(--bg-card, #EDE4D9) 0%, rgba(250,243,235,0.96) 100%)',
    bgHover: 'rgba(201,168,124,0.06)',
    border: 'var(--line-base)',
    borderAcc: 'rgba(201,168,124,0.5)',
    text: 'var(--text-main)',
    muted: 'var(--text-muted)',
    accent: 'var(--c-asesmen)',
    statusTone: '#101012',
    statusToneSoft: 'rgba(16,16,18,0.18)',
    signal: '#B89470',
    signalSoft: 'rgba(184,148,112,0.14)',
    mono: 'var(--font-mono)',
    sans: 'var(--font-sans)',
  }
}

type LTokens = ReturnType<typeof useL>

const Row = ({
  L,
  label,
  val,
  mono = false,
  accent = false,
}: {
  L: LTokens
  label: string
  val: string
  mono?: boolean
  accent?: boolean
}) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: '108px 1fr',
      gap: 10,
      padding: '6px 0',
      borderBottom: `1px solid ${L.border}`,
      alignItems: 'baseline',
    }}
  >
    <span style={{ fontSize: 14, color: L.muted, letterSpacing: '0.02em' }}>{label}</span>
    <span
      style={{
        fontSize: 14,
        color: accent ? L.accent : L.text,
        letterSpacing: mono ? '0.02em' : 0,
      }}
    >
      {val}
    </span>
  </div>
)

const SectionLabel = ({ L, children }: { L: LTokens; children: React.ReactNode }) => (
  <div
    style={{
      fontSize: 12,
      color: L.muted,
      marginBottom: 8,
    }}
  >
    {children}
  </div>
)

const Panel = ({
  L,
  children,
  style,
}: {
  L: LTokens
  children: React.ReactNode
  style?: React.CSSProperties
}) => (
  <div
    style={{
      background: L.bgPanel,
      border: `1px solid ${L.border}`,
      borderRadius: 4,
      overflow: 'hidden',
      ...style,
    }}
  >
    {children}
  </div>
)

const PanelSection = ({
  L,
  children,
  last = false,
}: {
  L: LTokens
  children: React.ReactNode
  last?: boolean
}) => (
  <div
    style={{
      padding: '12px 16px',
      borderBottom: last ? 'none' : `1px solid ${L.border}`,
    }}
  >
    {children}
  </div>
)

function getGreetingWord() {
  const h = new Date().getHours()
  if (h < 11) return 'Selamat pagi'
  if (h < 15) return 'Selamat siang'
  if (h < 18) return 'Selamat sore'
  return 'Selamat malam'
}

function getDisplayName(raw: string): string {
  if (!raw) return 'dokter'
  return raw
}

function useTypingEffect(text: string, speed = 40) {
  const [displayed, setDisplayed] = useState('')

  useEffect(() => {
    setDisplayed('')
    if (!text) return
    let i = 0
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      i++
      setDisplayed(text.slice(0, i))
      if (i < text.length) timer = setTimeout(tick, speed)
    }
    timer = setTimeout(tick, 300)
    return () => clearTimeout(timer)
  }, [text, speed])

  return displayed
}

const HERO_TABS = [
  'Ringkasan Hari Ini',
  'Agent Sentra',
  'Berita Kesehatan',
  'Assist Download',
  'Critical Mind',
]

function todayKey() {
  return new Date().toISOString().slice(0, 10) // "2026-03-02"
}

function loadAbsen(key: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(`absen_${key}_${todayKey()}`) === '1'
  } catch {
    return false
  }
}

type ProfileUser = {
  username: string
  displayName: string
  email: string
  institution: string
  profession: string
  role: string
}

type DevUpdateBoardRecord = Pick<
  DevUpdateRecord,
  'id' | 'title' | 'body' | 'category' | 'createdByName' | 'createdAt' | 'expiresAt'
>

type NotamBoardRecord = {
  id: string
  title: string
  body: string
  priority: 'info' | 'warning' | 'urgent'
  createdByName: string
  createdAt: string
  expiresAt: string | null
}

const PROFILE_LOAD_ERROR = 'Profil user belum dapat dimuat.'
type OnlineUser = {
  userId: string
  name: string
  role: string
  profession: string
  institution: string
}

function formatBirthDate(value: string): string {
  if (!value) return 'Belum diisi'
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return 'Belum diisi'
  return parsed.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function maskCredential(value: string): string {
  if (!value) return 'BELUM DIISI'
  if (value.length <= 10) return value
  return `${value.slice(0, 8)}/••••••••/${value.slice(-4)}`
}

function formatBadgeList(values: string[]): string[] {
  return values.filter(Boolean)
}

function formatRoleLabel(value: string | undefined): string {
  return value ? value.replace(/_/g, ' ') : 'Belum diatur'
}

function formatBoardDateTime(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }
  return parsed.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function sortBoardByLatest<T extends { createdAt: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

function getDevUpdateCategoryLabel(category: DevUpdateBoardRecord['category']): string {
  switch (category) {
    case 'release':
      return 'Release'
    case 'maintenance':
      return 'Maintenance'
    default:
      return 'Improvement'
  }
}

function getNotamPriorityLabel(priority: NotamBoardRecord['priority']): string {
  switch (priority) {
    case 'urgent':
      return 'Urgent'
    case 'warning':
      return 'Warning'
    default:
      return 'Info'
  }
}

function shouldShowBoardExpand(text: string): boolean {
  return text.trim().length > 120
}

type OfficialLinkLogo = {
  label: string
  iconSrc: string
  href: string
}

function normalizeWhatsappHref(value: string): string {
  const digits = value.replace(/[^\d]/g, '')
  return digits ? `https://wa.me/${digits}` : ''
}

export default function ProfilUserPage() {
  const L = useL()
  const solidStatusBadgeStyle: React.CSSProperties = {
    fontSize: 14,
    color: '#ffffff',
    background: L.statusTone,
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 3,
    padding: '6px 12px',
    boxShadow: '3px 3px 10px rgba(0,0,0,0.24), inset 1px 1px 0 rgba(255,255,255,0.04)',
  }

  const [absenApel, setAbsenApel] = useState(false)
  const [absenSiparwa, setAbsenSiparwa] = useState(false)

  useEffect(() => {
    setAbsenApel(loadAbsen('apel'))
    setAbsenSiparwa(loadAbsen('siparwa'))
  }, [])

  const [crewName, setCrewName] = useState('')
  const [sessionUser, setSessionUser] = useState<ProfileUser | null>(null)
  const [profile, setProfile] = useState<CrewProfileData>(createEmptyCrewProfile())
  const [profileDraft, setProfileDraft] = useState<CrewProfileData>(createEmptyCrewProfile())
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaveMessage, setProfileSaveMessage] = useState('')
  const [isProfileEditorOpen, setIsProfileEditorOpen] = useState(false)
  const [selectedDegreeOption, setSelectedDegreeOption] = useState('')
  const [selectedSentraRoleOption, setSelectedSentraRoleOption] = useState('')
  const [selectedStructuralPositionOption, setSelectedStructuralPositionOption] = useState('')
  const [activeTab, setActiveTab] = useState(0)
  const [heroExpanded, setHeroExpanded] = useState(false)
  const [chatHeight, setChatHeight] = useState(260)
  const dragRef = useRef<{ startY: number; startH: number } | null>(null)
  const dragCleanupRef = useRef<(() => void) | null>(null)
  const [news, setNews] = useState<
    {
      title: string
      link: string
      pubDate: string
      source: string
      description?: string
    }[]
  >([])
  const [newsLoading, setNewsLoading] = useState(false)
  const [devUpdates, setDevUpdates] = useState<DevUpdateBoardRecord[]>([])
  const [notams, setNotams] = useState<NotamBoardRecord[]>([])
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [boardLoading, setBoardLoading] = useState(true)
  const [boardError, setBoardError] = useState('')
  const [expandedBoardItems, setExpandedBoardItems] = useState<Set<string>>(() => new Set())
  const onlineSocketRef = useRef<Socket | null>(null)

  // Logbook klinis state
  type LogbookRow = {
    id: string
    pasien: string
    diagnosis: string
    tanggal: string
  }
  const [logbookRows, setLogbookRows] = useState<LogbookRow[]>([])

  // Chat state
  type ChatMsg = { id: number; role: 'user' | 'assistant'; content: string }
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState('')
  const chatScrollRef = useRef<HTMLDivElement>(null)
  const chatIdCounter = useRef(0)

  useEffect(() => {
    let alive = true
    setProfileLoading(true)
    fetch('/api/auth/profile', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { user?: ProfileUser; profile?: CrewProfileData } | null) => {
        if (!alive) return
        setSessionUser(d?.user ?? null)
        setCrewName(d?.profile?.fullName || d?.user?.displayName || '')
        setProfile(d?.profile ?? createEmptyCrewProfile())
        setProfileDraft(d?.profile ?? createEmptyCrewProfile())
        setProfileError(d ? '' : PROFILE_LOAD_ERROR)
      })
      .catch(() => {
        if (!alive) return
        setProfileError(PROFILE_LOAD_ERROR)
      })
      .finally(() => {
        if (!alive) return
        setProfileLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  // Fetch logbook klinis after crewName is set
  useEffect(() => {
    if (!crewName) return
    fetch(`/api/report/clinical?dokter=${encodeURIComponent(crewName)}&limit=5`)
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          d: {
            ok?: boolean
            reports?: {
              id: string
              pasien?: { nama?: string }
              asesmen?: { diagnosisKerja?: string }
              createdAt?: string
            }[]
          } | null
        ) => {
          if (!d?.ok || !d.reports) return
          setLogbookRows(
            d.reports.map((r) => ({
              id: r.id,
              pasien: r.pasien?.nama ?? '-',
              diagnosis: r.asesmen?.diagnosisKerja ?? '-',
              tanggal: r.createdAt
                ? new Date(r.createdAt).toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : '-',
            }))
          )
        }
      )
      .catch(() => {
        /* silent */
      })
  }, [crewName])

  useEffect(() => {
    if (activeTab !== 2) return
    let alive = true
    setNewsLoading(true)
    fetch('/api/news')
      .then((r) => r.json())
      .then(
        (d: {
          items: {
            title: string
            link: string
            pubDate: string
            source: string
            description?: string
          }[]
        }) => {
          if (!alive) return
          setNews(d.items ?? [])
          setNewsLoading(false)
        }
      )
      .catch(() => {
        if (!alive) return
        setNewsLoading(false)
      })
    return () => {
      alive = false
    }
  }, [activeTab])

  useEffect(() => {
    let alive = true
    setBoardLoading(true)
    setBoardError('')

    Promise.allSettled([
      fetch('/api/dev-updates/active', { cache: 'no-store' }).then((response) =>
        response.ok ? response.json() : null
      ),
      fetch('/api/notam/active', { cache: 'no-store' }).then((response) =>
        response.ok ? response.json() : null
      ),
    ])
      .then((results) => {
        if (!alive) return

        const updatesPayload =
          results[0].status === 'fulfilled'
            ? (results[0].value as {
                ok?: boolean
                updates?: DevUpdateBoardRecord[]
              } | null)
            : null
        const notamsPayload =
          results[1].status === 'fulfilled'
            ? (results[1].value as {
                ok?: boolean
                notams?: NotamBoardRecord[]
              } | null)
            : null

        setDevUpdates(updatesPayload?.ok ? (updatesPayload.updates ?? []) : [])
        setNotams(notamsPayload?.ok ? (notamsPayload.notams ?? []) : [])

        if (!updatesPayload?.ok && !notamsPayload?.ok) {
          setBoardError('Board operasional belum dapat dimuat.')
        }
      })
      .catch(() => {
        if (!alive) return
        setBoardError('Board operasional belum dapat dimuat.')
      })
      .finally(() => {
        if (!alive) return
        setBoardLoading(false)
      })

    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    const el = chatScrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [chatMessages, chatLoading])

  useEffect(() => {
    if (!sessionUser) return

    // Track dashboard usage
    void fetch('/api/track-usage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'dashboard' }),
    }).catch(() => {
      // Silent fail
    })

    const socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    })
    onlineSocketRef.current = socket

    socket.on('connect', () => {
      socket.emit('user:join', {
        userId: sessionUser.username,
        name: profile.fullName || sessionUser.displayName,
        role: sessionUser.role,
        profession: sessionUser.profession,
        institution: sessionUser.institution,
      })
    })

    socket.on('users:online', (users: OnlineUser[]) => {
      setOnlineUsers(users)
    })

    return () => {
      socket.disconnect()
      if (onlineSocketRef.current === socket) {
        onlineSocketRef.current = null
      }
    }
  }, [profile.fullName, sessionUser])

  async function sendChat() {
    const text = chatInput.trim()
    if (!text || chatLoading) return
    setChatInput('')
    setChatError('')
    const userMsg: ChatMsg = {
      id: ++chatIdCounter.current,
      role: 'user',
      content: text,
    }
    const newMessages: ChatMsg[] = [...chatMessages, userMsg]
    setChatMessages(newMessages)
    setChatLoading(true)
    try {
      const res = await fetch('/api/perplexity', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })
      const data = (await res.json()) as {
        ok: boolean
        reply?: string
        error?: string
      }
      if (!data.ok) {
        setChatError(data.error ?? 'Gagal mendapat respons.')
      } else {
        const asstMsg: ChatMsg = {
          id: ++chatIdCounter.current,
          role: 'assistant',
          content: data.reply ?? '',
        }
        setChatMessages([...newMessages, asstMsg])
      }
    } catch {
      setChatError('Tidak dapat terhubung ke server.')
    } finally {
      setChatLoading(false)
    }
  }

  function toggleBoardItem(id: string) {
    setExpandedBoardItems((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function resetProfileSelectionInputs() {
    setSelectedDegreeOption('')
    setSelectedSentraRoleOption('')
    setSelectedStructuralPositionOption('')
  }

  function addProfileDegree(degree: CrewProfileDegree) {
    setProfileDraft((current) => ({
      ...current,
      degrees: current.degrees.includes(degree)
        ? current.degrees
        : [...current.degrees, degree].slice(0, CREW_PROFILE_MAX_DEGREES),
    }))
  }

  function removeProfileDegree(degree: CrewProfileDegree) {
    setProfileDraft((current) => ({
      ...current,
      degrees: current.degrees.filter((item) => item !== degree),
    }))
  }

  function addProfileJobTitle(jobTitle: CrewProfilePosition) {
    setProfileDraft((current) => {
      if (current.jobTitles.includes(jobTitle)) {
        return current
      }

      if (current.jobTitles.length >= CREW_PROFILE_MAX_POSITIONS) {
        return current
      }

      return {
        ...current,
        jobTitles: [...current.jobTitles, jobTitle],
      }
    })
  }

  function removeProfileJobTitle(jobTitle: CrewProfilePosition) {
    setProfileDraft((current) => ({
      ...current,
      jobTitles: current.jobTitles.filter((item) => item !== jobTitle),
    }))
  }

  async function saveProfile() {
    setProfileError('')
    setProfileSaveMessage('')
    setProfileSaving(true)

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileDraft),
      })

      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean
        error?: string
        profile?: CrewProfileData
      } | null
      if (!response.ok || !payload?.ok || !payload.profile) {
        setProfileError(payload?.error || 'Profil gagal disimpan.')
        return
      }

      setProfile(payload.profile)
      setProfileDraft(payload.profile)
      setCrewName(payload.profile.fullName || sessionUser?.displayName || '')
      setProfileSaveMessage('Profil berhasil diperbarui.')
      resetProfileSelectionInputs()
      setIsProfileEditorOpen(false)
    } catch {
      setProfileError('Tidak dapat terhubung ke server profil.')
    } finally {
      setProfileSaving(false)
    }
  }

  // Cleanup drag listeners on unmount
  useEffect(() => {
    return () => {
      dragCleanupRef.current?.()
    }
  }, [])

  function onResizeMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    dragRef.current = { startY: e.clientY, startH: chatHeight }
    function onMove(ev: MouseEvent) {
      if (!dragRef.current) return
      const delta = ev.clientY - dragRef.current.startY
      setChatHeight(Math.max(200, Math.min(1200, dragRef.current.startH + delta)))
    }
    function onUp() {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      dragCleanupRef.current = null
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    dragCleanupRef.current = onUp
  }

  function escapeHtml(html: string): string {
    return html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  function renderMarkdown(text: string): string {
    return (
      escapeHtml(text)
        // strip bracket tags like [identitas tetap]
        .replace(/\[[^\]]*\]/g, '')
        // bold **text**
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // italic *text*
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // inline code `text`
        .replace(
          /`([^`]+)`/g,
          '<code style="font-family:var(--font-mono);background:rgba(255,255,255,0.08);padding:1px 5px;border-radius:3px;font-size: 14px">$1</code>'
        )
        // newline → <br>
        .replace(/\n/g, '<br>')
    )
  }

  // Defense-in-depth: strip any tags not in our known-safe allowlist.
  // renderMarkdown only produces strong, em, code, and br — all other tags
  // are blocked here even though escapeHtml() already prevents injection.
  function sanitizeRenderedMarkdown(html: string): string {
    return html.replace(/<(?!\/?(?:strong|em|code|br)(?:\s|\/?>))[^>]*>/gi, '')
  }

  const greetWord = getGreetingWord()
  const displayName = getDisplayName(crewName || sessionUser?.displayName || '')
  const fullGreet = `${greetWord}, ${displayName}`
  const typedGreet = useTypingEffect(fullGreet, 38)
  const age = profile.birthDate ? calcAge(profile.birthDate) : null
  const profileName = profile.fullName || sessionUser?.displayName || 'Crew User'
  const degreeBadges = formatBadgeList(profile.degrees)
  const positionBadges = resolveCrewSentraTitles(profile.jobTitles, sessionUser?.role)
  const positionSectionBadges = positionBadges.filter(
    (title) => title !== 'Chief Executive Officer'
  )
  const roleLabel = formatRoleLabel(sessionUser?.role)
  const professionLabel = sessionUser?.profession || 'Belum diatur'
  const isAdminDashboardUser =
    sessionUser?.role === 'CEO' ||
    sessionUser?.role === 'CHIEF_EXECUTIVE_OFFICER' ||
    sessionUser?.role === 'ADMINISTRATOR'
  const rankBadgeSrc = resolveCrewRankBadgeSrc(sessionUser?.role, profile.jobTitles)
  const sentraTitle = resolveCrewSentraTitle(profile.jobTitles, sessionUser?.role)
  const chatUserAvatarSrc = profile.avatarUrl || '/avatar.png'
  const chatAssistantAvatarSrc = '/audrey.png'
  const statusOperasionalActive = absenApel || absenSiparwa
  const visiblePositionBadges = isAdminDashboardUser ? positionSectionBadges : []
  const profileHeroStats = isAdminDashboardUser
    ? [
        { label: 'Role Sentra', value: sentraTitle },
        { label: 'Profesi', value: professionLabel },
      ]
    : [{ label: 'Profesi', value: professionLabel }]
  const officialWhatsappHref = normalizeWhatsappHref(profile.whatsappNumber)
  const officialEmailHref = sessionUser?.email ? `mailto:${sessionUser.email}` : ''
  const officialLinkLogos = [
    {
      label: 'GitHub',
      iconSrc: '/social/github.svg',
      href: profile.githubUrl,
    },
    {
      label: 'LinkedIn',
      iconSrc: '/social/linkedin.svg',
      href: profile.linkedinUrl,
    },
    {
      label: 'Gravatar',
      iconSrc: '/social/gravatar.svg',
      href: profile.gravatarUrl,
    },
    {
      label: 'Blog',
      iconSrc: '/social/blog.svg',
      href: profile.blogUrl,
    },
    {
      label: 'Instagram',
      iconSrc: '/social/instagram.svg',
      href: profile.instagramUrl,
    },
    {
      label: 'TikTok',
      iconSrc: '/social/tiktok.svg',
      href: profile.tiktokUrl,
    },
    {
      label: 'YouTube',
      iconSrc: '/social/youtube.svg',
      href: profile.youtubeUrl,
    },
    {
      label: 'WhatsApp',
      iconSrc: '/social/whatsapp.svg',
      href: officialWhatsappHref,
    },
    {
      label: 'Email',
      iconSrc: '/social/email.svg',
      href: officialEmailHref,
    },
  ] satisfies OfficialLinkLogo[]
  const visibleDevUpdates = sortBoardByLatest(devUpdates).slice(0, 1)
  const visibleNotams = sortBoardByLatest(notams).slice(0, 1)
  const visibleNews = news.slice(0, 1)
  const uniqueOnlineUsers = onlineUsers.filter(
    (user, index, array) => array.findIndex((item) => item.userId === user.userId) === index
  )
  const onlineRoster = [...uniqueOnlineUsers].sort((left, right) => {
    if (left.userId === sessionUser?.username) return -1
    if (right.userId === sessionUser?.username) return 1
    return left.name.localeCompare(right.name, 'id-ID')
  })
  const selectedSentraRoles = profileDraft.jobTitles.filter(
    (jobTitle): jobTitle is (typeof CREW_PROFILE_SENTRA_ROLES)[number] =>
      CREW_PROFILE_SENTRA_ROLES.includes(jobTitle as (typeof CREW_PROFILE_SENTRA_ROLES)[number])
  )
  const selectedStructuralPositions = profileDraft.jobTitles.filter(
    (jobTitle): jobTitle is (typeof CREW_PROFILE_STRUCTURAL_POSITIONS)[number] =>
      CREW_PROFILE_STRUCTURAL_POSITIONS.includes(
        jobTitle as (typeof CREW_PROFILE_STRUCTURAL_POSITIONS)[number]
      )
  )
  const hasScrollableOnlineRoster = onlineRoster.length > 5
  const hasScrollableLogbook = logbookRows.length > 5
  const statusSnapshot = [
    {
      label: 'Status Operasional Sentra',
      value: statusOperasionalActive ? 'Siap operasional' : 'Menunggu aktivasi operasional',
      isActive: statusOperasionalActive,
    },
    {
      label: 'SenAuto Session',
      value: heroExpanded ? 'Aktif di dashboard' : 'Standby',
      isActive: heroExpanded,
    },
    {
      label: 'Akses EMR',
      value: sessionUser?.institution ? 'Siap dibuka' : 'Perlu verifikasi akun',
      isActive: Boolean(sessionUser?.institution),
    },
  ]
  const statusHariIniSection = (
    <div style={{ width: '100%', marginTop: 12 }}>
      <SectionLabel L={L}>Status Hari Ini</SectionLabel>
      <div
        style={{
          border: `1px solid ${L.border}`,
          borderRadius: 8,
          background: L.bgPanel,
          overflow: 'hidden',
        }}
      >
        {statusSnapshot.map((statusItem, index) => (
          <div
            key={statusItem.label}
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(110px, 148px) minmax(0, 1fr) auto',
              alignItems: 'center',
              gap: 12,
              padding: '11px 16px',
              minHeight: 48,
              borderBottom: index === statusSnapshot.length - 1 ? 'none' : `1px solid ${L.border}`,
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: L.muted,
              }}
            >
              {statusItem.label}
            </span>
            <span
              style={{
                fontSize: 14,
                color: L.text,
                lineHeight: 1.35,
                textAlign: 'right',
                overflowWrap: 'anywhere',
              }}
            >
              {statusItem.value}
            </span>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: statusItem.isActive ? L.statusTone : 'var(--c-warning)',
                boxShadow: 'none',
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )

  const logbookKlinisSection = (
    <div style={{ width: '100%', marginTop: 12 }}>
      <SectionLabel L={L}>Logbook Klinis</SectionLabel>
      <div
        style={{
          border: `1px solid ${L.border}`,
          borderRadius: 8,
          background: L.bgPanel,
          overflow: 'hidden',
        }}
      >
        {logbookRows.length === 0 ? (
          <div
            style={{
              padding: '18px 16px',
              fontSize: 14,
              color: L.muted,
              letterSpacing: '0.04em',
              textAlign: 'center',
            }}
          >
            Belum ada laporan klinis
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '36px minmax(0,1fr) minmax(0,1.2fr) 90px',
                gap: 8,
                padding: '8px 16px',
                borderBottom: `1px solid ${L.border}`,
              }}
            >
              {['No', 'Pasien', 'Diagnosis', 'Tanggal'].map((h) => (
                <span
                  key={h}
                  style={{
                    fontSize: 12,
                    color: L.muted,
                  }}
                >
                  {h}
                </span>
              ))}
            </div>
            <div
              className={hasScrollableLogbook ? 'who-online-scroll' : undefined}
              style={{
                maxHeight: hasScrollableLogbook ? 230 : undefined,
                overflowY: hasScrollableLogbook ? 'auto' : 'visible',
                paddingRight: hasScrollableLogbook ? 4 : 0,
              }}
            >
              {logbookRows.map((row, idx) => (
                <a
                  key={row.id}
                  href={`/report/clinical?id=${row.id}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '36px minmax(0,1fr) minmax(0,1.2fr) 90px',
                    gap: 8,
                    padding: '10px 16px',
                    borderBottom: idx === logbookRows.length - 1 ? 'none' : `1px solid ${L.border}`,
                    textDecoration: 'none',
                    color: L.text,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = L.bgHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontSize: 14, color: L.muted }}>{idx + 1}</span>
                  <span
                    style={{
                      fontSize: 14,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {row.pasien}
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {row.diagnosis}
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      color: L.muted,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {row.tanggal}
                  </span>
                </a>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 1200,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
      }}
    >
      {profileLoading ? (
        <div
          style={{
            marginBottom: 16,
            fontSize: 14,
            color: L.muted,
            letterSpacing: '0.04em',
          }}
        >
          MEMUAT PROFIL USER...
        </div>
      ) : null}

      {!profileLoading && profileError && !isProfileEditorOpen ? (
        <div style={{ marginBottom: 16, fontSize: 14, color: 'var(--c-critical)' }}>
          {profileError}
        </div>
      ) : null}

      {profileSaveMessage && !isProfileEditorOpen ? (
        <div style={{ marginBottom: 16, fontSize: 14, color: L.accent }}>{profileSaveMessage}</div>
      ) : null}

      {/* ── SVG Frame — pojok kanan atas ── */}
      <style>{`
        .svg-frame {
          position: fixed;
          top: 12px;
          right: 20px;
          width: 80px;
          height: 80px;
          transform-style: preserve-3d;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 50;
          cursor: pointer;
        }
        .svg-frame svg {
          position: absolute;
          transition: .5s;
          z-index: calc(1 - (0.2 * var(--j)));
          transform-origin: center;
          width: 92px;
          height: 92px;
          fill: none;
        }
        .svg-frame:hover svg {
          transform: rotate(-80deg) skew(30deg) translateX(calc(12px * var(--i))) translateY(calc(-9px * var(--i)));
        }
        .svg-frame svg #center { transition: .5s; transform-origin: center; }
        .svg-frame:hover svg #center { transform: rotate(-30deg) translateX(12px) translateY(-1px); }
        #out2  { animation: svgRotate 7s ease-in-out infinite alternate; transform-origin: center; }
        #out3  { animation: svgRotate 3s ease-in-out infinite alternate; transform-origin: center; stroke: ${L.signal}; }
        #inner3, #inner1 { animation: svgRotate 4s ease-in-out infinite alternate; transform-origin: center; }
        #center1 { fill: ${L.signal}; animation: svgRotate 2s ease-in-out infinite alternate; transform-origin: center; }
        @keyframes svgRotate { to { transform: rotate(360deg); } }
      `}</style>

      <div className="svg-frame">
        <svg style={{ ['--i' as string]: 0, ['--j' as string]: 0 }}>
          <g id="out1">
            <path d="M72 172C72 116.772 116.772 72 172 72C227.228 72 272 116.772 272 172C272 227.228 227.228 272 172 272C116.772 272 72 227.228 72 172ZM197.322 172C197.322 158.015 185.985 146.678 172 146.678C158.015 146.678 146.678 158.015 146.678 172C146.678 185.985 158.015 197.322 172 197.322C185.985 197.322 197.322 185.985 197.322 172Z"></path>
            <path
              strokeMiterlimit="16"
              strokeWidth="2"
              stroke={L.signal}
              d="M72 172C72 116.772 116.772 72 172 72C227.228 72 272 116.772 272 172C272 227.228 227.228 272 172 272C116.772 272 72 227.228 72 172ZM197.322 172C197.322 158.015 185.985 146.678 172 146.678C158.015 146.678 146.678 158.015 146.678 172C146.678 185.985 158.015 197.322 172 197.322C185.985 197.322 197.322 185.985 197.322 172Z"
            ></path>
          </g>
        </svg>

        <svg style={{ ['--i' as string]: 1, ['--j' as string]: 1 }}>
          <g id="out2">
            <path
              fill={L.signal}
              d="M102.892 127.966L105.579 123.75L101.362 121.063L98.6752 125.28L102.892 127.966ZM90.2897 178.19L85.304 178.567L85.6817 183.553L90.6674 183.175L90.2897 178.19ZM94.3752 177.88L94.7529 182.866L99.7386 182.488L99.3609 177.503L94.3752 177.88ZM106.347 130.168L110.564 132.855L113.251 128.638L109.034 125.951L106.347 130.168ZM93.3401 194.968L91.9387 190.168L87.1391 191.569L88.5405 196.369L93.3401 194.968ZM122.814 237.541L119.813 241.54L123.812 244.541L126.813 240.542L122.814 237.541ZM125.273 234.264L129.272 237.265L132.273 233.266L128.274 230.265L125.273 234.264ZM97.2731 193.819L102.073 192.418L100.671 187.618L95.8717 189.02L97.2731 193.819ZM152.707 92.3592L157.567 91.182L156.389 86.3226L151.53 87.4998L152.707 92.3592ZM119.097 109.421L115.869 105.603L112.05 108.831L115.278 112.649L119.097 109.421ZM121.742 112.55L117.924 115.778L121.152 119.596L124.97 116.368L121.742 112.55ZM153.672 96.3413L154.849 101.201L159.708 100.023L158.531 95.1641L153.672 96.3413ZM253.294 161.699L258.255 161.07L257.626 156.11L252.666 156.738L253.294 161.699ZM247.59 203.639L245.66 208.251L250.272 210.182L252.203 205.569L247.59 203.639ZM243.811 202.057L239.198 200.126L237.268 204.739L241.88 206.669L243.811 202.057ZM249.23 162.214L248.601 157.253L243.641 157.882L244.269 162.842L249.23 162.214ZM172 90.0557V85.0557H167V90.0557H172ZM208.528 98.6474L206.299 103.123L206.299 103.123L208.528 98.6474ZM237.396 122.621L240.409 126.611L244.399 123.598L241.386 119.608L237.396 122.621ZM234.126 125.09L230.136 128.103L233.149 132.093L237.139 129.08L234.126 125.09ZM206.701 102.315L204.473 106.791L204.473 106.791L206.701 102.315ZM172 94.1529H167V99.1529H172V94.1529ZM244.195 133.235L248.601 130.87L246.235 126.465L241.83 128.83L244.195 133.235ZM250.83 149.623L252.195 154.433L257.005 153.067L255.64 148.257L250.83 149.623ZM246.888 150.742L242.078 152.107L243.444 156.917L248.254 155.552L246.888 150.742ZM240.586 135.174L238.22 130.768L233.815 133.134L236.181 137.539L240.586 135.174ZM234.238 225.304L238.036 228.556L241.288 224.759L237.491 221.506L234.238 225.304ZM195.159 250.604L196.572 255.4L196.572 255.4L195.159 250.604ZM148.606 250.534L143.814 249.107L142.386 253.899L147.178 255.326L148.606 250.534ZM149.775 246.607L151.203 241.816L146.411 240.388L144.983 245.18L149.775 246.607ZM194.001 246.674L195.415 251.47L195.415 251.47L194.001 246.674ZM231.126 222.639L234.379 218.841L230.581 215.589L227.329 219.386L231.126 222.639Z"
            ></path>
          </g>
        </svg>

        <svg style={{ ['--i' as string]: 0, ['--j' as string]: 2 }}>
          <g id="inner3">
            <path
              fill={L.signal}
              d="M195.351 135.352C188.265 130.836 180.022 128.473 171.62 128.546L171.627 129.346C179.874 129.274 187.966 131.594 194.921 136.026L195.351 135.352ZM171.62 128.546C163.218 128.619 155.018 131.127 148.011 135.765L148.453 136.432C155.33 131.88 163.38 129.418 171.627 129.346L171.62 128.546ZM147.899 136.32L148.086 136.603L148.753 136.161L148.566 135.878L147.899 136.32ZM194.921 207.974C187.966 212.406 179.874 214.726 171.627 214.654L171.62 215.454C180.022 215.527 188.265 213.163 195.351 208.648L194.921 207.974ZM171.627 214.654C163.38 214.582 155.33 212.12 148.453 207.567L148.011 208.234C155.018 212.873 163.218 215.38 171.62 215.454L171.627 214.654ZM148.566 208.122L148.753 207.838L148.086 207.397L147.899 207.68L148.566 208.122Z"
            ></path>
          </g>
          <path
            stroke={L.signal}
            d="M240.944 172C240.944 187.951 235.414 203.408 225.295 215.738C215.176 228.068 201.095 236.508 185.45 239.62C169.806 242.732 153.567 240.323 139.5 232.804C125.433 225.285 114.408 213.12 108.304 198.384C102.2 183.648 101.394 167.25 106.024 151.987C110.654 136.723 120.434 123.537 133.696 114.675C146.959 105.813 162.884 101.824 178.758 103.388C194.632 104.951 209.472 111.97 220.751 123.249"
            id="out3"
          ></path>
        </svg>

        <svg style={{ ['--i' as string]: 1, ['--j' as string]: 3 }}>
          <g id="inner1">
            <path
              fill={L.signal}
              d="M145.949 124.51L148.554 129.259C156.575 124.859 165.672 122.804 174.806 123.331C183.94 123.858 192.741 126.944 200.203 132.236C207.665 137.529 213.488 144.815 217.004 153.261C220.521 161.707 221.59 170.972 220.09 179.997L229.537 181.607C230.521 175.715 230.594 169.708 229.753 163.795L225.628 164.381C224.987 159.867 223.775 155.429 222.005 151.179C218.097 141.795 211.628 133.699 203.337 127.818C195.045 121.937 185.266 118.508 175.118 117.923C165.302 117.357 155.525 119.474 146.83 124.037C146.535 124.192 146.241 124.349 145.949 124.51Z"
              clipRule="evenodd"
              fillRule="evenodd"
            ></path>
            <path
              fill={L.signal}
              d="M139.91 220.713C134.922 217.428 130.469 213.395 126.705 208.758L134.148 202.721C141.342 211.584 151.417 217.642 162.619 219.839C173.821 222.036 185.438 220.232 195.446 214.742L198.051 219.491C186.252 225.693 173.696 227.531 161.577 225.154C154.613 223.789 148.041 221.08 142.202 217.234L139.91 220.713Z"
              clipRule="evenodd"
              fillRule="evenodd"
            ></path>
          </g>
        </svg>

        <svg style={{ ['--i' as string]: 2, ['--j' as string]: 4 }}>
          <path
            fill={L.signal}
            d="M180.956 186.056C183.849 184.212 186.103 181.521 187.41 178.349C188.717 175.177 189.013 171.679 188.258 168.332C187.503 164.986 185.734 161.954 183.192 159.65C180.649 157.346 177.458 155.883 174.054 155.46C170.649 155.038 167.197 155.676 164.169 157.288C161.14 158.9 158.683 161.407 157.133 164.468C155.582 167.528 155.014 170.992 155.505 174.388C155.997 177.783 157.524 180.944 159.879 183.439L161.129 182.259C159.018 180.021 157.648 177.186 157.207 174.141C156.766 171.096 157.276 167.989 158.667 165.245C160.057 162.5 162.261 160.252 164.977 158.806C167.693 157.36 170.788 156.788 173.842 157.167C176.895 157.546 179.757 158.858 182.037 160.924C184.317 162.99 185.904 165.709 186.581 168.711C187.258 171.712 186.992 174.849 185.82 177.694C184.648 180.539 182.627 182.952 180.032 184.606L180.956 186.056Z"
            id="center1"
          ></path>
          <path
            fill={L.signal}
            d="M172 166.445C175.068 166.445 177.556 168.932 177.556 172C177.556 175.068 175.068 177.556 172 177.556C168.932 177.556 166.444 175.068 166.444 172C166.444 168.932 168.932 166.445 172 166.445ZM172 177.021C174.773 177.021 177.021 174.773 177.021 172C177.021 169.227 174.773 166.979 172 166.979C169.227 166.979 166.979 169.227 166.979 172C166.979 174.773 169.227 177.021 172 177.021Z"
            id="center"
          ></path>
        </svg>
      </div>

      {/* ══════════════════════════════════════════
          ROW 1 — HERO GREETING (Letta style)
      ══════════════════════════════════════════ */}
      <div
        style={{
          width: '100%',
          maxWidth: 1200,
          border: `1px solid ${L.border}`,
          borderRadius: 6,
          overflow: 'hidden',
          marginBottom: 20,
          background: L.bgPanel,
        }}
      >
        {/* Greeting */}
        <div style={{ padding: '16px 20px 0' }}>
          <div
            style={{
              fontSize: 20,
              fontWeight: 400,
              color: L.text,
              marginBottom: 4,
              minHeight: 32,
            }}
          >
            {typedGreet}
            <span
              style={{
                display: 'inline-block',
                width: 2,
                height: 20,
                background: L.accent,
                marginLeft: 2,
                verticalAlign: 'middle',
                animation: typedGreet === fullGreet ? 'cursorBlink 0.8s step-end infinite' : 'none',
              }}
            />
          </div>
        </div>
        <style>{`
          @keyframes cursorBlink { 0%,100%{opacity:1} 50%{opacity:0} }
          @keyframes flow-down { 0%{top:-60%} 100%{top:100%} }
          @media (max-width: 920px) {
            .summary-tab-grid {
              grid-template-columns: 1fr !important;
            }
            .summary-tab-sidebar {
              border-right: none !important;
              border-bottom: 1px solid var(--line-base) !important;
            }
          }
          @media (max-width: 640px) {
            .summary-board-columns {
              grid-template-columns: 1fr !important;
            }
            .summary-board-secondary {
              border-left: none !important;
              border-top: 1px solid var(--line-base) !important;
              margin-top: 10px;
              padding-top: 12px !important;
            }
          }
          .who-online-scroll {
            scrollbar-width: thin;
            scrollbar-color: ${L.borderAcc} transparent;
          }
          .who-online-scroll::-webkit-scrollbar {
            width: 4px;
          }
          .who-online-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .who-online-scroll::-webkit-scrollbar-thumb {
            background: ${L.borderAcc};
            border-radius: 999px;
          }
        `}</style>

        {/* Tabs + controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: heroExpanded ? `1px solid ${L.border}` : 'none',
            padding: '0 16px',
            marginTop: 8,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              flexWrap: 'wrap',
              rowGap: 8,
            }}
          >
            {HERO_TABS.map((t, i) => {
              const isActive = i === activeTab && heroExpanded
              return (
                <div
                  key={t}
                  onClick={() => {
                    setActiveTab(i)
                    if (!heroExpanded) setHeroExpanded(true)
                  }}
                  style={{
                    padding: '7px 0',
                    fontSize: 14,
                    color: isActive ? L.text : L.muted,
                    letterSpacing: '0em',
                    cursor: 'pointer',
                    marginBottom: -1,
                    userSelect: 'none' as const,
                    transition: 'color 0.15s',
                    borderBottom: isActive ? `2px solid ${L.text}` : '2px solid transparent',
                  }}
                >
                  {t}
                </div>
              )
            })}
            <button
              type="button"
              onClick={() => {
                setProfileDraft(profile)
                setProfileSaveMessage('')
                setProfileError('')
                resetProfileSelectionInputs()
                setIsProfileEditorOpen(true)
              }}
              style={{
                height: 30,
                padding: '0 12px',
                borderRadius: 999,
                border: `1px solid ${L.border}`,
                background: 'transparent',
                color: L.text,
                fontSize: 14,
                letterSpacing: '0.04em',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              Edit Profil
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                ...solidStatusBadgeStyle,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ color: 'rgba(255,255,255,0.72)' }}>SIP:</span>
              <span>{maskCredential(profile.sipNumber)}</span>
            </div>
            {/* Toggle expand/collapse */}
            <button
              type="button"
              onClick={() => setHeroExpanded((v) => !v)}
              title={heroExpanded ? 'Ciutkan' : 'Perluas'}
              style={{
                background: 'none',
                border: `1px solid ${L.border}`,
                borderRadius: 4,
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#002147',
                fontSize: 14,
                transition: 'border-color 0.15s, color 0.15s',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = L.accent
                e.currentTarget.style.color = '#F28B54'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = L.border
                e.currentTarget.style.color = '#002147'
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  transition: 'transform 0.25s',
                  transform: heroExpanded ? 'rotate(0deg)' : 'rotate(180deg)',
                }}
              >
                ⌃
              </span>
            </button>
          </div>
        </div>

        {/* Content — collapse wrapper */}
        <div
          style={{
            overflow: 'hidden',
            maxHeight: heroExpanded ? chatHeight + 120 : 0,
            transition: 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {/* TAB 0 — Ringkasan Hari Ini */}
          {activeTab === 0 && (
            <div
              className="summary-tab-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: '232px minmax(0, 1fr)',
                minHeight: 144,
              }}
            >
              <div
                className="summary-tab-sidebar"
                style={{
                  padding: '16px 18px',
                  borderRight: `1px solid ${L.border}`,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: L.text,
                      marginBottom: 6,
                    }}
                  >
                    SenAuto — Clinical AI
                  </div>
                  <div style={{ fontSize: 14, color: L.muted, lineHeight: 1.5 }}>
                    Ringkasan operasional pagi ini, update deployment terbaru, dan NOTAM aktif untuk
                    crew.
                  </div>
                </div>
                <a
                  href="/emr"
                  className="summary-sidebar-cta"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    color: '#ffffff',
                    background: L.statusTone,
                    border: `1px solid ${L.statusTone}`,
                    borderRadius: 3,
                    padding: '6px 12px',
                    textDecoration: 'none',
                    marginTop: 16,
                    transition: 'opacity 0.15s',
                    fontSize: 14,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.8'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1'
                  }}
                >
                  Buka EMR Klinis ↗
                </a>
              </div>
              <div style={{ background: L.bgPanel, padding: '10px 0 12px' }}>
                <div
                  className="summary-board-columns"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: 0,
                  }}
                >
                  <div style={{ padding: '0 14px 0 16px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                        gap: 10,
                        padding: '0 0 10px',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 12,
                            color: L.muted,
                          }}
                        >
                          Update Dev
                        </div>
                        <div
                          style={{
                            fontSize: 14,
                            color: L.signal,
                            marginTop: 4,
                            lineHeight: 1.5,
                          }}
                        >
                          Deployment, patch, dan perubahan terkini.
                        </div>
                      </div>
                      <span style={{ fontSize: 12, color: L.muted }}>
                        {visibleDevUpdates.length}
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      {boardLoading ? (
                        <div
                          style={{
                            padding: '10px 0',
                            fontSize: 14,
                            color: L.muted,
                          }}
                        >
                          Memuat update dev...
                        </div>
                      ) : visibleDevUpdates.length > 0 ? (
                        visibleDevUpdates.map((item) => {
                          const isExpanded = expandedBoardItems.has(item.id)
                          const canExpand = shouldShowBoardExpand(item.body)

                          return (
                            <div
                              key={item.id}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '2px minmax(0, 1fr)',
                                gap: 10,
                                alignItems: 'start',
                              }}
                            >
                              <span
                                style={{
                                  width: 2,
                                  minHeight: 58,
                                  borderRadius: 999,
                                  background:
                                    item.category === 'release'
                                      ? L.accent
                                      : item.category === 'maintenance'
                                        ? '#8FA184'
                                        : 'rgba(255,255,255,0.18)',
                                  marginTop: 2,
                                }}
                              />
                              <div
                                style={{
                                  display: 'grid',
                                  gap: 5,
                                  paddingBottom: 8,
                                }}
                              >
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
                                      fontSize: 12,
                                      color:
                                        item.category === 'release'
                                          ? L.accent
                                          : item.category === 'maintenance'
                                            ? '#8FA184'
                                            : L.muted,
                                    }}
                                  >
                                    {getDevUpdateCategoryLabel(item.category)}
                                  </span>
                                  <span style={{ fontSize: 12, color: L.muted }}>
                                    {formatBoardDateTime(item.createdAt)}
                                  </span>
                                </div>
                                <div
                                  style={{
                                    fontSize: 14,
                                    fontWeight: 500,
                                    color: L.text,
                                    lineHeight: 1.4,
                                  }}
                                >
                                  {item.title}
                                </div>
                                <div
                                  style={{
                                    fontSize: 14,
                                    lineHeight: 1.55,
                                    color: '#C8BDAF',
                                    display: isExpanded ? 'block' : '-webkit-box',
                                    WebkitLineClamp: isExpanded ? 'unset' : 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                  }}
                                >
                                  {item.body}
                                </div>
                                {canExpand && (
                                  <button
                                    type="button"
                                    onClick={() => toggleBoardItem(item.id)}
                                    style={{
                                      padding: 0,
                                      border: 'none',
                                      background: 'transparent',
                                      color: L.signal,
                                      fontSize: 14,
                                      letterSpacing: '0.04em',
                                      textAlign: 'left',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {isExpanded ? '-- tutup' : '-- baca selengkapnya'}
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div
                          style={{
                            padding: '10px 0',
                            fontSize: 14,
                            color: L.muted,
                            lineHeight: 1.6,
                          }}
                        >
                          Belum ada update dev aktif. Tulis dari panel admin agar muncul di sini.
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    className="summary-board-secondary"
                    style={{
                      padding: '0 14px 0 16px',
                      borderLeft: `1px solid ${L.border}`,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                        gap: 10,
                        padding: '0 0 10px',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 12,
                            color: L.muted,
                          }}
                        >
                          NOTAM
                        </div>
                        <div
                          style={{
                            fontSize: 14,
                            color: L.signal,
                            marginTop: 4,
                            lineHeight: 1.5,
                          }}
                        >
                          Pengumuman operasional penting untuk seluruh crew.
                        </div>
                      </div>
                      <span style={{ fontSize: 12, color: L.muted }}>{visibleNotams.length}</span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      {boardLoading ? (
                        <div
                          style={{
                            padding: '10px 0',
                            fontSize: 14,
                            color: L.muted,
                          }}
                        >
                          Memuat NOTAM...
                        </div>
                      ) : visibleNotams.length > 0 ? (
                        visibleNotams.map((item) => {
                          const isExpanded = expandedBoardItems.has(item.id)
                          const canExpand = shouldShowBoardExpand(item.body)

                          return (
                            <div
                              key={item.id}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '2px minmax(0, 1fr)',
                                gap: 10,
                                alignItems: 'start',
                              }}
                            >
                              <span
                                style={{
                                  width: 2,
                                  minHeight: 58,
                                  borderRadius: 999,
                                  background:
                                    item.priority === 'urgent'
                                      ? '#F28B82'
                                      : item.priority === 'warning'
                                        ? L.accent
                                        : 'rgba(255,255,255,0.18)',
                                  marginTop: 2,
                                }}
                              />
                              <div
                                style={{
                                  display: 'grid',
                                  gap: 5,
                                  paddingBottom: 8,
                                }}
                              >
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
                                      fontSize: 12,
                                      color:
                                        item.priority === 'urgent'
                                          ? '#F28B82'
                                          : item.priority === 'warning'
                                            ? L.accent
                                            : L.muted,
                                    }}
                                  >
                                    {getNotamPriorityLabel(item.priority)}
                                  </span>
                                  <span style={{ fontSize: 12, color: L.muted }}>
                                    {formatBoardDateTime(item.createdAt)}
                                  </span>
                                </div>
                                <div
                                  style={{
                                    fontSize: 14,
                                    fontWeight: 500,
                                    color: L.text,
                                    lineHeight: 1.4,
                                  }}
                                >
                                  {item.title}
                                </div>
                                <div
                                  style={{
                                    fontSize: 14,
                                    lineHeight: 1.55,
                                    color: '#C8BDAF',
                                    display: isExpanded ? 'block' : '-webkit-box',
                                    WebkitLineClamp: isExpanded ? 'unset' : 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                  }}
                                >
                                  {item.body}
                                </div>
                                {canExpand && (
                                  <button
                                    type="button"
                                    onClick={() => toggleBoardItem(item.id)}
                                    style={{
                                      padding: 0,
                                      border: 'none',
                                      background: 'transparent',
                                      color: L.signal,
                                      fontSize: 14,
                                      letterSpacing: '0.04em',
                                      textAlign: 'left',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {isExpanded ? '-- tutup' : '-- baca selengkapnya'}
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div
                          style={{
                            padding: '10px 0',
                            fontSize: 14,
                            color: L.muted,
                            lineHeight: 1.6,
                          }}
                        >
                          Belum ada NOTAM aktif. Pengumuman baru akan tampil di panel ini.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {boardError && (
                  <div
                    style={{
                      marginTop: 10,
                      paddingLeft: 16,
                      fontSize: 14,
                      color: '#C8BDAF',
                    }}
                  >
                    {boardError}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 1 — Agent Sentra: Chat Perplexity */}
          {activeTab === 1 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                height: chatHeight,
              }}
            >
              {/* Header bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 20px',
                  borderBottom: `1px solid ${L.border}`,
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: L.statusTone,
                      boxShadow: 'none',
                      display: 'inline-block',
                    }}
                  />
                  <span style={{ fontSize: 14, fontWeight: 500, color: L.text }}>
                    Audrey — Clinical Consultation AI · Sentra Healthcare Solutions
                  </span>
                </div>
                {chatMessages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setChatMessages([])
                      setChatError('')
                    }}
                    style={{
                      background: 'none',
                      border: `1px solid ${L.border}`,
                      borderRadius: 3,
                      padding: '3px 10px',
                      fontSize: 14,
                      color: L.muted,
                      cursor: 'pointer',
                    }}
                  >
                    CLEAR
                  </button>
                )}
              </div>

              {/* Pesan */}
              <div
                ref={chatScrollRef}
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '12px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                {chatMessages.length === 0 && !chatLoading && (
                  <div style={{ margin: 'auto', textAlign: 'center' }}>
                    <div style={{ fontSize: 14, color: L.muted, marginBottom: 16 }}>
                      Tanyakan apa saja — klinis, farmakologi, diagnosis banding
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 8,
                        justifyContent: 'center',
                      }}
                    >
                      {[
                        'Dosis amoksisilin untuk anak 10kg?',
                        'DD demam + nyeri sendi akut?',
                        'Tatalaksana hipertensi grade 2 JNC 8',
                      ].map((s) => (
                        <button
                          type="button"
                          key={s}
                          onClick={() => {
                            setChatInput(s)
                          }}
                          style={{
                            background: 'none',
                            border: `1px solid ${L.border}`,
                            borderRadius: 3,
                            padding: '5px 12px',
                            fontSize: 14,
                            color: L.muted,
                            cursor: 'pointer',
                            letterSpacing: '0.04em',
                            transition: 'border-color 0.15s, color 0.15s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = L.accent
                            e.currentTarget.style.color = L.accent
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = L.border
                            e.currentTarget.style.color = L.muted
                          }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                      gap: 10,
                      alignItems: 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        flexShrink: 0,
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: `1px solid ${msg.role === 'user' ? L.borderAcc : L.border}`,
                        background: msg.role === 'user' ? 'rgba(255,255,255,0.06)' : L.bgPanel,
                        boxShadow: '0 8px 20px rgba(0,0,0,0.18)',
                      }}
                    >
                      <img
                        src={msg.role === 'user' ? chatUserAvatarSrc : chatAssistantAvatarSrc}
                        alt={msg.role === 'user' ? profileName : 'Audrey'}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                    </div>
                    {msg.role === 'user' ? (
                      <div
                        style={{
                          maxWidth: '78%',
                          background: '#ffffff',
                          border: '1px solid rgba(255,255,255,0.92)',
                          borderRadius: 4,
                          padding: '8px 12px',
                          fontSize: 14,
                          color: '#101012',
                          whiteSpace: 'pre-wrap',
                          boxShadow: '0 10px 24px rgba(0,0,0,0.18)',
                        }}
                      >
                        {msg.content}
                      </div>
                    ) : (
                      <div
                        style={{
                          maxWidth: '78%',
                          background: L.bgPanel,
                          border: `1px solid ${L.border}`,
                          borderRadius: 4,
                          padding: '8px 12px',
                          fontSize: 14,
                          color: L.text,
                        }}
                        dangerouslySetInnerHTML={{
                          __html: sanitizeRenderedMarkdown(renderMarkdown(msg.content)),
                        }}
                      />
                    )}
                  </div>
                ))}

                {chatLoading && (
                  <div
                    style={{
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        flexShrink: 0,
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: `1px solid ${L.border}`,
                        background: L.bgPanel,
                        boxShadow: '0 8px 20px rgba(0,0,0,0.18)',
                      }}
                    >
                      <img
                        src={chatAssistantAvatarSrc}
                        alt="Audrey"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        gap: 4,
                        alignItems: 'center',
                        padding: '10px 0',
                      }}
                    >
                      {[0, 1, 2].map((d) => (
                        <span
                          key={d}
                          style={{
                            width: 4,
                            height: 4,
                            borderRadius: '50%',
                            background: L.muted,
                            animation: 'dotPulse 1.2s ease-in-out infinite',
                            animationDelay: `${d * 0.2}s`,
                            display: 'inline-block',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {chatError && (
                  <div
                    style={{
                      fontSize: 14,
                      color: 'var(--c-critical)',
                      padding: '4px 0',
                    }}
                  >
                    ⚠ {chatError}
                  </div>
                )}
              </div>

              {/* Input */}
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  padding: '10px 16px',
                  borderTop: `1px solid ${L.border}`,
                  flexShrink: 0,
                  background: L.bgPanel,
                }}
              >
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      if (!e.shiftKey) void sendChat()
                    }
                  }}
                  placeholder="Ketik pertanyaan klinis..."
                  disabled={chatLoading}
                  style={{
                    flex: 1,
                    height: 36,
                    borderRadius: 4,
                    border: `1px solid ${L.border}`,
                    background: L.bgPanel,
                    color: L.text,
                    fontSize: 14,
                    padding: '0 12px',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    void sendChat()
                  }}
                  disabled={chatLoading || !chatInput.trim()}
                  style={{
                    height: 36,
                    padding: '0 16px',
                    borderRadius: 4,
                    border: `1px solid ${L.borderAcc}`,
                    background:
                      chatLoading || !chatInput.trim() ? 'transparent' : 'rgba(0, 33, 71, 0.1)',
                    color: chatLoading || !chatInput.trim() ? L.muted : L.accent,
                    fontSize: 14,
                    cursor: chatLoading || !chatInput.trim() ? 'not-allowed' : 'pointer',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  KIRIM
                </button>
              </div>

              {/* Resize handle */}
              <div
                onMouseDown={onResizeMouseDown}
                style={{
                  height: 18,
                  cursor: 'ns-resize',
                  background: 'transparent',
                  borderTop: `1px solid ${L.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  userSelect: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                {/* grip dots */}
                <div style={{ display: 'flex', gap: 3 }}>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      style={{
                        width: 3,
                        height: 3,
                        borderRadius: '50%',
                        background: L.muted,
                        display: 'block',
                        opacity: 0.5,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          {/* TAB 2 — Berita Kesehatan */}
          {activeTab === 2 && (
            <div style={{ padding: '16px 24px', minHeight: 132 }}>
              {newsLoading ? (
                <div style={{ fontSize: 14, color: L.muted, padding: '20px 0' }}>
                  Memuat berita...
                </div>
              ) : news.length === 0 ? (
                <div style={{ fontSize: 14, color: L.muted, padding: '20px 0' }}>
                  Tidak ada berita tersedia.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {visibleNews.map((item, i) => (
                    <a
                      key={i}
                      href={safeHref(item.link)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        padding: '11px 8px',
                        borderBottom: i < news.length - 1 ? `1px solid ${L.border}` : 'none',
                        textDecoration: 'none',
                        borderRadius: 3,
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = L.bgHover
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      {/* title + tanggal */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: 16,
                        }}
                      >
                        <div style={{ fontSize: 14, color: L.text }}>{item.title}</div>
                        <span
                          style={{
                            fontSize: 14,
                            color: L.muted,
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                            marginTop: 2,
                          }}
                        >
                          {item.pubDate
                            ? new Date(item.pubDate).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </span>
                      </div>
                      {/* description + source badge */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 12,
                        }}
                      >
                        {item.description && (
                          <div style={{ fontSize: 14, color: L.muted, flex: 1 }}>
                            {item.description}
                          </div>
                        )}
                        <span
                          style={{
                            fontSize: 14,
                            color: L.muted,
                            border: `1px solid ${L.border}`,
                            borderRadius: 2,
                            padding: '1px 6px',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                        >
                          {item.source}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* TAB 3 — Assist Download */}
          {activeTab === 3 && (
            <div
              className="summary-tab-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: '232px minmax(0, 1fr)',
                minHeight: 144,
              }}
            >
              <div
                className="summary-tab-sidebar"
                style={{
                  padding: '16px 18px',
                  borderRight: `1px solid ${L.border}`,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: L.text,
                      marginBottom: 6,
                    }}
                  >
                    Sentra Assist
                  </div>
                  <div style={{ fontSize: 14, color: L.muted, lineHeight: 1.5 }}>
                    Ekstensi Chrome yang menghubungkan sistem RME (ePuskesmas) dengan Sentra
                    Intelligence Dashboard secara otomatis.
                  </div>
                </div>
                <a
                  href="/downloads/sentra-assist-chrome.zip"
                  download
                  className="summary-sidebar-cta"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    color: '#ffffff',
                    background: L.statusTone,
                    border: `1px solid ${L.statusTone}`,
                    borderRadius: 3,
                    padding: '6px 12px',
                    textDecoration: 'none',
                    marginTop: 16,
                    transition: 'opacity 0.15s',
                    fontSize: 14,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.8'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1'
                  }}
                >
                  Download Assist
                </a>
              </div>
              <div>
                <PanelSection L={L}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: L.text, marginBottom: 4 }}>
                    Apa itu Sentra Assist?
                  </div>
                  <div style={{ fontSize: 14, color: L.muted, lineHeight: 1.6 }}>
                    Sentra Assist adalah ekstensi Chrome yang menjadi bridge otomatis antara sistem
                    RME (ePuskesmas) dengan Sentra Intelligence Dashboard. Memungkinkan transfer
                    data anamnesis, diagnosis, dan resep langsung ke formulir RME — tanpa input
                    ulang manual.
                  </div>
                </PanelSection>
                <PanelSection L={L}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: L.text, marginBottom: 12 }}>
                    Cara Kerja
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {[
                      {
                        step: '01',
                        label: 'Dashboard CDSS',
                        desc: 'Keluhan, diagnosis ICD-10, terapi tersusun',
                      },
                      {
                        step: '02',
                        label: 'Sentra Assist',
                        desc: 'Ekstensi Chrome mendeteksi sesi RME aktif',
                      },
                      {
                        step: '03',
                        label: 'Bridge Engine',
                        desc: 'Transfer otomatis via socket, progress real-time',
                      },
                      {
                        step: '04',
                        label: 'Form ePuskesmas',
                        desc: 'Data masuk tanpa input ulang manual',
                      },
                    ].map((item, i, arr) => (
                      <div key={item.step} style={{ display: 'flex', gap: 12 }}>
                        {/* connector column */}
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            width: 28,
                            flexShrink: 0,
                          }}
                        >
                          <div
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              border: `1px solid ${L.statusTone}`,
                              background: `color-mix(in srgb, ${L.statusTone} 12%, transparent)`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12,
                              fontWeight: 600,
                              color: L.statusTone,
                              flexShrink: 0,
                              letterSpacing: '0.04em',
                            }}
                          >
                            {item.step}
                          </div>
                          {i < arr.length - 1 && (
                            <div
                              style={{
                                width: '2px',
                                flex: 1,
                                minHeight: 20,
                                position: 'relative',
                                overflow: 'hidden',
                                background: 'rgba(255,255,255,0.08)',
                              }}
                            >
                              <div
                                style={{
                                  position: 'absolute',
                                  left: 0,
                                  right: 0,
                                  height: '60%',
                                  background: `linear-gradient(to bottom, transparent, ${L.statusTone}, transparent)`,
                                  animation: 'flow-down 1.4s linear infinite',
                                }}
                              />
                            </div>
                          )}
                        </div>
                        {/* content */}
                        <div style={{ paddingBottom: i < arr.length - 1 ? 12 : 0 }}>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: L.text,
                              lineHeight: 1.4,
                            }}
                          >
                            {item.label}
                          </div>
                          <div
                            style={{ fontSize: 12, color: L.muted, lineHeight: 1.5, marginTop: 2 }}
                          >
                            {item.desc}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </PanelSection>
                <PanelSection L={L} last>
                  <div style={{ fontSize: 14, fontWeight: 500, color: L.text, marginBottom: 4 }}>
                    Status Koneksi
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 12,
                      color: L.muted,
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 99,
                        background: '#27ae60',
                        flexShrink: 0,
                      }}
                    />
                    Assist Bridge tersedia — siap digunakan dari halaman EMR Console
                  </div>
                </PanelSection>
              </div>
            </div>
          )}

          {/* TAB 4 — Critical Mind Algorithm */}
          {activeTab === 4 && (
            <div
              className="summary-tab-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: '232px minmax(0, 1fr)',
                minHeight: 144,
              }}
            >
              <div
                className="summary-tab-sidebar"
                style={{
                  padding: '16px 18px',
                  borderRight: `1px solid ${L.border}`,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: L.text,
                      marginBottom: 6,
                    }}
                  >
                    Critical Mind Algorithm
                  </div>
                  <div style={{ fontSize: 14, color: L.muted, lineHeight: 1.5 }}>
                    Iskandar Engine — kerangka reasoning klinis yang mendasari seluruh proses
                    diagnosis AI di Sentra.
                  </div>
                </div>
                <a
                  href="/critical-mind"
                  className="summary-sidebar-cta"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    color: '#ffffff',
                    background: L.statusTone,
                    border: `1px solid ${L.statusTone}`,
                    borderRadius: 3,
                    padding: '6px 12px',
                    textDecoration: 'none',
                    marginTop: 16,
                    transition: 'opacity 0.15s',
                    fontSize: 14,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.8'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1'
                  }}
                >
                  Lihat Detail →
                </a>
              </div>
              <div>
                <PanelSection L={L}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: L.text, marginBottom: 4 }}>
                    Iskandar Diagnosis Engine V2
                  </div>
                  <div style={{ fontSize: 14, color: L.muted, lineHeight: 1.6 }}>
                    LLM-first architecture dengan knowledge base grounding — 172 penyakit KKI,
                    hybrid retrieval (BM25 + semantic embedding), dan multi-layer validation.
                  </div>
                </PanelSection>
                <PanelSection L={L}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: L.text, marginBottom: 4 }}>
                    NEWS2 Early Warning System
                  </div>
                  <div style={{ fontSize: 14, color: L.muted, lineHeight: 1.6 }}>
                    Graduated vital signs scoring (5 parameter, skor 0-3) untuk deteksi dini
                    deteriorasi fisiologis. Terintegrasi dengan 7 pola penyakit spesifik: DHF,
                    sepsis (SIRS/qSOFA), gagal napas, ACS, syok hemoragik, preeklampsia, dan malaria
                    berat.
                  </div>
                </PanelSection>
                <PanelSection L={L}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: L.text, marginBottom: 4 }}>
                    Safety Layers
                  </div>
                  <div style={{ fontSize: 14, color: L.muted, lineHeight: 1.6 }}>
                    5 lapis keamanan klinis: vital signs red flags (hardcoded), NEWS2 composite
                    scoring, disease-specific early warning, KB grounding validation (ICD-10 +
                    sex/age/pregnancy plausibility + drug-allergy cross-reference), dan hybrid
                    decisioning deterministik.
                  </div>
                </PanelSection>
                <PanelSection L={L} last>
                  <div style={{ fontSize: 14, fontWeight: 500, color: L.text, marginBottom: 4 }}>
                    Retrieval Pipeline
                  </div>
                  <div style={{ fontSize: 14, color: L.muted, lineHeight: 1.6 }}>
                    BM25 keyword scoring → lexical disease ranking lokal → Reciprocal Rank Fusion
                    merge → DeepSeek Reasoner (primary) dengan circuit breaker. Alias expansion 350+
                    sinonim bahasa Indonesia awam → klinis.
                  </div>
                </PanelSection>
              </div>
            </div>
          )}
        </div>
        {/* end collapse wrapper */}
      </div>
      <style>{`@keyframes dotPulse { 0%,80%,100%{opacity:0.2} 40%{opacity:1} }`}</style>

      {/* ── 2-col grid ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 12,
          maxWidth: 1200,
          width: '100%',
          alignItems: 'start',
        }}
      >
        {/* ══ KOLOM KIRI — IDENTITAS + AKSES LAYANAN ══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Panel L={L}>
            {/* Avatar block */}
            <PanelSection L={L}>
              <div style={{ display: 'grid', gap: 18 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 18,
                    position: 'relative',
                    zIndex: 1,
                    width: '100%',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    <div
                      style={{
                        width: 84,
                        height: 84,
                        border: `1px solid ${L.borderAcc}`,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        position: 'relative',
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={safeUrl(profile.avatarUrl, '/avatar.png')}
                        alt={profileName}
                        style={{
                          position: 'absolute',
                          top: '-8%',
                          left: '-5%',
                          width: '110%',
                          height: '110%',
                          objectFit: 'cover',
                          objectPosition: 'center 15%',
                        }}
                      />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          color: L.muted,
                          marginBottom: 6,
                        }}
                      >
                        Crew Sentra
                      </div>
                      <div
                        style={{
                          fontSize: 24,
                          fontWeight: 500,
                          color: L.text,
                          marginBottom: 4,
                          letterSpacing: '-0.03em',
                        }}
                      >
                        {profileName}
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          color: L.muted,
                          marginBottom: 10,
                        }}
                      >
                        {sentraTitle} · {professionLabel}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        <span
                          style={{
                            ...solidStatusBadgeStyle,
                            padding: '4px 10px',
                            fontSize: 12,
                          }}
                        >
                          {roleLabel}
                        </span>
                        {(degreeBadges.length > 0 ? degreeBadges : ['Belum diisi']).map((g) => (
                          <span
                            key={g}
                            style={{
                              ...solidStatusBadgeStyle,
                              padding: '4px 10px',
                              fontSize: 12,
                            }}
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  {rankBadgeSrc ? (
                    <div
                      style={{
                        width: 'clamp(74px, 18vw, 116px)',
                        minWidth: 74,
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        alignSelf: 'stretch',
                        flexShrink: 0,
                        overflow: 'hidden',
                      }}
                    >
                      <img
                        src={rankBadgeSrc}
                        alt={`Rank ${roleLabel}`}
                        style={{
                          display: 'block',
                          maxWidth: '100%',
                          maxHeight: 62,
                          width: 'auto',
                          height: 'auto',
                          objectFit: 'contain',
                        }}
                      />
                    </div>
                  ) : null}
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: 10,
                  }}
                >
                  {profileHeroStats.map((item) => (
                    <div
                      key={item.label}
                      style={{
                        border: `1px solid ${L.border}`,
                        borderRadius: 8,
                        padding: '12px 14px',
                        background: L.bg,
                        display: 'grid',
                        gap: 4,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          color: L.muted,
                        }}
                      >
                        {item.label}
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          color: L.text,
                          lineHeight: 1.45,
                        }}
                      >
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr',
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      border: `1px solid ${L.border}`,
                      borderRadius: 8,
                      padding: '12px 14px',
                      background: L.bg,
                      display: 'grid',
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        color: L.muted,
                      }}
                    >
                      Link Resmi
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                      {officialLinkLogos.map((item) => {
                        const content = (
                          <span
                            aria-hidden="true"
                            style={{
                              display: 'inline-block',
                              width: 26,
                              height: 26,
                              flexShrink: 0,
                              background: item.href ? L.signal : L.muted,
                              opacity: item.href ? 1 : 0.55,
                              WebkitMaskImage: `url(${item.iconSrc})`,
                              maskImage: `url(${item.iconSrc})`,
                              WebkitMaskRepeat: 'no-repeat',
                              maskRepeat: 'no-repeat',
                              WebkitMaskPosition: 'center',
                              maskPosition: 'center',
                              WebkitMaskSize: 'contain',
                              maskSize: 'contain',
                            }}
                          />
                        )

                        const sharedStyle: React.CSSProperties = {
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 28,
                          height: 28,
                          textDecoration: 'none',
                        }

                        if (!item.href) {
                          return (
                            <div
                              key={item.label}
                              title={item.label}
                              aria-label={item.label}
                              style={sharedStyle}
                            >
                              {content}
                            </div>
                          )
                        }

                        return (
                          <a
                            key={item.label}
                            href={safeHref(item.href)}
                            target="_blank"
                            rel="noreferrer"
                            title={item.label}
                            aria-label={item.label}
                            style={sharedStyle}
                          >
                            {content}
                          </a>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </PanelSection>

            {/* Data Pribadi */}
            <PanelSection L={L} last>
              <SectionLabel L={L}>Data Pribadi</SectionLabel>
              <Row
                L={L}
                label="TTL"
                val={
                  profile.birthPlace && profile.birthDate
                    ? `${profile.birthPlace}, ${formatBirthDate(profile.birthDate)}`
                    : 'Belum diisi'
                }
              />
              <Row L={L} label="Usia" val={age !== null ? `${age} tahun` : 'Belum diisi'} />
              <Row L={L} label="Jenis Kel." val={profile.gender || 'Belum diisi'} />
              <Row L={L} label="WhatsApp" val={profile.whatsappNumber || 'Belum diisi'} />
              <Row L={L} label="Domisili" val={profile.domicile || 'Belum diisi'} />
              <Row L={L} label="Email" val={sessionUser?.email || 'Belum diisi'} />
            </PanelSection>
          </Panel>

          {/* ── Akses Layanan (di bawah identitas, lebar sama) ── */}
          <div>
            <div
              style={{
                fontSize: 14,
                color: L.muted,
                marginBottom: 12,
              }}
            >
              Akses Layanan
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 10,
              }}
            >
              {QUICK_LINKS.map((link, i) => {
                const wrapStyle: React.CSSProperties = {
                  border: `1px solid ${L.border}`,
                  borderRadius: 8,
                  background: 'transparent',
                  transition: 'background 0.15s',
                  overflow: 'hidden',
                }

                const innerStyle: React.CSSProperties = {
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  padding: '11px 14px',
                  width: '100%',
                  height: '100%',
                  textDecoration: 'none',
                  cursor: 'pointer',
                }

                const content = (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          fontSize: 14,
                          color: L.text,
                          transition: 'color 0.2s',
                        }}
                      >
                        {link.label}
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 14,
                          color: L.muted,
                          letterSpacing: '0.02em',
                        }}
                      >
                        {link.desc}
                      </div>
                      <span
                        style={{
                          fontSize: 14,
                          color: L.muted,
                          padding: '1px 5px',
                          borderRadius: 2,
                          border: `1px solid ${L.border}`,
                          flexShrink: 0,
                          transition: 'all 0.2s',
                        }}
                      >
                        {link.badge}
                      </span>
                    </div>
                  </>
                )

                return (
                  <div key={i} style={wrapStyle}>
                    <a
                      href={link.href}
                      target={link.href.startsWith('http') ? '_blank' : undefined}
                      rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                      style={innerStyle}
                      onMouseEnter={(e) => {
                        const parent = e.currentTarget.parentElement
                        if (parent) parent.style.background = L.bgHover
                      }}
                      onMouseLeave={(e) => {
                        const parent = e.currentTarget.parentElement
                        if (parent) parent.style.background = 'transparent'
                      }}
                    >
                      {content}
                    </a>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <SectionLabel L={L}>WHOS ONLINE</SectionLabel>
            <Panel L={L}>
              <PanelSection L={L} last>
                {onlineRoster.length > 0 ? (
                  <div
                    className={hasScrollableOnlineRoster ? 'who-online-scroll' : undefined}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      maxHeight: hasScrollableOnlineRoster ? 286 : undefined,
                      overflowY: hasScrollableOnlineRoster ? 'auto' : 'visible',
                      paddingRight: hasScrollableOnlineRoster ? 4 : 0,
                    }}
                  >
                    {onlineRoster.map((user, index) => {
                      const subtitle = user.profession || formatRoleLabel(user.role)
                      const isCurrentUser = user.userId === sessionUser?.username

                      return (
                        <div
                          key={user.userId}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'minmax(0, 1fr) auto',
                            alignItems: 'center',
                            gap: 10,
                            paddingBottom: 10,
                            borderBottom:
                              index === onlineRoster.length - 1 ? 'none' : `1px solid ${L.border}`,
                          }}
                        >
                          <div
                            style={{
                              minWidth: 0,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 2,
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                flexWrap: 'wrap',
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 14,
                                  color: L.text,
                                  lineHeight: 1.35,
                                }}
                              >
                                {user.name}
                              </span>
                              {isCurrentUser ? (
                                <span
                                  style={{
                                    fontSize: 12,
                                    color: L.accent,
                                  }}
                                >
                                  ANDA
                                </span>
                              ) : null}
                            </div>
                            <span
                              style={{
                                fontSize: 14,
                                color: L.muted,
                                lineHeight: 1.4,
                              }}
                            >
                              {subtitle}
                              {user.institution ? ` • ${user.institution}` : ''}
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: 12,
                              color: '#4CAF50',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <span
                              aria-hidden
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: '#4CAF50',
                                boxShadow: '0 0 8px rgba(76,175,80,0.45)',
                                display: 'inline-block',
                              }}
                            />
                            ONLINE
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: 14,
                      color: L.muted,
                      lineHeight: 1.5,
                    }}
                  >
                    Belum ada crew yang sedang online.
                  </div>
                )}
              </PanelSection>
            </Panel>
          </div>
        </div>
        {/* ── end kolom kiri ── */}

        {/* ══ PANEL KANAN — PEKERJAAN ══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <Panel L={L}>
            {/* Posisi */}
            <PanelSection L={L}>
              <SectionLabel L={L}>Posisi</SectionLabel>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                  marginBottom: 6,
                }}
              >
                {(visiblePositionBadges.length > 0
                  ? visiblePositionBadges
                  : [sessionUser?.profession || 'Belum diisi']
                ).map((jobTitle) => (
                  <span key={jobTitle} style={{ ...solidStatusBadgeStyle, padding: '4px 10px' }}>
                    {jobTitle}
                  </span>
                ))}
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: L.muted,
                  letterSpacing: '0.02em',
                }}
              >
                {sessionUser?.institution || 'Institusi belum diatur'}
              </div>
            </PanelSection>

            {/* Institusi */}
            <PanelSection L={L}>
              <SectionLabel L={L}>Institusi</SectionLabel>
              <Row L={L} label="Institusi" val={sessionUser?.institution || 'Belum diisi'} />
              <Row L={L} label="Profesi" val={sessionUser?.profession || 'Belum diisi'} />
              {isAdminDashboardUser ? (
                <>
                  <Row L={L} label="Role" val={sessionUser?.role || 'Belum diisi'} accent />
                  <Row
                    L={L}
                    label="Role Sentra"
                    val={
                      visiblePositionBadges.length > 0
                        ? visiblePositionBadges.join(', ')
                        : 'Belum diisi'
                    }
                  />
                </>
              ) : null}
            </PanelSection>

            {/* Kredensial */}
            <PanelSection L={L} last>
              <SectionLabel L={L}>Kredensial &amp; Lisensi</SectionLabel>
              <Row L={L} label="NIP" val={profile.employeeId || 'Belum diisi'} mono />
              <Row L={L} label="STR" val={profile.strNumber || 'Belum diisi'} mono />
              <Row L={L} label="SIP" val={profile.sipNumber || 'Belum diisi'} mono />
              <div
                style={{
                  marginTop: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: L.statusTone,
                    boxShadow: 'none',
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 14,
                    color: L.muted,
                    letterSpacing: '0.04em',
                  }}
                >
                  {profile.strNumber || profile.sipNumber
                    ? 'Kredensial profesi tersimpan'
                    : 'Lengkapi kredensial profesi bila tersedia'}
                </span>
              </div>
            </PanelSection>
          </Panel>
          {statusHariIniSection}
          {logbookKlinisSection}
        </div>
      </div>

      {isProfileEditorOpen ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.52)',
            display: 'grid',
            placeItems: 'center',
            padding: 24,
            zIndex: 100,
          }}
        >
          <style>{`
            .profile-editor-modal {
              scrollbar-width: thin;
              scrollbar-color: ${L.statusTone} transparent;
            }
            .profile-editor-modal::-webkit-scrollbar {
              width: 6px;
            }
            .profile-editor-modal::-webkit-scrollbar-track {
              background: transparent;
            }
            .profile-editor-modal::-webkit-scrollbar-thumb {
              background: ${L.statusTone};
              border-radius: 999px;
            }
          `}</style>
          <div
            className="profile-editor-modal"
            style={{
              width: '100%',
              maxWidth: 1100,
              maxHeight: '90vh',
              overflowY: 'auto',
              background: L.bgPanel,
              border: `1px solid ${L.border}`,
              borderRadius: 8,
              padding: 24,
              display: 'grid',
              gap: 18,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
              }}
            >
              <div>
                <div style={{ fontSize: 20, color: L.text, marginBottom: 6 }}>Edit Profil</div>
                <div style={{ fontSize: 14, color: L.muted }}>
                  Lengkapi data personal dan kredensial yang akan tampil di halaman profile. Avatar
                  dipilih otomatis sesuai profesi dan jenis kelamin.
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setProfileDraft(profile)
                  setProfileError('')
                  setProfileSaveMessage('')
                  resetProfileSelectionInputs()
                  setIsProfileEditorOpen(false)
                }}
                style={{
                  height: 36,
                  padding: '0 14px',
                  borderRadius: 3,
                  border: `1px solid ${L.border}`,
                  background: 'transparent',
                  color: L.text,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Tutup
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 16,
              }}
            >
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 14, color: L.muted }}>Nama lengkap</span>
                <input
                  value={profileDraft.fullName}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      fullName: event.target.value,
                    }))
                  }
                  style={{
                    height: 42,
                    borderRadius: 6,
                    border: `1px solid ${L.border}`,
                    background: L.bg,
                    color: L.text,
                    fontSize: 14,
                    padding: '0 12px',
                    outline: 'none',
                  }}
                />
              </label>

              <div
                className="gelar-section"
                style={{ display: 'grid', gap: 6, gridColumn: '1 / -1' }}
              >
                <span style={{ fontSize: 14, color: L.muted }}>Gelar</span>
                <div
                  style={{
                    display: 'grid',
                    gap: 10,
                    gridTemplateColumns: 'minmax(0, 1fr)',
                  }}
                >
                  <select
                    value={selectedDegreeOption}
                    onChange={(event) => {
                      const nextDegree = event.target.value as CrewProfileDegree
                      if (!nextDegree) return
                      addProfileDegree(nextDegree)
                      setSelectedDegreeOption('')
                    }}
                    style={{
                      height: 42,
                      borderRadius: 6,
                      border: `1px solid ${L.border}`,
                      background: L.bg,
                      color: L.text,
                      fontSize: 14,
                      padding: '0 12px',
                      outline: 'none',
                    }}
                  >
                    <option value="">Pilih gelar</option>
                    {CREW_PROFILE_DEGREES.map((degree) => (
                      <option
                        key={degree}
                        value={degree}
                        disabled={profileDraft.degrees.includes(degree)}
                      >
                        {degree}
                      </option>
                    ))}
                  </select>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {profileDraft.degrees.length > 0 ? (
                      profileDraft.degrees.map((degree) => (
                        <button
                          key={degree}
                          type="button"
                          onClick={() => removeProfileDegree(degree)}
                          style={{
                            minHeight: 34,
                            padding: '0 12px',
                            borderRadius: 999,
                            border: `1px solid ${L.statusTone}`,
                            background: L.statusToneSoft,
                            color: L.text,
                            fontSize: 14,
                            boxShadow:
                              '3px 3px 10px rgba(0,0,0,0.12), inset 1px 1px 0 rgba(255,255,255,0.03)',
                            cursor: 'pointer',
                          }}
                        >
                          {degree} ×
                        </button>
                      ))
                    ) : (
                      <span style={{ fontSize: 14, color: L.muted }}>Belum ada gelar dipilih.</span>
                    )}
                  </div>
                  <div style={{ fontSize: 14, color: L.muted }}>
                    Pilih sampai {CREW_PROFILE_MAX_DEGREES} gelar.
                  </div>
                </div>
              </div>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 14, color: L.muted }}>Tempat lahir</span>
                <input
                  value={profileDraft.birthPlace}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      birthPlace: event.target.value,
                    }))
                  }
                  style={{
                    height: 42,
                    borderRadius: 6,
                    border: `1px solid ${L.border}`,
                    background: L.bg,
                    color: L.text,
                    fontSize: 14,
                    padding: '0 12px',
                    outline: 'none',
                  }}
                />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 14, color: L.muted }}>Tanggal lahir</span>
                <input
                  type="date"
                  value={profileDraft.birthDate}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      birthDate: event.target.value,
                    }))
                  }
                  style={{
                    height: 42,
                    borderRadius: 6,
                    border: `1px solid ${L.border}`,
                    background: L.bg,
                    color: L.text,
                    fontSize: 14,
                    padding: '0 12px',
                    outline: 'none',
                  }}
                />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 14, color: L.muted }}>Jenis kelamin</span>
                <select
                  value={profileDraft.gender}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      gender: event.target.value as CrewAccessGender | '',
                    }))
                  }
                  style={{
                    height: 42,
                    borderRadius: 6,
                    border: `1px solid ${L.border}`,
                    background: L.bg,
                    color: L.text,
                    fontSize: 14,
                    padding: '0 12px',
                    outline: 'none',
                  }}
                >
                  <option value="">Pilih</option>
                  {CREW_ACCESS_GENDERS.map((gender) => (
                    <option key={gender} value={gender}>
                      {gender}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 14, color: L.muted }}>Golongan darah</span>
                <select
                  value={profileDraft.bloodType}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      bloodType: event.target.value as CrewProfileData['bloodType'],
                    }))
                  }
                  style={{
                    height: 42,
                    borderRadius: 6,
                    border: `1px solid ${L.border}`,
                    background: L.bg,
                    color: L.text,
                    fontSize: 14,
                    padding: '0 12px',
                    outline: 'none',
                  }}
                >
                  <option value="">Pilih</option>
                  {CREW_PROFILE_BLOOD_TYPES.map((bloodType) => (
                    <option key={bloodType} value={bloodType}>
                      {bloodType}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'grid', gap: 6, gridColumn: '1 / -1' }}>
                <span style={{ fontSize: 14, color: L.muted }}>Domisili</span>
                <input
                  value={profileDraft.domicile}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      domicile: event.target.value,
                    }))
                  }
                  style={{
                    height: 42,
                    borderRadius: 6,
                    border: `1px solid ${L.border}`,
                    background: L.bg,
                    color: L.text,
                    fontSize: 14,
                    padding: '0 12px',
                    outline: 'none',
                  }}
                />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 14, color: L.muted }}>Institusi utama</span>
                <input
                  value={sessionUser?.institution || 'Belum diisi'}
                  disabled
                  style={{
                    height: 42,
                    borderRadius: 6,
                    border: `1px solid ${L.border}`,
                    background: L.bgHover,
                    color: L.text,
                    fontSize: 14,
                    padding: '0 12px',
                    outline: 'none',
                    opacity: 0.82,
                  }}
                />
              </label>

              <div style={{ display: 'grid', gap: 14, gridColumn: '1 / -1' }}>
                <span style={{ fontSize: 14, color: L.muted }}>Role Sentra dan posisi</span>
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ display: 'grid', gap: 8 }}>
                    <span
                      style={{
                        fontSize: 14,
                        color: L.muted,
                      }}
                    >
                      Role Sentra
                    </span>
                    <select
                      value={selectedSentraRoleOption}
                      onChange={(event) => {
                        const nextRole = event.target.value as CrewProfilePosition
                        if (!nextRole) return
                        addProfileJobTitle(nextRole)
                        setSelectedSentraRoleOption('')
                      }}
                      style={{
                        height: 42,
                        borderRadius: 6,
                        border: `1px solid ${L.border}`,
                        background: L.bg,
                        color: L.text,
                        fontSize: 14,
                        padding: '0 12px',
                        outline: 'none',
                      }}
                    >
                      <option value="">Pilih role sentra</option>
                      {CREW_PROFILE_SENTRA_ROLES.map((jobTitle) => (
                        <option
                          key={jobTitle}
                          value={jobTitle}
                          disabled={
                            profileDraft.jobTitles.includes(jobTitle) ||
                            profileDraft.jobTitles.length >= CREW_PROFILE_MAX_POSITIONS
                          }
                        >
                          {jobTitle}
                        </option>
                      ))}
                    </select>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {selectedSentraRoles.length > 0 ? (
                        selectedSentraRoles.map((jobTitle) => (
                          <button
                            key={jobTitle}
                            type="button"
                            onClick={() => removeProfileJobTitle(jobTitle)}
                            style={{
                              minHeight: 34,
                              padding: '0 12px',
                              borderRadius: 999,
                              border: `1px solid ${L.statusTone}`,
                              background: L.statusToneSoft,
                              color: L.text,
                              fontSize: 14,
                              boxShadow:
                                '3px 3px 10px rgba(0,0,0,0.12), inset 1px 1px 0 rgba(255,255,255,0.03)',
                              cursor: 'pointer',
                              textAlign: 'left',
                            }}
                          >
                            {jobTitle} ×
                          </button>
                        ))
                      ) : (
                        <span style={{ fontSize: 14, color: L.muted }}>
                          Belum ada role sentra dipilih.
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: 8 }}>
                    <span
                      style={{
                        fontSize: 14,
                        color: L.muted,
                      }}
                    >
                      Posisi
                    </span>
                    <select
                      value={selectedStructuralPositionOption}
                      onChange={(event) => {
                        const nextPosition = event.target.value as CrewProfilePosition
                        if (!nextPosition) return
                        addProfileJobTitle(nextPosition)
                        setSelectedStructuralPositionOption('')
                      }}
                      style={{
                        height: 42,
                        borderRadius: 6,
                        border: `1px solid ${L.border}`,
                        background: L.bg,
                        color: L.text,
                        fontSize: 14,
                        padding: '0 12px',
                        outline: 'none',
                      }}
                    >
                      <option value="">Pilih posisi</option>
                      {CREW_PROFILE_STRUCTURAL_POSITIONS.map((jobTitle) => (
                        <option
                          key={jobTitle}
                          value={jobTitle}
                          disabled={
                            profileDraft.jobTitles.includes(jobTitle) ||
                            profileDraft.jobTitles.length >= CREW_PROFILE_MAX_POSITIONS
                          }
                        >
                          {jobTitle}
                        </option>
                      ))}
                    </select>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {selectedStructuralPositions.length > 0 ? (
                        selectedStructuralPositions.map((jobTitle) => (
                          <button
                            key={jobTitle}
                            type="button"
                            onClick={() => removeProfileJobTitle(jobTitle)}
                            style={{
                              minHeight: 34,
                              padding: '0 12px',
                              borderRadius: 999,
                              border: `1px solid ${L.statusTone}`,
                              background: L.statusToneSoft,
                              color: L.text,
                              fontSize: 14,
                              boxShadow:
                                '3px 3px 10px rgba(0,0,0,0.12), inset 1px 1px 0 rgba(255,255,255,0.03)',
                              cursor: 'pointer',
                              textAlign: 'left',
                            }}
                          >
                            {jobTitle} ×
                          </button>
                        ))
                      ) : (
                        <span style={{ fontSize: 14, color: L.muted }}>
                          Belum ada posisi dipilih.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 14, color: L.muted }}>
                  Pilih sampai {CREW_PROFILE_MAX_POSITIONS} item gabungan untuk role sentra dan
                  posisi.
                </div>
              </div>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 14, color: L.muted }}>WhatsApp aktif</span>
                <input
                  value={profileDraft.whatsappNumber}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      whatsappNumber: event.target.value,
                    }))
                  }
                  placeholder="+62 8xx xxxx xxxx"
                  style={{
                    height: 42,
                    borderRadius: 6,
                    border: `1px solid ${L.border}`,
                    background: L.bg,
                    color: L.text,
                    fontSize: 14,
                    padding: '0 12px',
                    outline: 'none',
                  }}
                />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 14, color: L.muted }}>GitHub</span>
                <input
                  value={profileDraft.githubUrl}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      githubUrl: event.target.value,
                    }))
                  }
                  placeholder="github.com/username"
                  style={{
                    height: 42,
                    borderRadius: 6,
                    border: `1px solid ${L.border}`,
                    background: L.bg,
                    color: L.text,
                    fontSize: 14,
                    padding: '0 12px',
                    outline: 'none',
                  }}
                />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 14, color: L.muted }}>LinkedIn</span>
                <input
                  value={profileDraft.linkedinUrl}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      linkedinUrl: event.target.value,
                    }))
                  }
                  placeholder="linkedin.com/in/username"
                  style={{
                    height: 42,
                    borderRadius: 6,
                    border: `1px solid ${L.border}`,
                    background: L.bg,
                    color: L.text,
                    fontSize: 14,
                    padding: '0 12px',
                    outline: 'none',
                  }}
                />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 14, color: L.muted }}>Gravatar</span>
                <input
                  value={profileDraft.gravatarUrl}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      gravatarUrl: event.target.value,
                    }))
                  }
                  placeholder="gravatar.com/username"
                  style={{
                    height: 42,
                    borderRadius: 6,
                    border: `1px solid ${L.border}`,
                    background: L.bg,
                    color: L.text,
                    fontSize: 14,
                    padding: '0 12px',
                    outline: 'none',
                  }}
                />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 14, color: L.muted }}>Blog</span>
                <input
                  value={profileDraft.blogUrl}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      blogUrl: event.target.value,
                    }))
                  }
                  placeholder="blog.drferdi.id"
                  style={{
                    height: 42,
                    borderRadius: 6,
                    border: `1px solid ${L.border}`,
                    background: L.bg,
                    color: L.text,
                    fontSize: 14,
                    padding: '0 12px',
                    outline: 'none',
                  }}
                />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 14, color: L.muted }}>Instagram</span>
                <input
                  value={profileDraft.instagramUrl}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      instagramUrl: event.target.value,
                    }))
                  }
                  placeholder="instagram.com/username"
                  style={{
                    height: 42,
                    borderRadius: 6,
                    border: `1px solid ${L.border}`,
                    background: L.bg,
                    color: L.text,
                    fontSize: 14,
                    padding: '0 12px',
                    outline: 'none',
                  }}
                />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 14, color: L.muted }}>TikTok</span>
                <input
                  value={profileDraft.tiktokUrl}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      tiktokUrl: event.target.value,
                    }))
                  }
                  placeholder="tiktok.com/@username"
                  style={{
                    height: 42,
                    borderRadius: 6,
                    border: `1px solid ${L.border}`,
                    background: L.bg,
                    color: L.text,
                    fontSize: 14,
                    padding: '0 12px',
                    outline: 'none',
                  }}
                />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 14, color: L.muted }}>YouTube</span>
                <input
                  value={profileDraft.youtubeUrl}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      youtubeUrl: event.target.value,
                    }))
                  }
                  placeholder="youtube.com/@channel"
                  style={{
                    height: 42,
                    borderRadius: 6,
                    border: `1px solid ${L.border}`,
                    background: L.bg,
                    color: L.text,
                    fontSize: 14,
                    padding: '0 12px',
                    outline: 'none',
                  }}
                />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 14, color: L.muted }}>NIP</span>
                <input
                  value={profileDraft.employeeId}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      employeeId: event.target.value,
                    }))
                  }
                  style={{
                    height: 42,
                    borderRadius: 6,
                    border: `1px solid ${L.border}`,
                    background: L.bg,
                    color: L.text,
                    fontSize: 14,
                    padding: '0 12px',
                    outline: 'none',
                  }}
                />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 14, color: L.muted }}>STR</span>
                <input
                  value={profileDraft.strNumber}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      strNumber: event.target.value,
                    }))
                  }
                  style={{
                    height: 42,
                    borderRadius: 6,
                    border: `1px solid ${L.border}`,
                    background: L.bg,
                    color: L.text,
                    fontSize: 14,
                    padding: '0 12px',
                    outline: 'none',
                  }}
                />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 14, color: L.muted }}>SIP</span>
                <input
                  value={profileDraft.sipNumber}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      sipNumber: event.target.value,
                    }))
                  }
                  style={{
                    height: 42,
                    borderRadius: 6,
                    border: `1px solid ${L.border}`,
                    background: L.bg,
                    color: L.text,
                    fontSize: 14,
                    padding: '0 12px',
                    outline: 'none',
                  }}
                />
              </label>

              <div style={{ display: 'grid', gap: 6, gridColumn: '1 / -1' }}>
                <span style={{ fontSize: 14, color: L.muted }}>Avatar</span>
                <div
                  style={{
                    minHeight: 42,
                    borderRadius: 6,
                    border: `1px solid ${L.border}`,
                    background: L.bgHover,
                    color: L.text,
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  Avatar dipilih otomatis berdasarkan profesi, jenis kelamin, dan konteks layanan.
                </div>
              </div>
            </div>

            {profileError ? (
              <div style={{ fontSize: 14, color: 'var(--c-critical)' }}>{profileError}</div>
            ) : null}

            {profileSaveMessage ? (
              <div style={{ fontSize: 14, color: L.accent }}>{profileSaveMessage}</div>
            ) : null}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                type="button"
                onClick={() => {
                  setProfileDraft(profile)
                  setProfileError('')
                  setProfileSaveMessage('')
                  setIsProfileEditorOpen(false)
                }}
                style={{
                  height: 40,
                  padding: '0 16px',
                  borderRadius: 6,
                  border: `1px solid ${L.border}`,
                  background: 'transparent',
                  color: L.text,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  void saveProfile()
                }}
                disabled={profileSaving}
                style={{
                  height: 40,
                  padding: '0 18px',
                  borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.06)',
                  background: L.statusTone,
                  color: '#ffffff',
                  fontSize: 14,
                  cursor: profileSaving ? 'wait' : 'pointer',
                  opacity: profileSaving ? 0.8 : 1,
                  boxShadow:
                    '3px 3px 10px rgba(0,0,0,0.24), inset 1px 1px 0 rgba(255,255,255,0.04)',
                }}
              >
                {profileSaving ? 'Menyimpan...' : 'Simpan Profil'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
