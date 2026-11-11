import React, { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';

import ThemeToggle from '@/components/ui/ThemeToggle';
import type { AuthUser } from '@/lib/api/auth-store';

/** Paths under `public/` for browser.runtime.getURL */
type PublicAssetPath =
  | '/icon/melinda.png'
  | '/icon/sentra-hai-logomark.png'
  | '/anthropic.svg'
  | '/openai.svg'
  | '/google.svg'
  | '/langchain.svg';

type PartnerDef = {
  id: string;
  name: string;
  desc: string;
  logoPath: PublicAssetPath;
  logoClass?: string;
  /** External link for the card title, e.g. the infrastructure partner's homepage. */
  href?: string;
};

const PARTNERS: PartnerDef[] = [
  {
    id: 'sentra-hai',
    name: 'Sentra HAI',
    desc: 'Pusat kecerdasan yang merancang dan membangkitkan seluruh klinis Sentra.',
    logoPath: '/icon/sentra-hai-logomark.png',
    logoClass: 'dash-partner-logo-img--bitmap',
    href: 'http://sentrahai.com/',
  },
  {
    id: 'melinda',
    name: 'RSIA Melinda',
    desc: 'Laboratorium teknologi yang sejak awal menumbuhkan dan mengembangkan Sentra.',
    logoPath: '/icon/melinda.png',
    logoClass: 'dash-partner-logo-img--bitmap',
    href: 'https://melinda.co.id/',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    desc: 'Lapisan infrastruktur dan logika penalaran yang menopang kecerdasan Sentra.',
    logoPath: '/anthropic.svg',
    logoClass: 'dash-partner-logo-img--svg',
    href: 'https://www.anthropic.com/',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    desc: 'Asisten devops yang mengakselerasi siklus rekayasa perangkat lunak Sentra.',
    logoPath: '/openai.svg',
    logoClass: 'dash-partner-logo-img--svg',
    href: 'https://openai.com/',
  },
  {
    id: 'google',
    name: 'Google',
    desc: 'Fasilitas fine-tuning menyempurnakan akurasi model kecerdasan klinis Sentra.',
    logoPath: '/google.svg',
    logoClass: 'dash-partner-logo-img--svg',
    href: 'https://www.google.com/',
  },
  {
    id: 'langchain',
    name: 'LangChain',
    desc: 'Orkestrator alur kerja yang merangkai setiap tahap pemrosesan klinis Sentra.',
    logoPath: '/langchain.svg',
    logoClass: 'dash-partner-logo-img--svg',
    href: 'https://www.langchain.com/',
  },
];

const NETWORK_STATUS_TEXT = 'QUANTUM HANDSHAKE: SYNCHRONIZED';

interface DashboardViewProps {
  user: AuthUser | null;
  onLaunchConsole: () => void;
  onLogout: () => void;
}

type PasskeyPromptStage = 'idle' | 'loading' | 'success' | 'error' | 'dismissed';

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  onLaunchConsole,
  onLogout,
}) => {
  // Passkey enrollment needs a live backend — hidden in Mode Lokal (no backend).
  const [passkeyAvailable, setPasskeyAvailable] = useState(false);
  const [passkeyPromptStage, setPasskeyPromptStage] = useState<PasskeyPromptStage>('idle');
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [networkStatusTyped, setNetworkStatusTyped] = useState('');

  const isAuthenticated = Boolean(user);

  useEffect(() => {
    if (!isAuthenticated) {
      setNetworkStatusTyped('');
      return;
    }
    let charIndex = 0;
    const interval = setInterval(() => {
      charIndex += 1;
      setNetworkStatusTyped(NETWORK_STATUS_TEXT.slice(0, charIndex));
      if (charIndex >= NETWORK_STATUS_TEXT.length) {
        clearInterval(interval);
      }
    }, 40);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supported = typeof window !== 'undefined' && 'PublicKeyCredential' in window;
      if (!supported) return;
      try {
        const { getAuthConfig } = await import('@/lib/api/auth-client');
        const config = await getAuthConfig();
        if (!cancelled) setPasskeyAvailable(Boolean(config.baseUrl?.trim()));
      } catch {
        /* leave hidden on error */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleEnablePasskey = async () => {
    setPasskeyPromptStage('loading');
    setPasskeyError(null);

    const { registerPasskey } = await import('@/lib/api/auth-client');
    const result = await registerPasskey();

    if (!result.success) {
      setPasskeyError(result.error?.message ?? 'Gagal mengaktifkan passkey.');
      setPasskeyPromptStage('error');
      return;
    }

    setPasskeyPromptStage('success');
  };

  const showPasskeyPrompt =
    Boolean(user) &&
    passkeyAvailable &&
    passkeyPromptStage !== 'dismissed' &&
    passkeyPromptStage !== 'success';

  return (
    <div className="dash-view">
      <div className="dash-card">
        <div className="dash-theme-toggle">
          <ThemeToggle />
        </div>
        <button
          type="button"
          className="dash-launch-orb"
          onClick={onLaunchConsole}
          title="Launch Console — masuk UI utama"
          aria-label="Launch Console — masuk UI utama"
        >
          ⏻
        </button>

        <header className="dash-header pt-2">
          <a
            href="https://sentrahai.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="dash-title-link"
          >
            Asisten Medis
          </a>
          <p className="dash-subtitle">We empower you</p>
          {user ? (
            <div className="dash-welcome mt-2">
              <span className="dash-welcome-label">Selamat datang,</span>{' '}
              <span className="dash-welcome-name">
                <span className="dash-welcome-name-text">{user.name}</span>
                {user.facilityName ? <> • {user.facilityName}</> : null}
              </span>
            </div>
          ) : null}
          <div
            className="dashboard-mantra mt-4 mb-2 text-[10px] opacity-70 tracking-[0.4em] font-mono"
            style={{ color: 'var(--text-main)' }}
          >
            DIAGNOSA | TERAPI | REPEAT
          </div>
        </header>

        {showPasskeyPrompt ? (
          <div className="dash-passkey-prompt px-6 mt-2 mb-2 text-center">
            <p className="text-[11px] opacity-70 mb-2" style={{ color: 'var(--text-main)' }}>
              Aktifkan Passkey untuk login berikutnya tanpa kata sandi?
            </p>
            {passkeyPromptStage === 'error' && passkeyError ? (
              <p className="text-[10px] mb-2" role="alert" style={{ color: 'var(--brand-accent)' }}>
                {passkeyError}
              </p>
            ) : null}
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                className="text-[11px] font-semibold underline"
                style={{ color: 'var(--accent-med)' }}
                onClick={handleEnablePasskey}
                disabled={passkeyPromptStage === 'loading'}
              >
                Aktifkan Passkey
              </button>
              <button
                type="button"
                className="text-[11px] opacity-60"
                style={{ color: 'var(--text-muted)' }}
                onClick={() => setPasskeyPromptStage('dismissed')}
                disabled={passkeyPromptStage === 'loading'}
              >
                Lewati
              </button>
            </div>
          </div>
        ) : null}

        <div className="px-6 mt-4 mb-2">
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={onLaunchConsole}
              className="w-full py-2 rounded-lg text-sm font-medium tracking-normal
                         border transition-all duration-200"
              style={{
                background: 'var(--neu-gradient-chip)',
                borderColor: 'var(--neu-border)',
                boxShadow: 'var(--neu-shadow-chip)',
                color: 'var(--text-muted)',
              }}
            >
              <span className="dash-cta-text-sweep">Masuk ke ASSIST →</span>
            </button>
          </div>
        </div>

        <div className="dash-divider my-6" aria-hidden="true" />

        <div className="dashboard-links-section my-6 text-center">
          <div className="text-[9px] uppercase tracking-[0.2em] opacity-40 mb-2">
            Kunjungi kami di sini
          </div>
          <div className="flex items-center justify-center gap-3 text-[12px] tracking-wide">
            <a
              href="https://sentrahai.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="dash-footer-link--glow text-[var(--text-muted)] hover:text-[var(--accent-med)] transition-colors"
            >
              Sentra Artificial Intelligence
            </a>
            <span className="opacity-20">|</span>
            <a
              href="https://ferdiiskandar.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="dash-footer-link--glow text-[var(--text-muted)] hover:text-[var(--accent-med)] transition-colors"
            >
              dr. Ferdi Iskandar
            </a>
          </div>
        </div>

        <div className="dash-divider" aria-hidden="true" />

        <p className="dash-partners-title">Ditenagai oleh Teknologi</p>
        <div className="dash-partners-grid">
          {PARTNERS.map((p) => (
            <div key={p.id} className="dash-partner-card">
              {p.href ? (
                <a
                  href={p.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dash-partner-logo-link"
                  aria-label={p.name}
                >
                  <img
                    src={browser.runtime.getURL(p.logoPath)}
                    alt=""
                    className={`dash-partner-logo-img ${p.logoClass ?? ''}`}
                    width={32}
                    height={32}
                    decoding="async"
                  />
                </a>
              ) : (
                <img
                  src={browser.runtime.getURL(p.logoPath)}
                  alt=""
                  className={`dash-partner-logo-img ${p.logoClass ?? ''}`}
                  width={32}
                  height={32}
                  decoding="async"
                />
              )}
              <div className="dash-partner-info">
                <div className="dash-partner-name">
                  {p.href ? (
                    <a
                      href={p.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="dash-partner-name-link"
                    >
                      {p.name}
                    </a>
                  ) : (
                    p.name
                  )}
                </div>
                <div className="dash-partner-desc">{p.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="dash-divider" aria-hidden="true" />

        {user ? (
          <div className="dash-logout-row">
            <button type="button" className="dash-logout" onClick={onLogout}>
              Logout
            </button>
            <div className="dash-network-status-wrap">
              <span
                className="dash-network-status font-mono text-[10px] tracking-wide"
                style={{ color: 'var(--sentra-green)' }}
                aria-live="polite"
              >
                {networkStatusTyped}
              </span>
              <div className="dash-status-dots" aria-hidden="true">
                <span className="dash-status-dot" />
                <span className="dash-status-dot" />
                <span className="dash-status-dot" />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
