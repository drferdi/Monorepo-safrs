'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { isDoctorProfession } from '@/lib/crew-access'

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

function getRankBadgeSrc(role: string): string | null {
  switch (role) {
    case 'CEO':
      return '/ceo.png'
    case 'ADMINISTRATOR':
      return '/admin.png'
    default:
      return null
  }
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
      return '#db5b39'
    case 2:
      return '#9bd157'
    case 1:
      return '#f0b264'
    default:
      return 'rgba(255,255,255,0.04)'
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
  const rankBadgeSrc = getRankBadgeSrc(member?.role || '')
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
      accentColor: '#6ad36f',
    },
    {
      count: String(credentialChips.length).padStart(2, '0'),
      label: 'berkas',
      accent: accessRoleLabel.toUpperCase(),
      accentColor: '#ff5c49',
    },
    {
      count: String(Math.max(serviceAreas.length, jobTitle === 'Belum diatur' ? 0 : 1)).padStart(
        2,
        '0'
      ),
      label: 'area',
      accent: jobTitle !== 'Belum diatur' ? jobTitle.toUpperCase() : 'CREW',
      accentColor: '#f0b264',
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
    <div
      style={{
        width: '100%',
        display: 'grid',
        justifyItems: 'center',
        padding: '0 16px 48px',
      }}
    >
      <div
        style={{
          width: 'min(100%, 430px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              letterSpacing: '0.18em',
              color: 'var(--text-muted)',
            }}
          >
            CREW PROFILE LAB
          </p>
          <h1
            style={{
              margin: '8px 0 0',
              fontSize: 24,
              fontWeight: 600,
              color: 'var(--text-main)',
              letterSpacing: '-0.02em',
            }}
          >
            Preview Card
          </h1>
        </div>
        <Link
          href={`/hub/${encodeURIComponent(username)}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            borderRadius: 999,
            border: '1px solid var(--line-base)',
            background: 'rgba(255,255,255,0.03)',
            color: 'var(--text-main)',
            textDecoration: 'none',
            fontSize: 12,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          ← Kembali ke Profile
        </Link>
      </div>

      {loading ? (
        <div
          style={{
            width: 'min(100%, 430px)',
            borderRadius: 18,
            border: '1px solid var(--line-base)',
            background: 'linear-gradient(160deg, var(--bg-nav), var(--bg-card))',
            padding: '24px 22px',
            color: 'var(--text-muted)',
          }}
        >
          Memuat detail profile crew...
        </div>
      ) : error ? (
        <div
          style={{
            width: 'min(100%, 430px)',
            borderRadius: 18,
            border: '1px solid rgba(231,76,60,0.22)',
            background: 'linear-gradient(160deg, rgba(80,15,15,0.4), var(--bg-card))',
            padding: '24px 22px',
            color: 'var(--text-main)',
          }}
        >
          {error}
        </div>
      ) : (
        <div
          style={{
            width: 'min(100%, 430px)',
            borderRadius: 22,
            border: '1px solid rgba(138, 176, 168, 0.18)',
            padding: 6,
            background: 'linear-gradient(180deg, rgba(91,117,110,0.08), rgba(5,8,7,0.9))',
            boxShadow: '0 0 0 1px rgba(157,188,178,0.05), 0 18px 55px rgba(0,0,0,0.45)',
          }}
        >
          <div
            style={{
              position: 'relative',
              borderRadius: 18,
              overflow: 'hidden',
              border: '1px solid rgba(143,173,164,0.14)',
              background: [
                'linear-gradient(rgba(143,173,164,0.10) 1px, transparent 1px)',
                'linear-gradient(90deg, rgba(143,173,164,0.10) 1px, transparent 1px)',
                'radial-gradient(circle at top left, rgba(81, 139, 122, 0.12), transparent 34%)',
                'linear-gradient(180deg, #030707 0%, #040807 48%, #030606 100%)',
              ].join(','),
              backgroundSize: '100% 96px, 132px 100%, auto, auto',
              backgroundPosition: '0 0, 0 0, 0 0, 0 0',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 12,
                borderRadius: 14,
                border: '1px solid rgba(143,173,164,0.08)',
                pointerEvents: 'none',
              }}
            />

            <div
              style={{
                position: 'absolute',
                top: 18,
                left: 16,
                display: 'grid',
                gap: 8,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: 'rgba(194, 210, 203, 0.65)',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                }}
              >
                sentra
              </div>
              <img
                src="/sentralogo.png"
                alt="Sentra"
                style={{
                  width: 28,
                  height: 28,
                  objectFit: 'contain',
                  opacity: 0.76,
                }}
              />
            </div>

            <div
              style={{
                position: 'absolute',
                top: 26,
                right: 10,
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                fontSize: 10,
                color: 'rgba(186, 200, 194, 0.34)',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
              }}
            >
              {sideCode}
            </div>

            <div
              style={{
                position: 'absolute',
                left: 10,
                bottom: 160,
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                fontSize: 10,
                color: 'rgba(186, 200, 194, 0.34)',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              activity
            </div>

            <div
              style={{
                position: 'relative',
                zIndex: 1,
                padding: '72px 34px 28px 54px',
              }}
            >
              <div
                style={{
                  width: 92,
                  height: 92,
                  borderRadius: 999,
                  border: '1px solid rgba(109, 136, 167, 0.28)',
                  background:
                    'radial-gradient(circle at top, rgba(31, 51, 80, 0.34), rgba(9, 14, 18, 0.96))',
                  display: 'grid',
                  placeItems: 'center',
                  boxShadow:
                    '0 0 0 1px rgba(123, 149, 180, 0.10), inset 0 0 26px rgba(15, 26, 40, 0.7)',
                  marginBottom: 24,
                }}
              >
                <img
                  src={avatarUrl}
                  alt={fullName}
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: 999,
                    objectFit: 'cover',
                    filter: 'saturate(0.9) contrast(1.04)',
                  }}
                />
              </div>

              {rankBadgeSrc ? (
                <img
                  src={rankBadgeSrc}
                  alt={`Rank ${member?.role}`}
                  style={{
                    position: 'absolute',
                    top: 124,
                    right: 30,
                    width: 54,
                    height: 54,
                    objectFit: 'contain',
                    opacity: 0.92,
                  }}
                />
              ) : null}

              <div
                style={{
                  fontSize: 28,
                  lineHeight: 1.02,
                  color: '#f2f3ed',
                  letterSpacing: '-0.04em',
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  textTransform: 'lowercase',
                  marginBottom: 4,
                }}
              >
                {fullName}
              </div>
              {degreesLabel && (
                <div
                  style={{
                    fontSize: 11,
                    color: 'rgba(209, 214, 208, 0.48)',
                    letterSpacing: '0.04em',
                    marginBottom: 2,
                  }}
                >
                  {degreesLabel}
                </div>
              )}

              <div
                style={{
                  fontSize: 13,
                  color: 'rgba(209, 214, 208, 0.58)',
                  letterSpacing: '0.01em',
                  marginBottom: 22,
                }}
              >
                @{member?.username}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(14, minmax(0, 1fr))',
                  gap: 4,
                  padding: '10px 0 8px',
                  marginBottom: 14,
                }}
              >
                {activityCells.map((level, index) => (
                  <span
                    key={`${member?.username}-${index}`}
                    style={{
                      display: 'block',
                      width: '100%',
                      aspectRatio: '1 / 1',
                      border: '1px solid rgba(147, 170, 160, 0.12)',
                      background: getActivityCellColor(level),
                      boxShadow: level > 0 ? `0 0 12px ${getActivityCellColor(level)}22` : 'none',
                    }}
                  />
                ))}
              </div>

              <div
                style={{
                  marginBottom: 12,
                  fontSize: 10,
                  letterSpacing: '0.2em',
                  color: 'rgba(188, 205, 197, 0.38)',
                  textTransform: 'uppercase',
                }}
              >
                {activityCount} sinyal aktivitas terdeteksi
              </div>

              <div
                style={{
                  borderTop: '1px solid rgba(143,173,164,0.12)',
                  paddingTop: 8,
                  display: 'grid',
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                {summaryRows.map(row => (
                  <div
                    key={row.label}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) auto',
                      gap: 12,
                      alignItems: 'end',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 17,
                          fontWeight: 600,
                          color: '#e6e8df',
                          letterSpacing: '-0.04em',
                        }}
                      >
                        {row.count}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          color: 'rgba(214, 220, 214, 0.6)',
                          letterSpacing: '0.14em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {row.label}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: row.accentColor,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        textAlign: 'right',
                      }}
                    >
                      {row.accent}
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  borderTop: '1px solid rgba(143,173,164,0.12)',
                  paddingTop: 12,
                  display: 'grid',
                  gap: 8,
                }}
              >
                {footerMeta.map(item => (
                  <div
                    key={item}
                    style={{
                      fontSize: 11,
                      color: 'rgba(208, 214, 208, 0.54)',
                      letterSpacing: '0.04em',
                      lineHeight: 1.45,
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
