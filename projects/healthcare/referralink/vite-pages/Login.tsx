import React, { useEffect, useRef, useState } from 'react'

import '../src/login.scss'
import { registerSandboxEmail, verifySandboxEmail } from '../services/authService'

interface LoginProps {
  onComplete: () => void | Promise<void>
}

type NotificationState = {
  title: string
  message: string
  tone: 'error' | 'info' | 'success'
} | null

type PendingSandboxRegistration = {
  email: string
  challengeToken: string
  expiresAt: string
}

const PENDING_REGISTRATION_KEY = 'medlink_sandbox_pending'
const CROSSHAIR_POSITIONS = [
  { x: '10%', y: '12%' },
  { x: '50%', y: '12%' },
  { x: '90%', y: '12%' },
  { x: '10%', y: '50%' },
  { x: '90%', y: '50%' },
  { x: '10%', y: '88%' },
  { x: '50%', y: '88%' },
  { x: '90%', y: '88%' },
]
const DATA_STREAM_LINES = [
  '0x7F3A 0x9E2C 0x4B1D',
  'SYN-ACK: 10.20.4.11',
  'AES_K: [REDACTED]',
  'NODE_04: SYNC_OK',
  'SHARD_07: REPLICATED',
  'NEURAL_W: 0.004712',
  'HASH: a3f7e2...d9c1',
]
const SOCIAL_LINKS = [
  { href: 'https://ferdiiskandar.com', label: 'Website' },
  { href: 'https://www.linkedin.com/in/dr-ferdi-iskandar-1b620a3b5', label: 'LinkedIn' },
  { href: 'https://x.com/ClaudesyI81047', label: 'X' },
  { href: 'https://medium.com/@codieverse', label: 'Medium' },
  { href: 'https://orcid.org/my-orcid?orcid=0009-0003-3788-1307', label: 'ORCID' },
]

function BrandMark() {
  return (
    <span className="login-brand-mark" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </span>
  )
}

function NeuralMeshLogo({ size = 200, animated = false }: { size?: number; animated?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="login-neural-mesh"
      role="img"
      aria-label="Sentra neural mesh mark"
    >
      <path
        d="M100 10 L180 55 L180 145 L100 190 L20 145 L20 55 Z"
        stroke="currentColor"
        strokeWidth="0.8"
        className={animated ? 'login-sketch-path' : ''}
      />
      <path
        d="M100 40 L150 70 L150 130 L100 160 L50 130 L50 70 Z"
        stroke="currentColor"
        strokeWidth="0.8"
        className={animated ? 'login-sketch-path' : ''}
      />
      {[
        'M100 40 L100 100',
        'M100 100 L150 130',
        'M100 100 L50 130',
        'M100 100 L100 160',
        'M100 100 L50 70',
        'M100 100 L150 70',
      ].map((d) => (
        <path
          key={d}
          d={d}
          stroke="currentColor"
          strokeWidth="0.8"
          className={animated ? 'login-sketch-path' : ''}
        />
      ))}
      {[
        'M100 10 L100 40',
        'M180 55 L150 70',
        'M180 145 L150 130',
        'M100 190 L100 160',
        'M20 145 L50 130',
        'M20 55 L50 70',
      ].map((d) => (
        <path
          key={d}
          d={d}
          stroke="currentColor"
          strokeWidth="1"
          className={animated ? 'login-sketch-path-accent' : 'login-neural-mesh__accent'}
        />
      ))}
      <circle
        cx="100"
        cy="100"
        r="6"
        stroke="currentColor"
        strokeWidth="1"
        className="login-neural-mesh__accent"
      />
      <circle cx="100" cy="100" r="12" stroke="currentColor" strokeWidth="0.5" />
      {[
        [100, 40],
        [150, 70],
        [150, 130],
        [100, 160],
        [50, 130],
        [50, 70],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3" stroke="currentColor" strokeWidth="0.8" />
      ))}
    </svg>
  )
}

function SplashScreen({ onDone }: { onDone: () => void }) {
  const [exiting, setExiting] = useState(false)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    const autoTimer = window.setTimeout(() => setExiting(true), 2800)
    return () => window.clearTimeout(autoTimer)
  }, [])

  useEffect(() => {
    if (!exiting) return
    const removeTimer = window.setTimeout(() => doneRef.current(), 1400)
    return () => window.clearTimeout(removeTimer)
  }, [exiting])

  return (
    <div className={`login-splash ${exiting ? 'is-exiting' : ''}`}>
      <div className="login-splash__backdrop" aria-hidden="true" />

      <div className="login-splash__content">
        <div className="login-splash__logo-wrap">
          <NeuralMeshLogo size={200} animated />
        </div>

        <div className="login-splash__copy">
          <h1 className="login-splash__title">
            <span className="login-splash__title-strong">Sentra</span>{' '}
            <span className="login-splash__title-light">MEDLINK</span>
          </h1>

          <p className="login-splash__subtitle">AI Powered Rujukan Cerdas</p>
          <p className="login-splash__meta">Architected &amp; Engineered by dr Ferdi Iskandar</p>

          <div className="login-splash__status">
            {[
              { label: 'Initializing_core_system...', tone: 'cyan' },
              { label: 'AES-256_Active', tone: 'green' },
              { label: 'Neural Mesh: Online', tone: 'cyan' },
            ].map((line, index) => (
              <div
                key={line.label}
                className="login-splash__status-row"
                style={{ animationDelay: `${0.75 + index * 0.15}s` }}
              >
                <span
                  className={`login-splash__status-dot login-splash__status-dot--${line.tone}`}
                />
                <span>{line.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        className={`login-splash__skip ${exiting ? 'is-hidden' : ''}`}
        onClick={() => setExiting(true)}
      >
        Skip intro
      </button>
    </div>
  )
}

const Login: React.FC<LoginProps> = ({ onComplete }) => {
  const [showSplash, setShowSplash] = useState(true)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [step, setStep] = useState<'register' | 'verify'>('register')
  const [email, setEmail] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [challengeToken, setChallengeToken] = useState('')
  const [notification, setNotification] = useState<NotificationState>(null)
  const [emailError, setEmailError] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sessionId, setSessionId] = useState('PENDING')
  const panelRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const targetRef = useRef({ x: 0, y: 0 })
  const currentRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    setSessionId(Math.random().toString(16).slice(2, 12).toUpperCase())
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PENDING_REGISTRATION_KEY)
      if (!raw) return

      const pending = JSON.parse(raw) as PendingSandboxRegistration | null
      if (!pending?.email || !pending?.challengeToken || !pending?.expiresAt) return

      if (new Date(pending.expiresAt).getTime() <= Date.now()) {
        localStorage.removeItem(PENDING_REGISTRATION_KEY)
        return
      }

      setAuthMode('login')
      setEmail(pending.email)
      setChallengeToken(pending.challengeToken)
      setStep('verify')
    } catch {
      // Login can continue when a previous browser session cannot be restored.
    }
  }, [])

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    let frame = 0
    const tick = () => {
      currentRef.current.x += (targetRef.current.x - currentRef.current.x) * 0.08
      currentRef.current.y += (targetRef.current.y - currentRef.current.y) * 0.08

      if (wrapRef.current) {
        wrapRef.current.style.transform = `rotateX(${currentRef.current.y}deg) rotateY(${currentRef.current.x}deg)`
      }

      frame = window.requestAnimationFrame(tick)
    }

    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [])

  const persistPending = (pending: PendingSandboxRegistration) => {
    try {
      localStorage.setItem(PENDING_REGISTRATION_KEY, JSON.stringify(pending))
    } catch {
      // Pending verification persistence is optional in the sandbox.
    }
  }

  const requestVerification = async (nextEmail: string) => {
    const result = await registerSandboxEmail(nextEmail)

    if (!result.success || !result.data) {
      setNotification({
        title: 'Verification failed',
        message:
          result.error?.message ||
          'Gagal mengirim email verifikasi sandbox. Coba lagi beberapa saat.',
        tone: 'error',
      })
      return false
    }

    const nextPending: PendingSandboxRegistration = {
      email: result.data.email,
      challengeToken: result.data.challengeToken,
      expiresAt: result.data.expiresAt,
    }

    setEmail(result.data.email)
    setChallengeToken(result.data.challengeToken)
    persistPending(nextPending)
    setStep('verify')
    setNotification({
      title: 'Verification sent',
      message:
        'Kode verifikasi sandbox sudah dikirim ke email Anda. Periksa inbox dan spam folder, lalu masukkan kode 6 digit tersebut untuk masuk ke MEDLINK.',
      tone: 'info',
    })
    return true
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedEmail = email.trim().toLowerCase()
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)

    if (!validEmail) {
      setEmailError(true)
      setNotification({
        title: 'Email required',
        message: 'Masukkan alamat email yang valid untuk membuka akses sandbox MEDLINK.',
        tone: 'error',
      })
      return
    }

    setEmailError(false)
    setIsSubmitting(true)

    if (step === 'register') {
      await requestVerification(trimmedEmail)
      setIsSubmitting(false)
      return
    }

    if (!challengeToken) {
      setNotification({
        title: 'Verification expired',
        message: 'Challenge verifikasi sandbox tidak ditemukan. Daftarkan email kembali.',
        tone: 'error',
      })
      setIsSubmitting(false)
      return
    }

    const result = await verifySandboxEmail(trimmedEmail, verificationCode, challengeToken)
    if (!result.success || !result.data) {
      setNotification({
        title: 'Verification failed',
        message:
          result.error?.message ||
          'Kode verifikasi sandbox tidak valid. Periksa ulang atau minta kirim ulang.',
        tone: 'error',
      })
      setIsSubmitting(false)
      return
    }

    try {
      localStorage.removeItem(PENDING_REGISTRATION_KEY)
    } catch {
      // Clearing local verification state must not block login completion.
    }

    setNotification({
      title: 'Sandbox unlocked',
      message:
        'Email berhasil diverifikasi. Anda masuk ke MEDLINK sandbox yang hanya memakai data sintetis dan tidak memproses PHI.',
      tone: 'success',
    })
    setIsSubmitting(false)
    await onComplete()
  }

  const handleResend = async () => {
    setIsSubmitting(true)
    await requestVerification(email.trim().toLowerCase())
    setIsSubmitting(false)
  }

  const handleReset = () => {
    setStep('register')
    setVerificationCode('')
    setChallengeToken('')
    setNotification(null)
    try {
      localStorage.removeItem(PENDING_REGISTRATION_KEY)
    } catch {
      // Reset remains available when browser storage cannot be cleared.
    }
  }

  const handleSecondaryAction = () => {
    if (step === 'verify') {
      handleReset()
      return
    }

    setAuthMode((current) => (current === 'login' ? 'register' : 'login'))
    setNotification(null)
  }

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5
    targetRef.current = { x: x * 8, y: y * -8 }
  }

  const handleMouseLeave = () => {
    targetRef.current = { x: 0, y: 0 }
  }

  const loginHeadingLead = authMode === 'register' ? 'Buat akun di ' : 'Autentikasi ke '
  const loginDescription =
    authMode === 'register'
      ? 'Rujukan Cerdas untuk Diagnosis & Fasilitas Rujukan'
      : 'Rujukan Cerdas untuk Diagnosis & Fasilitas Rujukan'
  const primaryLabel =
    step === 'register'
      ? authMode === 'register'
        ? isSubmitting
          ? 'Mendaftarkan akun...'
          : 'Daftar dan kirim kode'
        : isSubmitting
          ? 'Memproses verifikasi...'
          : 'Masuk dengan aman'
      : isSubmitting
        ? 'Memeriksa kredensial...'
        : authMode === 'register'
          ? 'Aktifkan akun'
          : 'Verifikasi dan masuk'

  return (
    <div className="ml-login">
      {showSplash ? <SplashScreen onDone={() => setShowSplash(false)} /> : null}

      <header className={`login-shell__header ${showSplash ? 'is-hidden' : ''}`}>
        <div className="login-shell__header-left">
          <BrandMark />
          <span className="login-shell__header-label">
            Sentra <span>//</span> Sistem_Auth
          </span>
          <span className="login-shell__header-separator">/</span>
          <span className="login-shell__header-build">MEDLINK V1.5</span>
        </div>

        <a
          href="https://sentrahai.com"
          target="_blank"
          rel="noreferrer"
          aria-label="Sentra Artificial Intelligence"
          className="login-shell__header-brand"
        >
          <img src="/images/logosentra.png" alt="Sentra Artificial Intelligence" />
        </a>
      </header>

      <div className={`login-shell__body ${showSplash ? 'is-hidden' : ''}`}>
        <section
          ref={panelRef}
          className="login-panel login-panel--visual"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          aria-hidden="true"
        >
          <div className="login-grid-bg" />

          {CROSSHAIR_POSITIONS.map((pos) => (
            <span
              key={`${pos.x}-${pos.y}`}
              className="login-crosshair"
              style={{ left: pos.x, top: pos.y }}
            />
          ))}

          <div className="login-stream-layer">
            {DATA_STREAM_LINES.map((line, index) => (
              <span
                key={line}
                className="login-data-stream"
                style={{
                  left: `${15 + index * 11}%`,
                  top: `${18 + index * 9}%`,
                  animationDelay: `${index * 1.2}s`,
                  animationDuration: `${6 + index}s`,
                }}
              >
                {line}
              </span>
            ))}
          </div>

          <span className="login-scan-line" style={{ animationDelay: '1s' }} />
          <span className="login-scan-line" style={{ animationDelay: '3s' }} />

          <div className="login-corner login-corner--tl" />
          <div className="login-corner login-corner--tr" />
          <div className="login-corner login-corner--bl" />
          <div className="login-corner login-corner--br" />

          <div ref={wrapRef} className="login-visual-center">
            <NeuralMeshLogo size={260} />
            <div className="login-visual-meta">
              <p>Sentra Neural Mesh v4.2</p>
              <p>ID: SNT-7842-AI-CORE</p>
            </div>
          </div>

          <p className="login-visual-copy">
            The{' '}
            <a href="https://sentrahai.com" target="_blank" rel="noreferrer">
              Sentra
            </a>{' '}
            Environment: A complete architectural and engineering framework, pioneered by{' '}
            <a href="https://ferdiiskandar.com" target="_blank" rel="noreferrer">
              dr. Ferdi Iskandar
            </a>
            . Forged from a profound love for Indonesia, it serves as the foundation for
            intelligent, sustainable, and nationally rooted development.
          </p>
        </section>

        <section className="login-panel login-panel--auth">
          <div className="login-auth-wrap">
            <div className="login-mode-switch" role="tablist" aria-label="Authentication mode">
              <button
                type="button"
                className={`login-mode-switch__button ${authMode === 'login' ? 'is-active' : ''}`}
                onClick={() => {
                  setAuthMode('login')
                  setNotification(null)
                }}
              >
                Login
              </button>
              <button
                type="button"
                className={`login-mode-switch__button ${authMode === 'register' ? 'is-active' : ''}`}
                onClick={() => {
                  setAuthMode('register')
                  setNotification(null)
                  if (step === 'verify') {
                    setStep('register')
                    setVerificationCode('')
                    setChallengeToken('')
                  }
                }}
              >
                Register
              </button>
            </div>

            <div className="login-copy">
              <p className="login-copy__eyebrow">
                {authMode === 'register' ? 'Daftar Aman' : 'Masuk Aman'}
              </p>
              <h2>
                <span className="login-copy__light">{loginHeadingLead}</span>
                <a
                  href="https://medlink.local"
                  onClick={(event) => event.preventDefault()}
                  className="login-copy__strong"
                >
                  MEDLINK
                </a>
              </h2>
              <p>{loginDescription}</p>
            </div>

            <form className="login-form" onSubmit={handleSubmit} noValidate>
              <div className="login-field">
                <label htmlFor="terminal-email" className="login-label">
                  ID Korporat / Email Kerja
                </label>
                <input
                  id="terminal-email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    if (event.target.value.trim()) setEmailError(false)
                  }}
                  placeholder="nama@sentra.ai"
                  autoComplete="email"
                  aria-invalid={notification?.tone === 'error' || emailError}
                  className={`login-input ${emailError ? 'is-error' : ''}`}
                />
                <p className="login-field__hint">cth. nama.belakang@sentra.com</p>
              </div>

              <div className="login-field">
                <div className="login-field__header">
                  <label htmlFor="terminal-code" className="login-label">
                    {step === 'register' ? 'Kode Verifikasi' : 'Kode Verifikasi'}
                  </label>
                  <button
                    type="button"
                    onClick={step === 'verify' ? handleResend : undefined}
                    className="login-inline-link"
                  >
                    {step === 'verify' ? 'Kirim ulang kode' : 'Kirim kode'}
                  </button>
                </div>

                <input
                  id="terminal-code"
                  type="text"
                  inputMode="numeric"
                  value={verificationCode}
                  onChange={(event) =>
                    setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  placeholder={
                    step === 'register'
                      ? 'Kode akan dikirim setelah email didaftarkan'
                      : 'Masukkan 6 digit'
                  }
                  className="login-input"
                  readOnly={step === 'register'}
                />
                <p className="login-field__hint">
                  {step === 'register'
                    ? 'Sistem akan mengirim kode verifikasi ke email sandbox Anda.'
                    : 'Masukkan kode 6 digit yang dikirim ke inbox atau spam folder.'}
                </p>
              </div>

              <div className="login-remember-row">
                <div className="login-remember">
                  <span
                    className={`login-remember__box ${step === 'verify' ? 'is-checked' : ''}`}
                    aria-hidden="true"
                  >
                    <svg viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </span>
                  <span className="login-remember__label">
                    {step === 'register'
                      ? 'Ingat perangkat ini'
                      : 'Challenge aktif untuk perangkat ini'}
                  </span>
                </div>
                <span className="login-remember__meta">30 hari</span>
              </div>

              {notification ? (
                <p className={`login-message login-message--${notification.tone}`} role="alert">
                  {notification.message}
                </p>
              ) : null}

              <button type="submit" className="login-primary-button" disabled={isSubmitting}>
                {isSubmitting ? <span className="login-spinner" aria-hidden="true" /> : null}
                {primaryLabel}
                {!isSubmitting ? (
                  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M2 8h11M9 4l4 4-4 4" />
                  </svg>
                ) : null}
              </button>

              <button
                type="button"
                className="login-secondary-button"
                onClick={handleSecondaryAction}
              >
                {step === 'verify'
                  ? 'Ganti email'
                  : authMode === 'register'
                    ? 'Sudah punya akun? Login'
                    : 'Belum punya akun? Register'}
              </button>
            </form>

            <nav className="login-social-links" aria-label="Tautan profesional">
              {SOCIAL_LINKS.map((link) => (
                <a key={link.href} href={link.href} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="login-verified-row">
              <span className="login-verified-row__line" />
              <span className="login-verified-row__label">Identitas Terverifikasi</span>
              <span className="login-verified-row__line" />
            </div>

            <div className="login-status-card">
              <div className="login-status-card__left">
                <span className="login-status-card__dot" aria-hidden="true" />
                <div>
                  <p className="login-status-card__title">
                    Status: <span>Operasional</span>
                  </p>
                  <p className="login-status-card__meta">AES-256 Terenkripsi · TLS 1.3</p>
                </div>
              </div>
              <div className="login-status-card__right">
                <p>UPTIME 99.99%</p>
                <p>WILAYAH US-EAST-2</p>
              </div>
            </div>

            <div className="login-footer-meta">
              <span>SOC 2 Type II · ISO 27001 · HIPAA · FedRAMP</span>
              <span>© MEDLINK 2026</span>
            </div>
          </div>
        </section>
      </div>

      <footer className={`login-shell__footer ${showSplash ? 'is-hidden' : ''}`}>
        <span>ID SESI: {sessionId}</span>
        <span>BUILD 2026.07.13 · CARBON 11.x</span>
      </footer>
    </div>
  )
}

export default Login
