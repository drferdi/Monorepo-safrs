'use client'

import { usePathname } from 'next/navigation'
import { type FormEvent, type ReactNode, useEffect, useState } from 'react'

import {
  CREW_ACCESS_GENDERS,
  CREW_ACCESS_INSTITUTIONS_SEED,
  CREW_ACCESS_PROFESSIONS,
  CREW_ACCESS_SERVICE_AREAS,
  type CrewAccessGender,
  type CrewAccessInstitution,
  type CrewAccessProfession,
  type CrewAccessServiceArea,
  getCrewProfessionLogo,
  professionRequiresServiceArea,
} from '@/lib/crew-access'
import {
  CREW_PROFILE_DEGREES,
  CREW_PROFILE_MAX_POSITIONS,
  CREW_PROFILE_POSITIONS,
  type CrewProfileDegree,
  type CrewProfilePosition,
} from '@/lib/crew-profile'
import { safeUrl } from '@/lib/sanitize-url'

// Route publik yang tidak memerlukan autentikasi crew
const PUBLIC_PATHS = ['/join']

interface CrewAccessGateProps {
  children: ReactNode
}

export default function CrewAccessGate({ children }: CrewAccessGateProps) {
  const pathname = usePathname()
  const isPublicPath = PUBLIC_PATHS.some(
    (publicPath) => pathname === publicPath || pathname.startsWith(`${publicPath}/`)
  )
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'register'>('signin')
  const [usernameInput, setUsernameInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [registerEmailInput, setRegisterEmailInput] = useState('')
  const [registerUsernameInput, setRegisterUsernameInput] = useState('')
  const [registerPasswordInput, setRegisterPasswordInput] = useState('')
  const [institutionList, setInstitutionList] = useState<string[]>([
    ...CREW_ACCESS_INSTITUTIONS_SEED,
  ])
  const [registerInstitution, setRegisterInstitution] = useState<CrewAccessInstitution>(
    CREW_ACCESS_INSTITUTIONS_SEED[0]
  )
  const [registerProfession, setRegisterProfession] = useState<CrewAccessProfession>(
    CREW_ACCESS_PROFESSIONS[0]
  )
  const [registerStep, setRegisterStep] = useState<1 | 2 | 3>(1)
  const [registerFullName, setRegisterFullName] = useState('')
  const [registerBirthPlace, setRegisterBirthPlace] = useState('')
  const [registerBirthDate, setRegisterBirthDate] = useState('')
  const [registerGender, setRegisterGender] = useState<CrewAccessGender>(CREW_ACCESS_GENDERS[0])
  const [registerDomicile, setRegisterDomicile] = useState('')
  const [registerDegrees, setRegisterDegrees] = useState<CrewProfileDegree[]>([])
  const [registerJobTitles, setRegisterJobTitles] = useState<CrewProfilePosition[]>([])
  const [registerEmployeeId, setRegisterEmployeeId] = useState('')
  const [registerStrNumber, setRegisterStrNumber] = useState('')
  const [registerSipNumber, setRegisterSipNumber] = useState('')
  const [registerServiceAreas, setRegisterServiceAreas] = useState<CrewAccessServiceArea[]>([])
  const [registerServiceAreaOther, setRegisterServiceAreaOther] = useState('')
  const [registerErrorMessage, setRegisterErrorMessage] = useState('')
  const [registerSuccessMessage, setRegisterSuccessMessage] = useState('')
  const selectedProfessionLogo = getCrewProfessionLogo(registerProfession)

  function resetRegisterForm() {
    setRegisterStep(1)
    setRegisterEmailInput('')
    setRegisterUsernameInput('')
    setRegisterPasswordInput('')
    setRegisterInstitution(institutionList[0] ?? CREW_ACCESS_INSTITUTIONS_SEED[0])
    setRegisterProfession(CREW_ACCESS_PROFESSIONS[0])
    setRegisterFullName('')
    setRegisterBirthPlace('')
    setRegisterBirthDate('')
    setRegisterGender(CREW_ACCESS_GENDERS[0])
    setRegisterDomicile('')
    setRegisterDegrees([])
    setRegisterJobTitles([])
    setRegisterEmployeeId('')
    setRegisterStrNumber('')
    setRegisterSipNumber('')
    setRegisterServiceAreas([])
    setRegisterServiceAreaOther('')
  }

  function toggleRegisterServiceArea(area: CrewAccessServiceArea) {
    setRegisterServiceAreas((current) =>
      current.includes(area) ? current.filter((item) => item !== area) : [...current, area]
    )
  }

  function toggleRegisterDegree(degree: CrewProfileDegree) {
    setRegisterDegrees((current) =>
      current.includes(degree) ? current.filter((item) => item !== degree) : [...current, degree]
    )
  }

  function toggleRegisterJobTitle(jobTitle: CrewProfilePosition) {
    setRegisterJobTitles((current) => {
      if (current.includes(jobTitle)) {
        return current.filter((item) => item !== jobTitle)
      }

      if (current.length >= CREW_PROFILE_MAX_POSITIONS) {
        return current
      }

      return [...current, jobTitle]
    })
  }

  function validateRegisterStep(step: 1 | 2 | 3): string | null {
    if (step === 1) {
      const email = registerEmailInput.trim().toLowerCase()
      const username = registerUsernameInput.trim().toLowerCase()
      if (!email) return 'Email wajib diisi.'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Format email belum valid.'
      if (!username) return 'Username wajib diisi.'
      if (!/^[a-z0-9._-]{4,32}$/.test(username))
        return 'Username harus 4-32 karakter dan hanya boleh huruf kecil, angka, titik, strip, atau underscore.'
      if (registerPasswordInput.length < 15) return 'Password minimal 15 karakter.'
      return null
    }

    if (step === 2) {
      if (registerFullName.trim().length < 3) return 'Nama lengkap wajib diisi.'
      if (registerBirthPlace.trim().length < 2) return 'Tempat lahir wajib diisi.'
      if (!registerBirthDate) return 'Tanggal lahir wajib diisi.'
      if (registerDomicile.trim().length < 3) return 'Domisili wajib diisi.'
      if (registerJobTitles.length === 0) return 'Pilih minimal satu jabatan atau posisi.'
      return null
    }

    if (registerJobTitles.length > CREW_PROFILE_MAX_POSITIONS) {
      return `Jabatan atau posisi maksimal ${CREW_PROFILE_MAX_POSITIONS} pilihan.`
    }

    if (professionRequiresServiceArea(registerProfession) && registerServiceAreas.length === 0) {
      return 'Pilih minimal satu bidang layanan untuk profesi klinis.'
    }

    if (registerServiceAreas.includes('Lainnya') && registerServiceAreaOther.trim().length < 3) {
      return 'Isi detail bidang layanan lain.'
    }

    return null
  }

  useEffect(() => {
    if (isPublicPath) {
      setIsCheckingSession(false)
      setIsAuthenticated(true)
      return
    }

    let isMounted = true

    async function checkSession() {
      try {
        const response = await fetch('/api/auth/session', {
          cache: 'no-store',
          credentials: 'include',
        })
        if (!isMounted) return
        setIsAuthenticated(response.ok)
      } catch {
        if (!isMounted) return
        setIsAuthenticated(false)
      } finally {
        // No `return` inside finally: it would swallow an in-flight throw.
        if (isMounted) setIsCheckingSession(false)
      }
    }

    void checkSession()

    return () => {
      isMounted = false
    }
  }, [isPublicPath])

  // Fetch dynamic institution list for registration form
  useEffect(() => {
    if (authMode !== 'register') return
    let alive = true
    fetch('/api/institutions')
      .then((r) => (r.ok ? (r.json() as Promise<{ institutions?: string[] }>) : null))
      .then((d) => {
        if (!alive || !d?.institutions?.length) return
        const institutions = d.institutions
        setInstitutionList(institutions)
        setRegisterInstitution((prev) =>
          institutions.includes(prev) ? prev : (institutions[0] ?? prev)
        )
      })
      .catch(() => {
        if (!alive) return
        setInstitutionList([...CREW_ACCESS_INSTITUTIONS_SEED])
      })
    return () => {
      alive = false
    }
  }, [authMode])

  // Bypass auth untuk route publik (halaman join pasien)
  if (isPublicPath) {
    return <>{children}</>
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: usernameInput,
          password: passwordInput,
        }),
      })

      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean
        error?: string
      } | null
      if (!response.ok || !payload?.ok) {
        if (response.status === 429) {
          const ra = response.headers.get('Retry-After')
          setErrorMessage(
            payload?.error ||
              (ra
                ? `Terlalu banyak percobaan login. Tunggu ±${ra} detik lalu coba lagi.`
                : 'Terlalu banyak percobaan login. Coba lagi dalam beberapa menit.')
          )
          return
        }
        setErrorMessage(payload?.error || 'Username/email atau password tidak valid.')
        return
      }

      setIsAuthenticated(true)
      setPasswordInput('')
    } catch {
      setErrorMessage('Gagal terhubung ke server autentikasi.')
    } finally {
      setIsSubmitting(false)
      setIsCheckingSession(false)
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setRegisterErrorMessage('')
    setRegisterSuccessMessage('')

    const stepError = validateRegisterStep(registerStep)
    if (stepError) {
      setRegisterErrorMessage(stepError)
      return
    }

    if (registerStep < 3) {
      setRegisterStep((current) => (current + 1) as 1 | 2 | 3)
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: registerEmailInput,
          username: registerUsernameInput,
          password: registerPasswordInput,
          institution: registerInstitution,
          profession: registerProfession,
          fullName: registerFullName,
          birthPlace: registerBirthPlace,
          birthDate: registerBirthDate,
          gender: registerGender,
          domicile: registerDomicile,
          degrees: registerDegrees,
          jobTitles: registerJobTitles,
          employeeId: registerEmployeeId,
          strNumber: registerStrNumber,
          sipNumber: registerSipNumber,
          serviceAreas: registerServiceAreas,
          serviceAreaOther: registerServiceAreaOther,
        }),
      })

      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean
        error?: string
        message?: string
      } | null
      if (!response.ok || !payload?.ok) {
        setRegisterErrorMessage(payload?.error || 'Pendaftaran tidak dapat diproses.')
        return
      }

      setRegisterSuccessMessage(
        payload.message ||
          'Pendaftaran diterima. Tim admin akan melakukan review sebelum akses diaktifkan.'
      )
      resetRegisterForm()
    } catch {
      setRegisterErrorMessage('Gagal terhubung ke server pendaftaran.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isCheckingSession) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: 'var(--surface-subtle)',
          color: 'var(--text-secondary)',
          fontSize: 13,
        }}
      >
        Memeriksa akses crew…
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: 'var(--surface-subtle)',
          padding: 24,
        }}
      >
        <form
          onSubmit={authMode === 'signin' ? handleSubmit : handleRegister}
          style={{
            width: '100%',
            maxWidth: authMode === 'register' ? 560 : 420,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-dialog)',
            borderRadius: 16,
            padding: 32,
            display: 'grid',
            gap: 16,
          }}
        >
          <div style={{ marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img
                src="/sentra-mark.png"
                alt=""
                width={22}
                height={22}
              />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text)',
                }}
              >
                MedBoard
              </span>
            </div>
            <div className="ui-tabs" role="tablist" aria-label="Mode akses" style={{ marginTop: 16 }}>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin')
                  setErrorMessage('')
                  setRegisterErrorMessage('')
                  setRegisterSuccessMessage('')
                  setRegisterStep(1)
                }}
                role="tab"
                className="ui-tab"
                aria-selected={authMode === 'signin'}
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register')
                  setErrorMessage('')
                  setRegisterErrorMessage('')
                  setRegisterSuccessMessage('')
                  setRegisterStep(1)
                }}
                role="tab"
                className="ui-tab"
                aria-selected={authMode === 'register'}
              >
                Daftar Akses
              </button>
            </div>
            <h1
              style={{
                margin: '20px 0 4px',
                fontWeight: 600,
                fontSize: 24,
                color: 'var(--text)',
              }}
            >
              {authMode === 'signin' ? 'Sign In' : 'Request Access'}
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: 'var(--text-secondary)',
              }}
            >
              {authMode === 'signin'
                ? 'Gunakan username atau email crew yang sudah aktif.'
                : 'Form dibuat bertahap agar data akun, profil, dan kredensial tetap rapi untuk review admin.'}
            </p>
          </div>

          {authMode === 'signin' ? (
            <>
              <label className="ui-field">
                <span className="ui-field__label">
                  Username atau email
                </span>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(event) => setUsernameInput(event.target.value)}
                  autoComplete="username"
                  placeholder="contoh: drferdiplus atau drferdiplus.id@gmail.com"
                  className="ui-input"
                />
              </label>

              <label className="ui-field">
                <span className="ui-field__label">Password</span>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(event) => setPasswordInput(event.target.value)}
                  autoComplete="current-password"
                  placeholder="masukkan password"
                  className="ui-input"
                />
              </label>

              {errorMessage ? (
                <p
                  style={{
                    margin: 0,
                    color: 'var(--critical)',
                    fontSize: 13,
                  }}
                >
                  {errorMessage}
                </p>
              ) : null}
            </>
          ) : (
            <>
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[1, 2, 3].map((step) => {
                    const isActive = registerStep === step
                    const isDone = registerStep > step
                    return (
                      <div
                        key={step}
                        style={{
                          flex: 1,
                          height: 8,
                          borderRadius: 999,
                          background: isActive || isDone ? 'var(--c-asesmen)' : 'var(--line-base)',
                          opacity: isActive ? 1 : isDone ? 0.75 : 0.45,
                        }}
                      />
                    )
                  })}
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    color: 'var(--text-muted)',
                    letterSpacing: '0.04em',
                  }}
                >
                  {registerStep === 1
                    ? 'Langkah 1 dari 3: akun inti'
                    : registerStep === 2
                      ? 'Langkah 2 dari 3: profil dasar'
                      : 'Langkah 3 dari 3: kredensial profesi'}
                </p>
              </div>

              {registerStep === 1 ? (
                <>
                  <label className="ui-field">
                    <span className="ui-field__label">Email</span>
                    <input
                      type="email"
                      value={registerEmailInput}
                      onChange={(event) => setRegisterEmailInput(event.target.value)}
                      autoComplete="email"
                      placeholder="nama@institusi.go.id"
                      className="ui-input"
                    />
                  </label>

                  <label className="ui-field">
                    <span className="ui-field__label">Username</span>
                    <input
                      type="text"
                      value={registerUsernameInput}
                      onChange={(event) => setRegisterUsernameInput(event.target.value)}
                      autoComplete="username"
                      placeholder="4-32 karakter, huruf kecil/angka"
                      className="ui-input"
                    />
                  </label>

                  <label className="ui-field">
                    <span className="ui-field__label">Password</span>
                    <input
                      type="password"
                      value={registerPasswordInput}
                      onChange={(event) => setRegisterPasswordInput(event.target.value)}
                      autoComplete="new-password"
                      placeholder="minimal 15 karakter"
                      className="ui-input"
                    />
                  </label>

                  <label className="ui-field">
                    <span className="ui-field__label">Institusi</span>
                    <select
                      value={registerInstitution}
                      onChange={(event) =>
                        setRegisterInstitution(event.target.value as CrewAccessInstitution)
                      }
                      className="ui-input"
                    >
                      {institutionList.map((institution) => (
                        <option key={institution} value={institution}>
                          {institution}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="ui-field">
                    <span className="ui-field__label">Profesi</span>
                    <select
                      value={registerProfession}
                      onChange={(event) =>
                        setRegisterProfession(event.target.value as CrewAccessProfession)
                      }
                      className="ui-input"
                    >
                      {CREW_ACCESS_PROFESSIONS.map((profession) => (
                        <option key={profession} value={profession}>
                          {profession}
                        </option>
                      ))}
                    </select>
                  </label>

                  {selectedProfessionLogo ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1px solid var(--line-base)',
                        background: 'var(--bg-canvas)',
                      }}
                    >
                      <img
                        src={safeUrl(selectedProfessionLogo, '/logo/profession-default.png')}
                        alt={`Logo ${registerProfession}`}
                        style={{
                          width: 34,
                          height: 34,
                          objectFit: 'contain',
                        }}
                      />
                      <div style={{ display: 'grid', gap: 2 }}>
                        <span
                          style={{
                            fontSize: 14,
                            color: 'var(--text-main)',
                            letterSpacing: '0.04em',
                          }}
                        >
                          Organisasi profesi terdeteksi
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {registerProfession}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}

              {registerStep === 2 ? (
                <>
                  <label className="ui-field">
                    <span className="ui-field__label">Nama lengkap</span>
                    <input
                      type="text"
                      value={registerFullName}
                      onChange={(event) => setRegisterFullName(event.target.value)}
                      placeholder="contoh: dr. Ferdi Iskandar"
                      className="ui-input"
                    />
                  </label>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 12,
                    }}
                  >
                    <label className="ui-field">
                      <span className="ui-field__label">Tempat lahir</span>
                      <input
                        type="text"
                        value={registerBirthPlace}
                        onChange={(event) => setRegisterBirthPlace(event.target.value)}
                        placeholder="contoh: Kediri"
                        className="ui-input"
                      />
                    </label>

                    <label className="ui-field">
                      <span className="ui-field__label">
                        Tanggal lahir
                      </span>
                      <input
                        type="date"
                        value={registerBirthDate}
                        onChange={(event) => setRegisterBirthDate(event.target.value)}
                        className="ui-input"
                      />
                    </label>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 12,
                    }}
                  >
                    <label className="ui-field">
                      <span className="ui-field__label">
                        Jenis kelamin
                      </span>
                      <select
                        value={registerGender}
                        onChange={(event) =>
                          setRegisterGender(event.target.value as CrewAccessGender)
                        }
                        className="ui-input"
                      >
                        {CREW_ACCESS_GENDERS.map((gender) => (
                          <option key={gender} value={gender}>
                            {gender}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="gelar-section" style={{ display: 'grid', gap: 6 }}>
                      <span className="ui-field__label">Gelar</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {CREW_PROFILE_DEGREES.map((degree) => {
                          const isSelected = registerDegrees.includes(degree)
                          return (
                            <button
                              key={degree}
                              type="button"
                              onClick={() => toggleRegisterDegree(degree)}
                              style={{
                                minHeight: 36,
                                padding: '0 12px',
                                borderRadius: 999,
                                border: isSelected
                                  ? '1px solid var(--c-asesmen)'
                                  : '1px solid var(--line-base)',
                                background: isSelected
                                  ? 'var(--primary-tint)'
                                  : 'var(--bg-canvas)',
                                color: isSelected ? 'var(--text-main)' : 'var(--text-muted)',
                                fontSize: 14,
                                cursor: 'pointer',
                              }}
                            >
                              {degree}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  <label className="ui-field">
                    <span className="ui-field__label">Domisili</span>
                    <input
                      type="text"
                      value={registerDomicile}
                      onChange={(event) => setRegisterDomicile(event.target.value)}
                      placeholder="contoh: Kota Kediri"
                      className="ui-input"
                    />
                  </label>

                  <div style={{ display: 'grid', gap: 8 }}>
                    <span className="ui-field__label">
                      Jabatan / posisi
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {CREW_PROFILE_POSITIONS.map((jobTitle) => {
                        const isSelected = registerJobTitles.includes(jobTitle)
                        const isDisabled =
                          !isSelected && registerJobTitles.length >= CREW_PROFILE_MAX_POSITIONS
                        return (
                          <button
                            key={jobTitle}
                            type="button"
                            onClick={() => toggleRegisterJobTitle(jobTitle)}
                            disabled={isDisabled}
                            style={{
                              minHeight: 36,
                              padding: '0 12px',
                              borderRadius: 999,
                              border: isSelected
                                ? '1px solid var(--c-asesmen)'
                                : '1px solid var(--line-base)',
                              background: isSelected ? 'var(--primary-tint)' : 'var(--bg-canvas)',
                              color: isSelected ? 'var(--text-main)' : 'var(--text-muted)',
                              fontSize: 14,
                              cursor: isDisabled ? 'not-allowed' : 'pointer',
                              opacity: isDisabled ? 0.45 : 1,
                              textAlign: 'left',
                            }}
                          >
                            {jobTitle}
                          </button>
                        )
                      })}
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 14,
                        color: 'var(--text-muted)',
                      }}
                    >
                      Pilih 1 sampai {CREW_PROFILE_MAX_POSITIONS} jabatan/posisi.
                    </p>
                  </div>
                </>
              ) : null}

              {registerStep === 3 ? (
                <>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 12,
                    }}
                  >
                    <label className="ui-field">
                      <span className="ui-field__label">NIP</span>
                      <input
                        type="text"
                        value={registerEmployeeId}
                        onChange={(event) => setRegisterEmployeeId(event.target.value)}
                        placeholder="opsional"
                        className="ui-input"
                      />
                    </label>

                    <label className="ui-field">
                      <span className="ui-field__label">STR</span>
                      <input
                        type="text"
                        value={registerStrNumber}
                        onChange={(event) => setRegisterStrNumber(event.target.value)}
                        placeholder="opsional"
                        className="ui-input"
                      />
                    </label>
                  </div>

                  <label className="ui-field">
                    <span className="ui-field__label">SIP</span>
                    <input
                      type="text"
                      value={registerSipNumber}
                      onChange={(event) => setRegisterSipNumber(event.target.value)}
                      placeholder="opsional"
                      className="ui-input"
                    />
                  </label>

                  <div style={{ display: 'grid', gap: 8 }}>
                    <span className="ui-field__label">Bidang layanan</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {CREW_ACCESS_SERVICE_AREAS.map((area) => {
                        const isSelected = registerServiceAreas.includes(area)
                        return (
                          <button
                            key={area}
                            type="button"
                            onClick={() => toggleRegisterServiceArea(area)}
                            style={{
                              minHeight: 36,
                              padding: '0 12px',
                              borderRadius: 999,
                              border: isSelected
                                ? '1px solid var(--c-asesmen)'
                                : '1px solid var(--line-base)',
                              background: isSelected ? 'var(--primary-tint)' : 'var(--bg-canvas)',
                              color: isSelected ? 'var(--text-main)' : 'var(--text-muted)',
                              fontSize: 14,
                              cursor: 'pointer',
                            }}
                          >
                            {area}
                          </button>
                        )
                      })}
                    </div>
                    {professionRequiresServiceArea(registerProfession) ? (
                      <p
                        style={{
                          margin: 0,
                          fontSize: 14,
                          color: 'var(--text-muted)',
                        }}
                      >
                        Pilih minimal satu bidang layanan untuk profesi klinis.
                      </p>
                    ) : null}
                  </div>

                  {registerServiceAreas.includes('Lainnya') ? (
                    <label className="ui-field">
                      <span className="ui-field__label">
                        Bidang layanan lain
                      </span>
                      <input
                        type="text"
                        value={registerServiceAreaOther}
                        onChange={(event) => setRegisterServiceAreaOther(event.target.value)}
                        placeholder="contoh: Farmakologi klinis"
                        className="ui-input"
                      />
                    </label>
                  ) : null}
                </>
              ) : null}

              {registerErrorMessage ? (
                <p
                  style={{
                    margin: 0,
                    color: 'var(--c-critical)',
                    fontSize: 14,
                  }}
                >
                  {registerErrorMessage}
                </p>
              ) : null}

              {registerSuccessMessage ? (
                <p
                  style={{
                    margin: 0,
                    color: 'var(--c-asesmen)',
                    fontSize: 14,
                  }}
                >
                  {registerSuccessMessage}
                </p>
              ) : null}

              <div
                style={{
                  display: 'flex',
                  justifyContent: registerStep > 1 ? 'space-between' : 'flex-end',
                  gap: 12,
                }}
              >
                {registerStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setRegisterErrorMessage('')
                      setRegisterStep((current) => (current - 1) as 1 | 2 | 3)
                    }}
                    disabled={isSubmitting}
                    style={{
                      height: 42,
                      padding: '0 16px',
                      borderRadius: 8,
                      border: '1px solid var(--line-base)',
                      background: 'transparent',
                      color: 'var(--text-main)',
                      fontSize: 14,
                      cursor: 'pointer',
                    }}
                  >
                    Kembali
                  </button>
                ) : null}
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="ui-btn ui-btn--primary ui-btn--lg"
            style={{ marginTop: 4, width: '100%' }}
          >
            {isSubmitting
              ? 'Memproses...'
              : authMode === 'signin'
                ? 'Masuk'
                : registerStep < 3
                  ? 'Lanjut'
                  : 'Kirim Permohonan'}
          </button>

          <div
            style={{
              marginTop: 8,
              paddingTop: 16,
              borderTop: '1px solid var(--line-base)',
            }}
          >
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
              {authMode === 'signin'
                ? 'Kredensial aktif dikonfigurasi di server, tidak ditampilkan di UI.'
                : 'Best practice saat ini: password minimal 15 karakter, akun baru berstatus pending review, dan data klinis dipisah dari hak akses sistem.'}
            </p>
          </div>
        </form>
      </div>
    )
  }

  return <>{children}</>
}
