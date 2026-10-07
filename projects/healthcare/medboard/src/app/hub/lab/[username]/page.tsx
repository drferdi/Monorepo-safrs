'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LevelEdge, RankBadge } from '@/components/rank/RankBadge'
import { isDoctorProfession } from '@/lib/crew-access'
import type { CrewRankSummary } from '@/lib/crew-rank'
import styles from '../../hub.module.css'
import { ArrowLeft } from 'lucide-react'

interface RosterMemberDetail {
  username: string
  displayName: string
  email: string
  institution: string
  profession: string
  role: string
  rank?: CrewRankSummary
  profile: {
    fullName: string
    birthPlace: string
    birthDate: string
    gender: string
    domicile: string
    bloodType: string
    degrees: string[]
    jobTitles: string[]
    employeeId: string
    strNumber: string
    sipNumber: string
    serviceAreas: string[]
    serviceAreaOther: string
    institutionAdditional: string
    avatarUrl: string
  } | null
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

function formatBirthDate(value: string): string {
  if (!value) return 'Belum diisi'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return 'Belum diisi'
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function buildActivityMatrix(seed: string): number[] {
  const base = Array.from(seed).reduce(
    (sum, char, index) => sum + char.charCodeAt(0) * (index + 3),
    23
  )
  return Array.from({ length: 98 }, (_, index) => {
    const value = (base + index * 17 + seed.length * 11) % 23
    if (value >= 20) return 3
    if (value >= 17) return 2
    if (value >= 14) return 1
    return 0
  })
}

function getActivityCellColor(level: number): string {
  switch (level) {
    case 3:
      return 'var(--accent)'
    case 2:
      return 'var(--success)'
    case 1:
      return 'var(--warning)'
    default:
      return 'var(--surface-subtle)'
  }
}

export default function HubProfileLabPage() {
  const params = useParams<{ username: string }>()
  const username = Array.isArray(params?.username) ? params.username[0] : (params?.username ?? '')
  const [member, setMember] = useState<RosterMemberDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!username) {
      setLoading(false)
      setError('Username crew tidak valid.')
      return
    }

    const controller = new AbortController()

    async function loadMember() {
      try {
        setLoading(true)
        setError('')
        const response = await fetch(`/api/hub/roster/${encodeURIComponent(username)}`, {
          cache: 'no-store',
          signal: controller.signal,
        })
        const payload = (await response.json().catch(() => null)) as {
          ok?: boolean
          error?: string
          member?: RosterMemberDetail
        } | null

        if (!response.ok || !payload?.ok || !payload.member) {
          setMember(null)
          setError(payload?.error || 'Profile crew belum bisa dimuat.')
          return
        }

        setMember(payload.member)
      } catch (fetchError) {
        if (controller.signal.aborted) return
        setMember(null)
        setError(
          fetchError instanceof Error ? fetchError.message : 'Terjadi gangguan saat memuat profile.'
        )
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void loadMember()
    return () => controller.abort()
  }, [username])

  const fullName = member?.profile?.fullName || member?.displayName || username || 'Crew'
  const degreesLabel = member?.profile?.degrees?.length ? member.profile.degrees.join(', ') : ''
  const jobTitle = member?.profile?.jobTitles?.[0] || 'Belum diatur'
  const professionLabel = formatProfessionLabel(member?.profession || '')
  const accessRoleLabel = formatRole(member?.role || '')
  const shiftLabel = getShiftLabel(member?.profession || '')
  const avatarUrl = member?.profile?.avatarUrl || '/avatar.png'
  const serviceAreas = member?.profile?.serviceAreas ?? []
  const credentialChips = [
    member?.profile?.employeeId ? 'NIP tersedia' : '',
    member?.profile?.strNumber ? 'STR tersimpan' : '',
    member?.profile?.sipNumber ? 'SIP tersimpan' : '',
  ].filter(Boolean)
  const activityCells = buildActivityMatrix(
    [member?.username, member?.profession, member?.role, member?.profile?.jobTitles?.join(' ')]
      .filter(Boolean)
      .join('-')
  )
  const activityCount = activityCells.filter(level => level > 0).length
  const summaryRows = [
    {
      count: String(member?.profile?.degrees?.length ?? 0).padStart(2, '0'),
      label: 'gelar',
      accent: professionLabel.toUpperCase(),
      accentColor: 'var(--success)',
    },
    {
      count: String(credentialChips.length).padStart(2, '0'),
      label: 'berkas',
      accent: accessRoleLabel.toUpperCase(),
      accentColor: 'var(--accent)',
    },
    {
      count: String(Math.max(serviceAreas.length, jobTitle === 'Belum diatur' ? 0 : 1)).padStart(
        2,
        '0'
      ),
      label: 'area',
      accent: jobTitle !== 'Belum diatur' ? jobTitle.toUpperCase() : 'CREW',
      accentColor: 'var(--warning)',
    },
  ]
  const footerMeta = [
    member?.profile?.birthPlace && member?.profile?.birthDate
      ? `${member.profile.birthPlace}, ${formatBirthDate(member.profile.birthDate)}`
      : 'Bio belum lengkap',
    member?.profile?.domicile || member?.institution || 'Lokasi belum diisi',
    jobTitle !== 'Belum diatur' ? jobTitle : 'Jabatan Sentra belum diatur',
  ]
  const sideCode = `SN-${member?.username?.slice(0, 3).toUpperCase() ?? 'CRW'}-${String(activityCount).padStart(3, '0')}-${member?.role || 'HUB'}`

  return (
    <div className={styles.labPage}>
      <div className={styles.labBar}>
        <div>
          <p className={styles.meta}>Crew profile lab</p>
          <h1 className={styles.title}>Preview Card</h1>
        </div>
        <Link href={`/hub/${encodeURIComponent(username)}`} className="ui-btn ui-btn--ghost">
          <ArrowLeft size={14} /> Kembali ke Profile
        </Link>
      </div>

      {loading ? (
        <div className={`${styles.card} ${styles.muted}`} style={{ width: 'min(100%, 430px)' }}>
          Memuat detail profile crew...
        </div>
      ) : error ? (
        <div
          className={`${styles.card} ${styles.status}`}
          style={{ width: 'min(100%, 430px)', borderLeftColor: 'var(--critical)' }}
        >
          {error}
        </div>
      ) : (
        <div className={`${styles.idCard} ${styles.labCard}`}>
          <div className={styles.labBrand}>
            <div>sentra</div>
            <img src="/sentra-mark.png" alt="Sentra" />
          </div>

          <div className={styles.labSide}>{sideCode}</div>
          <div className={styles.labSideLeft}>activity</div>

          <img src={avatarUrl} alt={fullName} className={styles.labAvatar} />

          <div className={styles.labRank}>
            <RankBadge rank={member?.rank} size={52} />
          </div>
          <LevelEdge role={member?.role ?? ''} />

          <div className={styles.labName}>{fullName}</div>
          {degreesLabel && <div className={styles.small}>{degreesLabel}</div>}
          <div className={styles.labHandle}>@{member?.username}</div>

          <div className={styles.labMatrix}>
            {activityCells.map((level, index) => (
              <span
                key={`${member?.username}-${index}`}
                className={styles.labCell}
                style={{ background: getActivityCellColor(level) }}
              />
            ))}
          </div>

          <div className={styles.small}>{activityCount} sinyal aktivitas terdeteksi</div>

          <div className={styles.labBlock}>
            {summaryRows.map(row => (
              <div key={row.label} className={styles.labRow}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--gap-sm)' }}>
                  <span className={styles.labCount}>{row.count}</span>
                  <span className={styles.small}>{row.label}</span>
                </div>
                <div className={styles.small} style={{ color: row.accentColor, textAlign: 'right' }}>
                  {row.accent}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.labBlock}>
            {footerMeta.map(item => (
              <div key={item} className={styles.small}>
                {item}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
