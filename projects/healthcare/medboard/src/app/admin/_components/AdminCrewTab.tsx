'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { safeUrl } from '@/lib/sanitize-url'
import { CREW_ACCESS_PROFESSIONS, CREW_ACCESS_SERVICE_AREAS } from '@/lib/crew-access'
import {
  CREW_PROFILE_BLOOD_TYPES,
  CREW_PROFILE_DEGREES,
  CREW_PROFILE_MAX_DEGREES,
  CREW_PROFILE_MAX_POSITIONS,
  CREW_PROFILE_POSITIONS,
  type CrewProfileData,
} from '@/lib/crew-profile'

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

/* ── Component ── */

export default function AdminCrewTab() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [institutions, setInstitutions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  /* Filters */
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterInstitution, setFilterInstitution] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  /* Selection */
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' })
      if (!res.ok) {
        setError('Gagal memuat data crew.')
        return
      }
      const data = (await res.json()) as { ok: boolean; users: UserRecord[] }
      if (data.ok) setUsers(data.users)
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

  useEffect(() => {
    void fetchUsers()
    void fetchInstitutions()
  }, [fetchUsers, fetchInstitutions])

  /* Filter logic */
  const filtered = users.filter(u => {
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

  const selectedUser = selectedUsername ? users.find(u => u.username === selectedUsername) : null

  if (loading) {
    return (
      <div
        style={{
          padding: '40px 0',
          color: 'var(--text-muted)',
          fontSize: 13,
          letterSpacing: '0.1em',
        }}
      >
        LOADING CREW...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '40px 0', color: 'var(--c-critical)', fontSize: 14 }}>{error}</div>
    )
  }

  const uniqueInstitutions = [...new Set(users.map(u => u.institution).filter(Boolean))]

  return (
    <div>
      {/* ── Search & Filters ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Cari nama, username, email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: 200,
            padding: '8px 12px',
            borderRadius: 6,
            border: '1px solid var(--line-base)',
            background: 'var(--bg-nav)',
            color: 'var(--text-main)',
            fontSize: 12,
            outline: 'none',
          }}
        />
        <select
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
          style={selectStyle}
        >
          <option value="">Semua Role</option>
          {ROLES.map(r => (
            <option key={r} value={r}>
              {formatRole(r)}
            </option>
          ))}
        </select>
        <select
          value={filterInstitution}
          onChange={e => setFilterInstitution(e.target.value)}
          style={selectStyle}
        >
          <option value="">Semua Institusi</option>
          {uniqueInstitutions.map(inst => (
            <option key={inst} value={inst}>
              {inst}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={selectStyle}
        >
          <option value="">Semua Status</option>
          <option value="ACTIVE">Aktif</option>
          <option value="INACTIVE">Nonaktif</option>
        </select>
      </div>

      {/* ── Count ── */}
      <p
        style={{
          margin: '0 0 14px',
          fontSize: 11,
          color: 'var(--text-muted)',
          letterSpacing: '0.1em',
        }}
      >
        {filtered.length} USER{filtered.length !== 1 ? 'S' : ''} DITEMUKAN
      </p>

      {/* ── User Table ── */}
      <div
        style={{
          borderRadius: 10,
          border: '1px solid var(--line-base)',
          background: 'var(--bg-nav)',
          overflow: 'hidden',
          marginBottom: selectedUser ? 20 : 0,
        }}
      >
        {filtered.length === 0 ? (
          <div
            style={{
              padding: 32,
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 12,
              opacity: 0.5,
            }}
          >
            Tidak ada user yang cocok
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line-base)' }}>
                {['Nama', 'Profesi', 'Role', 'Institusi', 'Status'].map(h => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 14px',
                      fontSize: 10,
                      letterSpacing: '0.12em',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                      textAlign: 'left',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const isActive = (u.status || 'ACTIVE') === 'ACTIVE'
                const isSelected = selectedUsername === u.username
                const degrees = u.profile?.degrees?.length
                  ? `, ${u.profile.degrees.join(', ')}`
                  : ''
                return (
                  <tr
                    key={u.username}
                    onClick={() => setSelectedUsername(isSelected ? null : u.username)}
                    style={{
                      borderBottom: '1px solid var(--line-base)',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(230,126,34,0.06)' : 'transparent',
                      opacity: isActive ? 1 : 0.5,
                    }}
                  >
                    <td style={{ padding: '10px 14px' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                        }}
                      >
                        <img
                          src={safeUrl(u.profile?.avatarUrl, '/avatar/doctor-m.png')}
                          alt={u.displayName}
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 6,
                            objectFit: 'cover',
                            background: 'var(--bg-canvas)',
                            border: '1px solid var(--line-base)',
                          }}
                        />
                        <div>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                              color: 'var(--text-main)',
                            }}
                          >
                            {u.profile?.fullName || u.displayName}
                            {degrees}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                            @{u.username}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: '10px 14px',
                        fontSize: 12,
                        color: 'var(--text-main)',
                      }}
                    >
                      {u.profession}
                    </td>
                    <td
                      style={{
                        padding: '10px 14px',
                        fontSize: 12,
                        color: 'var(--text-main)',
                      }}
                    >
                      {formatRole(u.role)}
                    </td>
                    <td
                      style={{
                        padding: '10px 14px',
                        fontSize: 11,
                        color: 'var(--text-muted)',
                      }}
                    >
                      {u.institution}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: '0.08em',
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: isActive ? 'rgba(76,175,80,0.12)' : 'rgba(231,76,60,0.12)',
                          color: isActive ? '#4CAF50' : 'var(--c-critical)',
                        }}
                      >
                        {isActive ? 'AKTIF' : 'NONAKTIF'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Detail / Edit Panel ── */}
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

/* ── Shared styles ── */

const selectStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: 6,
  border: '1px solid var(--line-base)',
  background: 'var(--bg-nav)',
  color: 'var(--text-main)',
  fontSize: 11,
  outline: 'none',
  cursor: 'pointer',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  borderRadius: 5,
  border: '1px solid var(--line-base)',
  background: 'var(--bg-canvas)',
  color: 'var(--text-main)',
  fontSize: 12,
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  letterSpacing: '0.1em',
  color: 'var(--text-muted)',
  marginBottom: 4,
  fontWeight: 600,
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
  const [degrees, setDegrees] = useState<string[]>(profile?.degrees || [])
  const [jobTitles, setJobTitles] = useState<string[]>(profile?.jobTitles || [])
  const [employeeId, setEmployeeId] = useState(profile?.employeeId || '')
  const [strNumber, setStrNumber] = useState(profile?.strNumber || '')
  const [sipNumber, setSipNumber] = useState(profile?.sipNumber || '')
  const [serviceAreas, setServiceAreas] = useState<string[]>(profile?.serviceAreas || [])
  const [serviceAreaOther, setServiceAreaOther] = useState(profile?.serviceAreaOther || '')
  const [institutionAdditional, setInstitutionAdditional] = useState(
    profile?.institutionAdditional || ''
  )

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
    setDegrees(p?.degrees || [])
    setJobTitles(p?.jobTitles || [])
    setEmployeeId(p?.employeeId || '')
    setStrNumber(p?.strNumber || '')
    setSipNumber(p?.sipNumber || '')
    setServiceAreas(p?.serviceAreas || [])
    setServiceAreaOther(p?.serviceAreaOther || '')
    setInstitutionAdditional(p?.institutionAdditional || '')
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
      setter(arr.filter(x => x !== item))
    } else {
      if (max && arr.length >= max) return
      setter([...arr, item])
    }
  }

  return (
    <div
      style={{
        borderRadius: 10,
        border: '1px solid rgba(230,126,34,0.2)',
        background: 'var(--bg-nav)',
        overflow: 'hidden',
      }}
    >
      {/* ── Toast Banner ── */}
      {saveMsg && (
        <div
          style={{
            padding: '10px 20px',
            background: saveMsgOk ? 'rgba(76,175,80,0.12)' : 'rgba(231,76,60,0.12)',
            borderBottom: saveMsgOk
              ? '1px solid rgba(76,175,80,0.3)'
              : '1px solid rgba(231,76,60,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: saveMsgOk ? '#4CAF50' : 'var(--c-critical)',
            }}
          >
            {saveMsgOk ? '\u2713' : '\u2717'} {saveMsg}
          </span>
          <button
            onClick={() => setSaveMsg('')}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--text-muted)',
              fontSize: 14,
              cursor: 'pointer',
              padding: '0 4px',
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>
      )}

      {/* Panel Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          borderBottom: '1px solid var(--line-base)',
        }}
      >
        <div>
          <span
            style={{
              fontSize: 11,
              letterSpacing: '0.15em',
              color: 'var(--text-muted)',
              fontWeight: 600,
            }}
          >
            EDIT USER
          </span>
          <span
            style={{
              fontSize: 13,
              color: 'var(--text-main)',
              marginLeft: 12,
              fontWeight: 500,
            }}
          >
            @{user.username}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            border: 'none',
            background: 'transparent',
            color: 'var(--text-muted)',
            fontSize: 18,
            cursor: 'pointer',
            padding: '0 4px',
            lineHeight: 1,
          }}
        >
          &times;
        </button>
      </div>

      <div
        style={{
          padding: '20px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 24,
        }}
      >
        {/* ── Left Column: Auth Fields ── */}
        <div>
          <p
            style={{
              margin: '0 0 14px',
              fontSize: 10,
              letterSpacing: '0.15em',
              color: 'var(--text-muted)',
              fontWeight: 600,
            }}
          >
            DATA AKUN
          </p>

          <div style={{ display: 'grid', gap: 10 }}>
            <div>
              <label style={labelStyle}>DISPLAY NAME</label>
              <input
                style={inputStyle}
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>EMAIL</label>
              <input
                style={inputStyle}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>INSTITUSI</label>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={institution}
                onChange={e => setInstitution(e.target.value)}
              >
                <option value="">— Pilih —</option>
                {institutions.map(inst => (
                  <option key={inst} value={inst}>
                    {inst}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>PROFESI</label>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={profession}
                onChange={e => setProfession(e.target.value)}
              >
                <option value="">— Pilih —</option>
                {CREW_ACCESS_PROFESSIONS.map(p => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>ROLE</label>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={role}
                onChange={e => setRole(e.target.value)}
              >
                {ROLES.map(r => (
                  <option key={r} value={r}>
                    {formatRole(r)}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSaveAuth}
              disabled={saving}
              style={{
                marginTop: 4,
                padding: '8px 0',
                borderRadius: 6,
                border: 'none',
                background: saving ? 'rgba(230,126,34,0.3)' : '#E67E22',
                color: '#fff',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.08em',
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'MENYIMPAN...' : 'SIMPAN AKUN'}
            </button>
          </div>

          {/* ── Actions ── */}
          <div style={{ marginTop: 20, display: 'grid', gap: 8 }}>
            <p
              style={{
                margin: '0 0 6px',
                fontSize: 10,
                letterSpacing: '0.15em',
                color: 'var(--text-muted)',
                fontWeight: 600,
              }}
            >
              AKSI
            </p>

            {!resetPwMode ? (
              <button onClick={() => setResetPwMode(true)} style={actionBtnStyle}>
                RESET PASSWORD
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="password"
                  placeholder="Password baru (min 8)"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  onClick={handleResetPassword}
                  disabled={saving}
                  style={{
                    ...actionBtnStyle,
                    padding: '7px 14px',
                    fontSize: 10,
                  }}
                >
                  SET
                </button>
                <button
                  onClick={() => {
                    setResetPwMode(false)
                    setNewPassword('')
                  }}
                  style={{
                    ...actionBtnStyle,
                    padding: '7px 10px',
                    fontSize: 10,
                    color: 'var(--text-muted)',
                  }}
                >
                  BATAL
                </button>
              </div>
            )}
            {pwMsg && (
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  color: pwMsg.includes('berhasil') ? '#4CAF50' : 'var(--c-critical)',
                }}
              >
                {pwMsg}
              </p>
            )}

            <button
              onClick={handleToggleStatus}
              disabled={saving}
              style={{
                ...actionBtnStyle,
                color: isInactive ? '#4CAF50' : 'var(--c-critical)',
                borderColor: isInactive ? 'rgba(76,175,80,0.3)' : 'rgba(231,76,60,0.3)',
              }}
            >
              {isInactive ? 'AKTIFKAN USER' : 'NONAKTIFKAN USER'}
            </button>
          </div>

          {
            /* save feedback now shown as toast banner at top of panel */
            false && <p style={{ margin: 0 }}>{saveMsg}</p>
          }
        </div>

        {/* ── Right Column: Profile Fields ── */}
        <div>
          <p
            style={{
              margin: '0 0 14px',
              fontSize: 10,
              letterSpacing: '0.15em',
              color: 'var(--text-muted)',
              fontWeight: 600,
            }}
          >
            DATA PROFIL
          </p>

          <div style={{ display: 'grid', gap: 10 }}>
            <div>
              <label style={labelStyle}>NAMA LENGKAP</label>
              <input
                style={inputStyle}
                value={fullName}
                onChange={e => setFullName(e.target.value)}
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
              }}
            >
              <div>
                <label style={labelStyle}>TEMPAT LAHIR</label>
                <input
                  style={inputStyle}
                  value={birthPlace}
                  onChange={e => setBirthPlace(e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>TANGGAL LAHIR</label>
                <input
                  style={inputStyle}
                  type="date"
                  value={birthDate}
                  onChange={e => setBirthDate(e.target.value)}
                />
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
              }}
            >
              <div>
                <label style={labelStyle}>GENDER</label>
                <select
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  value={gender}
                  onChange={e => setGender(e.target.value)}
                >
                  <option value="">— Pilih —</option>
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>GOLONGAN DARAH</label>
                <select
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  value={bloodType}
                  onChange={e => setBloodType(e.target.value)}
                >
                  <option value="">— Pilih —</option>
                  {CREW_PROFILE_BLOOD_TYPES.map(bt => (
                    <option key={bt} value={bt}>
                      {bt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={labelStyle}>DOMISILI</label>
              <input
                style={inputStyle}
                value={domicile}
                onChange={e => setDomicile(e.target.value)}
              />
            </div>

            {/* Degrees — chip toggle */}
            <div>
              <label style={labelStyle}>GELAR (maks {CREW_PROFILE_MAX_DEGREES})</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {CREW_PROFILE_DEGREES.map(d => (
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

            {/* Job Titles — grouped chip toggle */}
            <div>
              <label style={labelStyle}>JABATAN (maks {CREW_PROFILE_MAX_POSITIONS})</label>
              {jobTitles.length > 0 && (
                <div
                  style={{
                    marginBottom: 8,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 4,
                  }}
                >
                  {jobTitles.map(jt => (
                    <span
                      key={jt}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 4,
                        background: 'rgba(230,126,34,0.12)',
                        border: '1px solid rgba(230,126,34,0.3)',
                        color: 'var(--c-asesmen)',
                        fontSize: 10,
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      {jt}
                      <button
                        onClick={() => setJobTitles(jobTitles.filter(x => x !== jt))}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--c-asesmen)',
                          fontSize: 12,
                          cursor: 'pointer',
                          padding: 0,
                          lineHeight: 1,
                        }}
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div
                style={{
                  border: '1px solid var(--line-base)',
                  borderRadius: 6,
                  background: 'var(--bg-canvas)',
                  padding: 10,
                  maxHeight: 180,
                  overflowY: 'auto',
                  display: 'grid',
                  gap: 8,
                }}
              >
                <div>
                  <p
                    style={{
                      margin: '0 0 4px',
                      fontSize: 9,
                      letterSpacing: '0.12em',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                    }}
                  >
                    SENTRA
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {CREW_PROFILE_POSITIONS.filter((_, i) => i < 7).map(jt => (
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
                  <p
                    style={{
                      margin: '0 0 4px',
                      fontSize: 9,
                      letterSpacing: '0.12em',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                    }}
                  >
                    PUSKESMAS
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {CREW_PROFILE_POSITIONS.filter((_, i) => i >= 7).map(jt => (
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

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 10,
              }}
            >
              <div>
                <label style={labelStyle}>NIP</label>
                <input
                  style={inputStyle}
                  value={employeeId}
                  onChange={e => setEmployeeId(e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>STR</label>
                <input
                  style={inputStyle}
                  value={strNumber}
                  onChange={e => setStrNumber(e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>SIP</label>
                <input
                  style={inputStyle}
                  value={sipNumber}
                  onChange={e => setSipNumber(e.target.value)}
                />
              </div>
            </div>

            {/* Service Areas — chip toggle */}
            <div>
              <label style={labelStyle}>AREA LAYANAN</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {CREW_ACCESS_SERVICE_AREAS.map(sa => (
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
                  style={{ ...inputStyle, marginTop: 6 }}
                  placeholder="Sebutkan area layanan lainnya..."
                  value={serviceAreaOther}
                  onChange={e => setServiceAreaOther(e.target.value)}
                />
              )}
            </div>

            <div>
              <label style={labelStyle}>INSTITUSI TAMBAHAN</label>
              <input
                style={inputStyle}
                value={institutionAdditional}
                onChange={e => setInstitutionAdditional(e.target.value)}
              />
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={saving}
              style={{
                marginTop: 4,
                padding: '8px 0',
                borderRadius: 6,
                border: 'none',
                background: saving ? 'rgba(230,126,34,0.3)' : '#E67E22',
                color: '#fff',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.08em',
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'MENYIMPAN...' : 'SIMPAN PROFIL'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Action button style ── */

const actionBtnStyle: React.CSSProperties = {
  padding: '7px 0',
  borderRadius: 6,
  border: '1px solid var(--line-base)',
  background: 'transparent',
  color: 'var(--text-main)',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.08em',
  cursor: 'pointer',
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
      style={{
        padding: '3px 8px',
        borderRadius: 4,
        border: active ? '1px solid rgba(230,126,34,0.4)' : '1px solid var(--line-base)',
        background: active ? 'rgba(230,126,34,0.1)' : 'transparent',
        color: active ? 'var(--c-asesmen)' : disabled ? 'var(--text-muted)' : 'var(--text-muted)',
        fontSize: 10,
        fontWeight: active ? 600 : 400,
        cursor: disabled ? 'not-allowed' : 'pointer',
        letterSpacing: '0.04em',
        opacity: disabled ? 0.35 : 1,
      }}
    >
      {label}
    </button>
  )
}
