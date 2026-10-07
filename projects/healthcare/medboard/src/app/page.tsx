'use client'

import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

import { AsistenMedisFlow } from '@/components/home/AsistenMedisFlow'
import { ContributionHeatmap, HeatmapLegend } from '@/components/home/ContributionHeatmap'
import { RankAwardCard } from '@/components/rank/RankAwardCard'
import { LevelEdge, RankBadge } from '@/components/rank/RankBadge'
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
  resolveCrewSentraTitle,
  resolveCrewSentraTitles,
} from '@/lib/crew-profile'
import { CRITICAL_MIND_LIBRARY, MY_MIND_MEMORY_URL } from '@/lib/critical-mind/library'
import type { CrewAward, CrewRankSummary } from '@/lib/crew-rank'
import type { DevUpdateRecord } from '@/lib/dev-updates'
import { buildActivityDays, type ActivityDay } from '@/lib/report/clinical-activity'
import { safeHref, safeUrl } from '@/lib/sanitize-url'
import { tidyCase } from '@/lib/text/tidy-case'
import { ArrowUpRight, ChevronUp, TriangleAlert } from 'lucide-react'

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
    badge: 'Kemenkes',
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

/* ── Palette: tokens from globals.css (docs/redesign-glass.md §3) ── */
function useL() {
  return {
    border: 'var(--border)',
    text: 'var(--text)',
    muted: 'var(--text-secondary)',
  }
}

const Row = ({
  label,
  val,
  accent = false,
}: {
  label: string
  val: string
  accent?: boolean
}) => (
  <div className="home-row">
    <span className="home-row__label">{label}</span>
    <span
      className={`home-row__value${val === 'Belum diisi' ? ' home-row__value--empty' : ''}${
        accent ? ' home-row__value--accent' : ''
      }`}
    >
      {val}
    </span>
  </div>
)

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <h2 className="home-card__title">{children}</h2>
)

const Panel = ({ children }: { children: React.ReactNode }) => (
  <div className="home-card">{children}</div>
)

const PanelSection = ({ children }: { children: React.ReactNode }) => (
  <div className="home-card__section">{children}</div>
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

const HERO_TABS = [
  'Ringkasan Hari Ini',
  'Agent Sentra',
  'Berita Kesehatan',
  'Asisten Medis',
  'Critical Mind',
]

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
  if (!value) return 'Belum diatur'
  const words = value.replace(/_/g, ' ').toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
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
  const [activityDays, setActivityDays] = useState<ActivityDay[] | null>(null)
  const [activityFailed, setActivityFailed] = useState(false)
  // Shown while the year loads or when it cannot be loaded: the empty grid keeps its shape.
  const [emptyActivity] = useState(() => buildActivityDays([], new Date()))
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

  // Clinical rank: reports written and active hours (Chief 2026-10-07)
  const [myRank, setMyRank] = useState<CrewRankSummary | null>(null)
  const [myAwards, setMyAwards] = useState<CrewAward[]>([])
  useEffect(() => {
    const username = sessionUser?.username
    if (!username) return
    fetch(`/api/crew/${encodeURIComponent(username)}/rank`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { ok?: boolean; rank?: CrewRankSummary; awards?: CrewAward[] } | null) => {
        if (!d?.ok) return
        setMyRank(d.rank ?? null)
        setMyAwards(d.awards ?? [])
      })
      .catch(() => undefined)
  }, [sessionUser?.username])

  // Daily clinical-report counts for the activity heatmap
  useEffect(() => {
    if (!crewName) return
    fetch(`/api/report/clinical/activity?dokter=${encodeURIComponent(crewName)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { ok?: boolean; days?: ActivityDay[] } | null) => {
        if (d?.ok && d.days) setActivityDays(d.days)
        else setActivityFailed(true)
      })
      .catch(() => setActivityFailed(true))
  }, [crewName])

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
  const sentraTitle = resolveCrewSentraTitle(profile.jobTitles, sessionUser?.role)
  const chatUserAvatarSrc = profile.avatarUrl || '/avatar.png'
  const chatAssistantAvatarSrc = '/audrey.png'
  const visiblePositionBadges = isAdminDashboardUser ? positionSectionBadges : []
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
  const hasScrollableLogbook = logbookRows.length > 5
  const logbookKlinisSection = (
    <Panel>
      <PanelSection>
        <SectionLabel>Logbook Klinis</SectionLabel>
        {logbookRows.length === 0 ? (
          <div className="home-empty">Belum ada laporan klinis</div>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '36px minmax(0,1fr) minmax(0,1.2fr) 90px',
                gap: 8,
                padding: '8px 0',
                borderBottom: `1px solid ${L.border}`,
              }}
            >
              {['No', 'Pasien', 'Diagnosis', 'Tanggal'].map((h) => (
                <span key={h} style={{ fontSize: 12, fontWeight: 500, color: L.muted }}>
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
                  className="home-list-row"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '36px minmax(0,1fr) minmax(0,1.2fr) 90px',
                    gap: 8,
                  }}
                >
                  <span style={{ color: L.muted }}>{idx + 1}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tidyCase(row.pasien, 'name')}
                  </span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tidyCase(row.diagnosis)}
                  </span>
                  <span style={{ color: L.muted, fontVariantNumeric: 'tabular-nums' }}>
                    {row.tanggal}
                  </span>
                </a>
              ))}
            </div>
          </>
        )}
      </PanelSection>
    </Panel>
  )

  const boardTone = (key: string): { rule: string; badge: string } => {
    switch (key) {
      case 'release':
        return { rule: 'var(--primary)', badge: 'ui-badge--primary' }
      case 'maintenance':
        return { rule: 'var(--success)', badge: 'ui-badge--success' }
      case 'urgent':
        return { rule: 'var(--critical)', badge: 'ui-badge--critical' }
      case 'warning':
        return { rule: 'var(--warning)', badge: 'ui-badge--warning' }
      default:
        return { rule: 'var(--border)', badge: 'ui-badge--neutral' }
    }
  }

  const boardItemBody = (
    item: { id: string; title: string; body: string; createdAt: string },
    toneKey: string,
    label: string
  ) => {
    const isExpanded = expandedBoardItems.has(item.id)
    const canExpand = shouldShowBoardExpand(item.body)
    const tone = boardTone(toneKey)

    return (
      <div
        key={item.id}
        style={{
          display: 'grid',
          gridTemplateColumns: '2px minmax(0, 1fr)',
          gap: 12,
          alignItems: 'stretch',
        }}
      >
        <span style={{ borderRadius: 999, background: tone.rule }} />
        <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className={`ui-badge ${tone.badge}`}>{label}</span>
            <span style={{ fontSize: 12, color: L.muted }}>{formatBoardDateTime(item.createdAt)}</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 500, color: L.text, lineHeight: 1.4 }}>
            {item.title}
          </div>
          <div
            style={{
              fontSize: 14,
              lineHeight: 1.55,
              color: L.muted,
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
                color: 'var(--primary)',
                fontSize: 14,
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
  }

  const sidebarBlock = (title: string, text: string, cta: React.ReactNode) => (
    <div className="home-split__side">
      <div>
        <h2 className="home-card__title">{title}</h2>
        <p className="home-card__text">{text}</p>
      </div>
      <div>{cta}</div>
    </div>
  )

  type EditorTextKey =
    | 'fullName'
    | 'birthPlace'
    | 'domicile'
    | 'whatsappNumber'
    | 'githubUrl'
    | 'linkedinUrl'
    | 'gravatarUrl'
    | 'blogUrl'
    | 'instagramUrl'
    | 'tiktokUrl'
    | 'youtubeUrl'
    | 'employeeId'
    | 'strNumber'
    | 'sipNumber'

  const editorTextField = (
    field: EditorTextKey,
    label: string,
    placeholder?: string,
    fullWidth = false
  ) => (
    <label className="ui-field" style={fullWidth ? { gridColumn: '1 / -1' } : undefined}>
      <span className="ui-field__label">{label}</span>
      <input
        className="ui-input"
        name={field}
        value={profileDraft[field]}
        onChange={(event) =>
          setProfileDraft((current) => ({
            ...current,
            [field]: event.target.value,
          }))
        }
        placeholder={placeholder}
      />
    </label>
  )

  const openProfileEditor = () => {
    setProfileDraft(profile)
    setProfileSaveMessage('')
    setProfileError('')
    resetProfileSelectionInputs()
    setIsProfileEditorOpen(true)
  }

  const removablePillStyle: React.CSSProperties = {
    minHeight: 32,
    padding: '0 12px',
    borderRadius: 999,
    border: '1px solid var(--primary)',
    background: 'var(--primary-tint)',
    color: 'var(--primary)',
    fontSize: 14,
    cursor: 'pointer',
    textAlign: 'left',
  }

  return (
    <div className="home-page">
      {profileLoading ? (
        <div style={{ fontSize: 14, color: L.muted }}>Memuat profil user...</div>
      ) : null}

      {!profileLoading && profileError && !isProfileEditorOpen ? (
        <div className="ui-alert ui-alert--critical">{profileError}</div>
      ) : null}

      {profileSaveMessage && !isProfileEditorOpen ? (
        <div className="ui-alert ui-alert--success">{profileSaveMessage}</div>
      ) : null}

      {/* ── Page header (pola Detail) ── */}
      <header className="ui-page-header">
        <div>
          <h1 className="home-title" suppressHydrationWarning>
            {fullGreet}
          </h1>
          <p className="ui-page-header__description">
            {professionLabel} · {sessionUser?.institution || 'Institusi belum diatur'}
          </p>
        </div>
        <div className="ui-page-header__actions" style={{ alignItems: 'center' }}>
          {profile.sipNumber ? (
            <span className="ui-badge ui-badge--neutral">
              SIP: {maskCredential(profile.sipNumber)}
            </span>
          ) : (
            <span className="ui-badge ui-badge--warning">SIP belum diisi</span>
          )}
          <button
            type="button"
            className="ui-btn ui-btn--secondary ui-btn--sm"
            onClick={openProfileEditor}
          >
            Edit Profil
          </button>
        </div>
      </header>

      {/* ── Tabs + isi ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div className="ui-tabs" role="tablist" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          {HERO_TABS.map((t, i) => {
            const isActive = i === activeTab && heroExpanded
            return (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={isActive}
                className="ui-tab"
                onClick={() => {
                  setActiveTab(i)
                  if (!heroExpanded) setHeroExpanded(true)
                }}
              >
                {t}
              </button>
            )
          })}
          <button
            type="button"
            className="ui-btn ui-btn--ghost ui-btn--sm"
            onClick={() => setHeroExpanded((v) => !v)}
            title={heroExpanded ? 'Ciutkan' : 'Perluas'}
            style={{ marginLeft: 'auto' }}
          >
            <span
              style={{
                display: 'inline-block',
                transform: heroExpanded ? 'rotate(0deg)' : 'rotate(180deg)',
              }}
            >
              <ChevronUp size={16} />
            </span>
          </button>
        </div>

        <div style={{ display: heroExpanded ? 'block' : 'none' }}>
          {/* TAB 0 — Ringkasan Hari Ini */}
          {activeTab === 0 && (
            <div className="home-card home-split">
              {sidebarBlock(
                'SenAuto — Clinical AI',
                'Ringkasan operasional pagi ini, update deployment terbaru, dan NOTAM aktif untuk crew.',
                <a href="/emr" className="ui-btn ui-btn--primary ui-btn--sm">
                  Buka EMR Klinis <ArrowUpRight size={14} />
                </a>
              )}
              <div>
                <div className="home-board">
                  <div className="home-board__col">
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                        gap: 12,
                        marginBottom: 12,
                      }}
                    >
                      <div>
                        <h2 className="home-card__title" style={{ marginBottom: 4 }}>
                          Update Dev
                        </h2>
                        <p className="home-card__text">Deployment, patch, dan perubahan terkini.</p>
                      </div>
                      <span style={{ fontSize: 12, color: L.muted }}>
                        {visibleDevUpdates.length}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {boardLoading ? (
                        <div className="home-empty">Memuat update dev...</div>
                      ) : visibleDevUpdates.length > 0 ? (
                        visibleDevUpdates.map((item) =>
                          boardItemBody(
                            item,
                            item.category,
                            getDevUpdateCategoryLabel(item.category)
                          )
                        )
                      ) : (
                        <div className="home-empty">
                          Belum ada update dev aktif. Tulis dari panel admin agar muncul di sini.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="home-board__col">
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                        gap: 12,
                        marginBottom: 12,
                      }}
                    >
                      <div>
                        <h2 className="home-card__title" style={{ marginBottom: 4 }}>
                          NOTAM
                        </h2>
                        <p className="home-card__text">
                          Pengumuman operasional penting untuk seluruh crew.
                        </p>
                      </div>
                      <span style={{ fontSize: 12, color: L.muted }}>{visibleNotams.length}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {boardLoading ? (
                        <div className="home-empty">Memuat NOTAM...</div>
                      ) : visibleNotams.length > 0 ? (
                        visibleNotams.map((item) =>
                          boardItemBody(item, item.priority, getNotamPriorityLabel(item.priority))
                        )
                      ) : (
                        <div className="home-empty">
                          Belum ada NOTAM aktif. Pengumuman baru akan tampil di panel ini.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {boardError && (
                  <div style={{ padding: '0 24px 24px', fontSize: 14, color: L.muted }}>
                    {boardError}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 1 — Agent Sentra: Chat */}
          {activeTab === 1 && (
            <div
              className="home-card"
              style={{ display: 'flex', flexDirection: 'column', height: chatHeight }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '12px 24px',
                  borderBottom: `1px solid ${L.border}`,
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    aria-hidden
                    className="home-status-dot"
                    style={{ background: 'var(--success)' }}
                  />
                  <span style={{ fontSize: 14, fontWeight: 500, color: L.text }}>
                    Audrey — Clinical Consultation AI · Sentra Healthcare Solutions
                  </span>
                </div>
                {chatMessages.length > 0 && (
                  <button
                    type="button"
                    className="ui-btn ui-btn--ghost ui-btn--sm"
                    onClick={() => {
                      setChatMessages([])
                      setChatError('')
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>

              <div
                ref={chatScrollRef}
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '16px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                {chatMessages.length === 0 && !chatLoading && (
                  <div style={{ margin: 'auto', textAlign: 'center' }}>
                    <div style={{ fontSize: 14, color: L.muted, marginBottom: 16 }}>
                      Tanyakan apa saja — klinis, farmakologi, diagnosis banding
                    </div>
                    <div
                      style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}
                    >
                      {[
                        'Dosis amoksisilin untuk anak 10kg?',
                        'DD demam + nyeri sendi akut?',
                        'Tatalaksana hipertensi grade 2 JNC 8',
                      ].map((s) => (
                        <button
                          type="button"
                          key={s}
                          className="ui-chip"
                          onClick={() => {
                            setChatInput(s)
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
                      gap: 12,
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
                      <div className="home-bubble home-bubble--user">{msg.content}</div>
                    ) : (
                      <div
                        className="home-bubble home-bubble--assistant"
                        dangerouslySetInnerHTML={{
                          __html: sanitizeRenderedMarkdown(renderMarkdown(msg.content)),
                        }}
                      />
                    )}
                  </div>
                ))}

                {chatLoading && (
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div
                      style={{
                        flexShrink: 0,
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: `1px solid ${L.border}`,
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
                      style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '10px 0' }}
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
                  <div className="ui-alert ui-alert--critical">
                    <TriangleAlert size={14} /> {chatError}
                  </div>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 24px',
                  borderTop: `1px solid ${L.border}`,
                  flexShrink: 0,
                }}
              >
                <input
                  className="ui-input"
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
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="ui-btn ui-btn--primary ui-btn--sm"
                  onClick={() => {
                    void sendChat()
                  }}
                  disabled={chatLoading || !chatInput.trim()}
                >
                  Kirim
                </button>
              </div>

              <div
                onMouseDown={onResizeMouseDown}
                style={{
                  height: 18,
                  cursor: 'ns-resize',
                  borderTop: `1px solid ${L.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  userSelect: 'none',
                }}
              >
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
            <div className="home-card">
              <PanelSection>
                {newsLoading ? (
                  <div className="home-empty">Memuat berita...</div>
                ) : news.length === 0 ? (
                  <div className="home-empty">Tidak ada berita tersedia.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {visibleNews.map((item, i) => (
                      <a
                        key={i}
                        href={safeHref(item.link)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="home-list-row"
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'stretch',
                          gap: 4,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: 16,
                          }}
                        >
                          <div style={{ fontSize: 14, fontWeight: 500, color: L.text }}>
                            {item.title}
                          </div>
                          <span
                            style={{
                              fontSize: 12,
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
                          <span className="ui-badge ui-badge--neutral">{item.source}</span>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </PanelSection>
            </div>
          )}

          {/* TAB 3 — Asisten Medis */}
          {activeTab === 3 && (
            <div className="home-card home-split">
              {sidebarBlock(
                'Asisten Medis',
                'Ekstensi Chrome yang menghubungkan sistem RME (ePuskesmas) dengan Sentra Intelligence Dashboard secara otomatis.',
                <a
                  href="/downloads/sentra-assist-chrome.zip"
                  download
                  className="ui-btn ui-btn--primary ui-btn--sm"
                >
                  Unduh Asisten Medis
                </a>
              )}
              <div>
                <PanelSection>
                  <h3 className="home-card__title">Apa itu Asisten Medis?</h3>
                  <p className="home-card__text">
                    Asisten Medis adalah ekstensi Chrome yang menjadi bridge otomatis antara sistem
                    RME (ePuskesmas) dengan Sentra Intelligence Dashboard. Memungkinkan transfer
                    data anamnesis, diagnosis, dan resep langsung ke formulir RME — tanpa input
                    ulang manual.
                  </p>
                </PanelSection>
                <PanelSection>
                  <h3 className="home-card__title">Cara Kerja</h3>
                  <AsistenMedisFlow />
                </PanelSection>
                <PanelSection>
                  <h3 className="home-card__title">Status Koneksi</h3>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 14,
                      color: L.muted,
                    }}
                  >
                    <span
                      aria-hidden
                      className="home-status-dot"
                      style={{ background: 'var(--success)' }}
                    />
                    Bridge Asisten Medis tersedia — siap digunakan dari halaman Intelligence EMR
                  </div>
                </PanelSection>
              </div>
            </div>
          )}

          {/* TAB 4 — Critical Mind: library of dr. Ferdi Iskandar's thinking */}
          {activeTab === 4 && (
            <div className="home-card home-split">
              {sidebarBlock(
                'Critical Mind',
                'Pusat library pemikiran dr. Ferdi Iskandar: hipotesis, kerangka, dan tulisan yang tercatat di MyMindMemory.',
                <a
                  href={MY_MIND_MEMORY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ui-btn ui-btn--primary ui-btn--sm"
                >
                  Buka MyMindMemory
                </a>
              )}
              <div>
                {CRITICAL_MIND_LIBRARY.map((entry) => (
                  <PanelSection key={entry.doi}>
                    <div className="home-badges" style={{ marginBottom: 8 }}>
                      <span className="ui-badge ui-badge--primary">{entry.kind}</span>
                      <span className="ui-badge ui-badge--neutral">{entry.type}</span>
                      <span style={{ fontSize: 12, color: L.muted }}>{entry.published}</span>
                    </div>
                    <h3 className="home-card__title">{entry.title}</h3>
                    <p className="home-card__text">{entry.description}</p>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 12,
                        marginTop: 8,
                        fontSize: 12,
                        color: L.muted,
                      }}
                    >
                      <span>{entry.topics.join(' · ')}</span>
                      <a
                        href={`https://doi.org/${entry.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: L.text }}
                      >
                        DOI {entry.doi}
                        <ArrowUpRight size={14} strokeWidth={1.75} aria-hidden />
                      </a>
                    </div>
                  </PanelSection>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 2 kolom kartu ── */}
      <div className="home-grid">
        {/* ══ KOLOM KIRI — IDENTITAS + AKSES LAYANAN ══ */}
        <div className="home-stack">
          <Panel>
            <PanelSection>
              <LevelEdge role={sessionUser?.role ?? ''} />
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, width: '100%' }}>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0, flex: 1 }}
                >
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      border: `1px solid ${L.border}`,
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
                    <div style={{ fontSize: 12, color: L.muted, marginBottom: 4 }}>Crew Sentra</div>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 600,
                        lineHeight: 1.3,
                        color: L.text,
                        marginBottom: 4,
                      }}
                    >
                      {profileName}
                    </div>
                    <div style={{ fontSize: 14, color: L.muted, marginBottom: 12 }}>
                      {sentraTitle} · {professionLabel}
                    </div>
                    <div className="home-badges">
                      <span className="ui-badge ui-badge--neu">{roleLabel}</span>
                      {(degreeBadges.length > 0 ? degreeBadges : ['Belum diisi']).map((g) => (
                        <span key={g} className="ui-badge ui-badge--neutral">
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <RankBadge rank={myRank} size={72} />
              </div>
            </PanelSection>

            {/* Link Resmi */}
            <PanelSection>
              <SectionLabel>Link Resmi</SectionLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, paddingTop: 4 }}>
                {officialLinkLogos.map((item) => {
                  const content = (
                    <span
                      aria-hidden="true"
                      className="home-link-icon"
                      style={{
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

                  if (!item.href) {
                    return (
                      <div
                        key={item.label}
                        title={item.label}
                        aria-label={item.label}
                        className="home-link-tile home-link-tile--off"
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
                      className="home-link-tile"
                    >
                      {content}
                    </a>
                  )
                })}
              </div>
            </PanelSection>

            {/* Data Pribadi */}
            <PanelSection>
              <SectionLabel>Data Pribadi</SectionLabel>
              <Row
                label="TTL"
                val={
                  profile.birthPlace && profile.birthDate
                    ? `${profile.birthPlace}, ${formatBirthDate(profile.birthDate)}`
                    : 'Belum diisi'
                }
              />
              <Row label="Usia" val={age !== null ? `${age} tahun` : 'Belum diisi'} />
              <Row label="Jenis Kel." val={profile.gender || 'Belum diisi'} />
              <Row label="WhatsApp" val={profile.whatsappNumber || 'Belum diisi'} />
              <Row label="Domisili" val={profile.domicile || 'Belum diisi'} />
              <Row label="Email" val={sessionUser?.email || 'Belum diisi'} />
            </PanelSection>
          </Panel>

          {/* ── Akses Layanan ── */}
          <Panel>
            <PanelSection>
              <SectionLabel>Akses Layanan</SectionLabel>
              {QUICK_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target={link.href.startsWith('http') ? '_blank' : undefined}
                  rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="home-list-row"
                >
                  <span>
                    {link.label}
                    <span style={{ color: L.muted }}> · {link.desc}</span>
                  </span>
                  <span className="ui-badge ui-badge--neu">{link.badge}</span>
                </a>
              ))}
            </PanelSection>
          </Panel>

        </div>

        {/* ══ KOLOM KANAN — PEKERJAAN ══ */}
        <div className="home-stack">
          <Panel>
            {/* Posisi */}
            <PanelSection>
              <SectionLabel>Posisi</SectionLabel>
              <div className="home-badges" style={{ marginBottom: 8 }}>
                {(visiblePositionBadges.length > 0
                  ? visiblePositionBadges
                  : [sessionUser?.profession || 'Belum diisi']
                ).map((jobTitle) => (
                  <span key={jobTitle} className="ui-badge ui-badge--neu">
                    {jobTitle}
                  </span>
                ))}
              </div>
              <div style={{ fontSize: 14, color: L.muted }}>
                {sessionUser?.institution || 'Institusi belum diatur'}
              </div>
            </PanelSection>

            {/* Institusi */}
            <PanelSection>
              <SectionLabel>Institusi</SectionLabel>
              <Row label="Institusi" val={sessionUser?.institution || 'Belum diisi'} />
              <Row label="Profesi" val={sessionUser?.profession || 'Belum diisi'} />
              {isAdminDashboardUser ? (
                <>
                  <Row
                    label="Role"
                    val={sessionUser?.role ? formatRoleLabel(sessionUser.role) : 'Belum diisi'}
                    accent
                  />
                  <Row
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
            <PanelSection>
              <SectionLabel>Kredensial &amp; Lisensi</SectionLabel>
              <Row label="NIP" val={profile.employeeId || 'Belum diisi'} />
              <Row label="STR" val={profile.strNumber || 'Belum diisi'} />
              <Row label="SIP" val={profile.sipNumber || 'Belum diisi'} />
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  aria-hidden
                  className="home-status-dot"
                  style={{
                    background:
                      profile.strNumber || profile.sipNumber
                        ? 'var(--success)'
                        : 'var(--text-secondary)',
                  }}
                />
                <span style={{ fontSize: 14, color: L.muted }}>
                  {profile.strNumber || profile.sipNumber
                    ? 'Kredensial profesi tersimpan'
                    : 'Lengkapi kredensial profesi bila tersedia'}
                </span>
              </div>
            </PanelSection>
          </Panel>
          {logbookKlinisSection}
        </div>

        {/* ── Rank & award ── */}
        <div style={{ gridColumn: '1 / -1' }}>
          <Panel>
            <PanelSection>
              <SectionLabel>Rank & award</SectionLabel>
              <RankAwardCard rank={myRank} awards={myAwards} />
            </PanelSection>
          </Panel>
        </div>

        {/* ── Aktivitas klinis ── */}
        <div style={{ gridColumn: '1 / -1' }}>
          <Panel>
            <PanelSection>
              <SectionLabel>Aktivitas klinis</SectionLabel>
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 'fit-content', maxWidth: '100%' }}
              >
                <span style={{ fontSize: 14, color: L.muted }}>
                  {activityFailed ? (
                    'Aktivitas belum bisa dimuat.'
                  ) : (
                    <>
                      <span style={{ fontWeight: 600, color: L.text }}>
                        {(activityDays ?? []).reduce((sum, day) => sum + day.count, 0).toLocaleString('id-ID')}
                      </span>{' '}
                      laporan klinis dalam setahun terakhir
                    </>
                  )}
                </span>
                <ContributionHeatmap data={activityDays ?? emptyActivity} />
                <div style={{ alignSelf: 'flex-end' }}>
                  <HeatmapLegend />
                </div>
              </div>
            </PanelSection>
          </Panel>
        </div>
      </div>

      {isProfileEditorOpen ? (
        <div className="ui-dialog-backdrop">
          <div className="ui-dialog profile-editor-modal" style={{ maxWidth: 960 }}>
            <div className="ui-dialog__header" style={{ alignItems: 'flex-start' }}>
              <div>
                <h2 className="ui-dialog__title">Edit Profil</h2>
                <p className="home-card__text" style={{ marginTop: 4 }}>
                  Lengkapi data personal dan kredensial yang akan tampil di halaman profile. Avatar
                  dipilih otomatis sesuai profesi dan jenis kelamin.
                </p>
              </div>
              <button
                type="button"
                className="ui-btn ui-btn--ghost ui-btn--sm"
                onClick={() => {
                  setProfileDraft(profile)
                  setProfileError('')
                  setProfileSaveMessage('')
                  resetProfileSelectionInputs()
                  setIsProfileEditorOpen(false)
                }}
              >
                Tutup
              </button>
            </div>

            <div className="ui-dialog__body" style={{ display: 'grid', gap: 24 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: 16,
                }}
              >
                {editorTextField('fullName', 'Nama lengkap')}

                <div
                  className="gelar-section ui-field"
                  style={{ gridColumn: '1 / -1' }}
                >
                  <span className="ui-field__label">Gelar</span>
                  <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'minmax(0, 1fr)' }}>
                    <select
                      className="ui-input"
                      value={selectedDegreeOption}
                      onChange={(event) => {
                        const nextDegree = event.target.value as CrewProfileDegree
                        if (!nextDegree) return
                        addProfileDegree(nextDegree)
                        setSelectedDegreeOption('')
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
                            style={removablePillStyle}
                          >
                            {degree} ×
                          </button>
                        ))
                      ) : (
                        <span style={{ fontSize: 14, color: L.muted }}>
                          Belum ada gelar dipilih.
                        </span>
                      )}
                    </div>
                    <div className="ui-field__hint">
                      Pilih sampai {CREW_PROFILE_MAX_DEGREES} gelar.
                    </div>
                  </div>
                </div>

                {editorTextField('birthPlace', 'Tempat lahir')}

                <label className="ui-field">
                  <span className="ui-field__label">Tanggal lahir</span>
                  <input
                    className="ui-input"
                    type="date"
                    value={profileDraft.birthDate}
                    onChange={(event) =>
                      setProfileDraft((current) => ({
                        ...current,
                        birthDate: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="ui-field">
                  <span className="ui-field__label">Jenis kelamin</span>
                  <select
                    className="ui-input"
                    value={profileDraft.gender}
                    onChange={(event) =>
                      setProfileDraft((current) => ({
                        ...current,
                        gender: event.target.value as CrewAccessGender | '',
                      }))
                    }
                  >
                    <option value="">Pilih</option>
                    {CREW_ACCESS_GENDERS.map((gender) => (
                      <option key={gender} value={gender}>
                        {gender}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="ui-field">
                  <span className="ui-field__label">Golongan darah</span>
                  <select
                    className="ui-input"
                    value={profileDraft.bloodType}
                    onChange={(event) =>
                      setProfileDraft((current) => ({
                        ...current,
                        bloodType: event.target.value as CrewProfileData['bloodType'],
                      }))
                    }
                  >
                    <option value="">Pilih</option>
                    {CREW_PROFILE_BLOOD_TYPES.map((bloodType) => (
                      <option key={bloodType} value={bloodType}>
                        {bloodType}
                      </option>
                    ))}
                  </select>
                </label>

                {editorTextField('domicile', 'Domisili', undefined, true)}

                <label className="ui-field">
                  <span className="ui-field__label">Institusi utama</span>
                  <input
                    className="ui-input"
                    value={sessionUser?.institution || 'Belum diisi'}
                    disabled
                    style={{ opacity: 0.82 }}
                  />
                </label>

                <div className="ui-field" style={{ gap: 12, gridColumn: '1 / -1' }}>
                  <span className="ui-field__label">Role Sentra dan posisi</span>
                  <div style={{ display: 'grid', gap: 16 }}>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <span style={{ fontSize: 14, color: L.muted }}>Role Sentra</span>
                      <select
                        className="ui-input"
                        value={selectedSentraRoleOption}
                        onChange={(event) => {
                          const nextRole = event.target.value as CrewProfilePosition
                          if (!nextRole) return
                          addProfileJobTitle(nextRole)
                          setSelectedSentraRoleOption('')
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
                              style={removablePillStyle}
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
                      <span style={{ fontSize: 14, color: L.muted }}>Posisi</span>
                      <select
                        className="ui-input"
                        value={selectedStructuralPositionOption}
                        onChange={(event) => {
                          const nextPosition = event.target.value as CrewProfilePosition
                          if (!nextPosition) return
                          addProfileJobTitle(nextPosition)
                          setSelectedStructuralPositionOption('')
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
                              style={removablePillStyle}
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
                  <div className="ui-field__hint">
                    Pilih sampai {CREW_PROFILE_MAX_POSITIONS} item gabungan untuk role sentra dan
                    posisi.
                  </div>
                </div>

                {editorTextField('whatsappNumber', 'WhatsApp aktif', '+62 8xx xxxx xxxx')}
                {editorTextField('githubUrl', 'GitHub', 'github.com/username')}
                {editorTextField('linkedinUrl', 'LinkedIn', 'linkedin.com/in/username')}
                {editorTextField('gravatarUrl', 'Gravatar', 'gravatar.com/username')}
                {editorTextField('blogUrl', 'Blog', 'blog.drferdi.id')}
                {editorTextField('instagramUrl', 'Instagram', 'instagram.com/username')}
                {editorTextField('tiktokUrl', 'TikTok', 'tiktok.com/@username')}
                {editorTextField('youtubeUrl', 'YouTube', 'youtube.com/@channel')}
                {editorTextField('employeeId', 'NIP')}
                {editorTextField('strNumber', 'STR')}
                {editorTextField('sipNumber', 'SIP')}

                <div className="ui-field" style={{ gridColumn: '1 / -1' }}>
                  <span className="ui-field__label">Avatar</span>
                  <div style={{ fontSize: 14, color: L.muted }}>
                    Avatar dipilih otomatis berdasarkan profesi, jenis kelamin, dan konteks layanan.
                  </div>
                </div>
              </div>

              {profileError ? (
                <div className="ui-alert ui-alert--critical">{profileError}</div>
              ) : null}

              {profileSaveMessage ? (
                <div className="ui-alert ui-alert--success">{profileSaveMessage}</div>
              ) : null}
            </div>

            <div className="ui-dialog__footer">
              <button
                type="button"
                className="ui-btn ui-btn--secondary"
                onClick={() => {
                  setProfileDraft(profile)
                  setProfileError('')
                  setProfileSaveMessage('')
                  setIsProfileEditorOpen(false)
                }}
              >
                Batal
              </button>
              <button
                type="button"
                className="ui-btn ui-btn--primary"
                onClick={() => {
                  void saveProfile()
                }}
                disabled={profileSaving}
                style={{ cursor: profileSaving ? 'wait' : 'pointer' }}
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
