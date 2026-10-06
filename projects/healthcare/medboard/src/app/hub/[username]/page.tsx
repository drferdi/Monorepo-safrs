'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { isDoctorProfession } from '@/lib/crew-access'
import { resolveCrewRankBadgeSrc, resolveCrewSentraTitle } from '@/lib/crew-profile'
import { safeHref, safeUrl } from '@/lib/sanitize-url'
import styles from '../hub.module.css'

interface RosterMemberDetail {
  username: string
  displayName: string
  email: string
  institution: string
  profession: string
  role: string
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
    whatsappNumber: string
    githubUrl: string
    linkedinUrl: string
    gravatarUrl: string
    blogUrl: string
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

function joinValue(values: string[]): string {
  return values.length > 0 ? values.join(', ') : 'Belum diisi'
}

function normalizeExternalHref(value: string): string {
  if (!value) return ''
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}

function normalizeWhatsappHref(value: string): string {
  if (!value) return ''
  const digits = value.replace(/\D/g, '')
  if (digits.length < 8) return ''
  const international = digits.startsWith('0') ? `62${digits.slice(1)}` : digits
  return `https://wa.me/${international}`
}

type DetailProfileLink = {
  key: 'githubUrl' | 'linkedinUrl' | 'gravatarUrl' | 'blogUrl' | 'whatsappNumber' | 'email'
  label: string
  href: string
  iconSrc: string
  color: string
}

export default function HubProfileDetailPage() {
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
  const jobTitle = resolveCrewSentraTitle(member?.profile?.jobTitles ?? [], member?.role)
  const professionLabel = formatProfessionLabel(member?.profession || '')
  const accessRoleLabel = formatRole(member?.role || '')
  const shiftLabel = getShiftLabel(member?.profession || '')
  const avatarUrl = member?.profile?.avatarUrl || '/avatar.png'
  const rankBadgeSrc = resolveCrewRankBadgeSrc(member?.role || '', member?.profile?.jobTitles ?? [])
  const serviceAreas = member?.profile?.serviceAreas ?? []
  const serviceAreaLabel =
    serviceAreas.length > 0
      ? [
          ...serviceAreas,
          ...(member?.profile?.serviceAreaOther ? [member.profile.serviceAreaOther] : []),
        ].join(', ')
      : 'Belum diisi'
  const identityCards = [
    { label: 'Jabatan Sentra', value: jobTitle },
    { label: 'Profesi', value: professionLabel },
    { label: 'Role Sentra', value: accessRoleLabel },
  ]
  const detailCards = [
    {
      label: 'TTL',
      value:
        member?.profile?.birthPlace && member?.profile?.birthDate
          ? `${member.profile.birthPlace}, ${formatBirthDate(member.profile.birthDate)}`
          : 'Belum diisi',
    },
    { label: 'Domisili', value: member?.profile?.domicile || 'Belum diisi' },
    { label: 'Area Layanan', value: serviceAreaLabel },
    { label: 'Institusi', value: member?.institution || 'Belum diisi' },
  ]
  const credentialChips = [
    member?.profile?.employeeId ? 'NIP tersedia' : '',
    member?.profile?.strNumber ? 'STR tersimpan' : '',
    member?.profile?.sipNumber ? 'SIP tersimpan' : '',
  ].filter(Boolean)
  const profileLinks = [
    {
      key: 'githubUrl',
      label: 'GitHub',
      href: normalizeExternalHref(member?.profile?.githubUrl || ''),
      iconSrc: '/social/github.svg',
      color: '#d6d0c4',
    },
    {
      key: 'linkedinUrl',
      label: 'LinkedIn',
      href: normalizeExternalHref(member?.profile?.linkedinUrl || ''),
      iconSrc: '/social/linkedin.svg',
      color: '#78b6ff',
    },
    {
      key: 'gravatarUrl',
      label: 'Gravatar',
      href: normalizeExternalHref(member?.profile?.gravatarUrl || ''),
      iconSrc: '/social/gravatar.svg',
      color: '#f0b264',
    },
    {
      key: 'blogUrl',
      label: 'Blog',
      href: normalizeExternalHref(member?.profile?.blogUrl || ''),
      iconSrc: '/social/blog.svg',
      color: '#a5ddb1',
    },
    {
      key: 'whatsappNumber',
      label: 'WhatsApp',
      href: normalizeWhatsappHref(member?.profile?.whatsappNumber || ''),
      iconSrc: '/social/whatsapp.svg',
      color: '#25D366',
    },
    {
      key: 'email',
      label: 'Email',
      href: member?.email ? `mailto:${member.email}` : '',
      iconSrc: '/social/email.svg',
      color: '#d6d0c4',
    },
  ] satisfies DetailProfileLink[]
  const visibleProfileLinks = profileLinks.filter(item => Boolean(item.href))

  return (
    <div className={styles.page}>
      <div className="ui-page-header" style={{ marginBottom: 0 }}>
        <div>
          <p className={styles.meta}>Crew profile</p>
          <h1 className={styles.title}>Detail Roster</h1>
        </div>
        <div className="ui-page-header__actions">
          <Link
            href={`/hub/lab/${encodeURIComponent(username)}`}
            className="ui-btn ui-btn--secondary"
          >
            Buka Lab Preview
          </Link>
          <Link href="/hub" className="ui-btn ui-btn--ghost">
            ← Kembali ke Hub
          </Link>
        </div>
      </div>

      {loading ? (
        <div className={`${styles.card} ${styles.muted}`}>Memuat detail profile crew...</div>
      ) : error ? (
        <div className={`${styles.card} ${styles.status}`} style={{ borderLeftColor: 'var(--critical)' }}>
          {error}
        </div>
      ) : (
        <div className={styles.card}>
          <div className={styles.profileHead}>
            <img
              src={safeUrl(avatarUrl, '/avatar.png')}
              alt={fullName}
              className={styles.profileAvatar}
            />

            <div style={{ minWidth: 0, flex: 1, display: 'grid', gap: 'var(--gap-sm)' }}>
              <div className={styles.small}>@{member?.username}</div>
              <h2 className={styles.profileName}>{fullName}</h2>
              {degreesLabel && <div className={styles.small}>{degreesLabel}</div>}

              <div className={styles.badges}>
                {credentialChips.length > 0 ? (
                  credentialChips.map(item => (
                    <span key={item} className="ui-badge ui-badge--neutral">
                      {item}
                    </span>
                  ))
                ) : (
                  <span className="ui-badge ui-badge--neutral">Credential belum lengkap</span>
                )}
              </div>
            </div>

            {rankBadgeSrc ? (
              <img
                src={rankBadgeSrc}
                alt={`Rank ${member?.role}`}
                style={{ width: 120, height: 'auto', maxHeight: 120, objectFit: 'contain' }}
              />
            ) : null}
          </div>

          <hr className={styles.divider} />

          {/* Ringkasan profile — humanized */}
          <div className={styles.muted} style={{ lineHeight: 1.65 }}>
            {professionLabel} di{' '}
            <span style={{ color: 'var(--text)' }}>
              {member?.institution || 'institusi belum diisi'}
            </span>
            {jobTitle && jobTitle !== 'Belum ditentukan' ? `, menjabat sebagai ${jobTitle}` : ''}.
            {degreesLabel ? ` Menyandang gelar ${degreesLabel}.` : ''}
            {member?.email ? ` Dapat dihubungi melalui ${member.email}.` : ''}
          </div>

          <hr className={styles.divider} />

          <div className={styles.fields}>
            {[...identityCards, ...detailCards].map(item => (
              <div key={item.label} className={styles.field}>
                <span className={styles.fieldLabel}>{item.label}</span>
                <span className={styles.fieldValue}>{item.value}</span>
              </div>
            ))}
          </div>

          <hr className={styles.divider} />

          {/* Link Resmi — desain identik dengan halaman profile user */}
          <div className={styles.field}>
            <h3 className={styles.cardTitle}>Link Resmi</h3>
            <div className={styles.links} style={{ marginTop: 'var(--gap-sm)' }}>
              {profileLinks.map(item => {
                const hasLink = Boolean(item.href)
                const iconMask = (
                  <span
                    aria-hidden="true"
                    style={{
                      display: 'inline-block',
                      width: 24,
                      height: 24,
                      flexShrink: 0,
                      background: hasLink ? 'var(--primary)' : 'var(--text-secondary)',
                      opacity: hasLink ? 1 : 0.4,
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
                const shared: React.CSSProperties = {
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  textDecoration: 'none',
                }
                if (!hasLink) {
                  return (
                    <div key={item.key} title={item.label} style={shared}>
                      {iconMask}
                    </div>
                  )
                }
                return (
                  <a
                    key={item.key}
                    href={safeHref(item.href)}
                    target="_blank"
                    rel="noreferrer"
                    title={item.label}
                    style={shared}
                  >
                    {iconMask}
                  </a>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
