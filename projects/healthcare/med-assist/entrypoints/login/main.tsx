// Ghost Protocols — Secure Login Entry
// Integrates design from page1-login.html + page2-dashboard.html
// Backend Auth Integration

import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { browser } from 'wxt/browser';

import { AuthClient, type AuthUser } from '@/lib/api/auth-client';
import { createLogger } from '@/utils/logger';
import { playOffscreenSound } from '@/utils/offscreen-audio';
import { playSound } from '@/utils/sound';
import './style.css';

// Audio file path
const LOGIN_SOUND_PATH = 'assets/sounds/hello.mp3';
const loginLog = createLogger('LoginMain', 'global');
const BRAND_LOGO_PATH = browser.runtime.getURL('/assist.png');

const LogoSentra: React.FC<{ className?: string }> = ({ className }) => (
  <img
    src={BRAND_LOGO_PATH}
    alt="Sentra Assist"
    className={className ? `login-logo-img ${className}` : 'login-logo-img'}
  />
);

// ============================================================================
// TYPES
// ============================================================================
type LoginState = 'login' | 'dashboard' | 'loading';

interface EngineConfig {
  id: string;
  label: string;
  active?: boolean;
}

interface EcosystemLink {
  id: string;
  name: string;
  desc: string;
  href: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================
const ENGINES: EngineConfig[] = [
  { id: 'clinical', label: 'Clinical Assist', active: true },
  { id: 'diagnostic', label: 'Diagnostic Assist' },
  { id: 'therapy', label: 'Therapy Assist' },
];

const ECOSYSTEM_LINKS: EcosystemLink[] = [
  {
    id: 'sentra',
    name: 'Sentra Artificial Intelligence',
    desc: 'Clinical AI orchestration and intelligence platform',
    href: 'https://sentrahai.com/',
  },
  {
    id: 'founder',
    name: 'dr. Ferdi Iskandar',
    desc: "Founder's vision for AI-augmented healthcare excellence",
    href: 'https://ferdiiskandar.com/',
  },
];

const LOGIN_BOOTSTRAP_ATTEMPTS = 8;
const LOGIN_BOOTSTRAP_INTERVAL_MS = 200;
const LAUNCH_OPENING_SOUND_MS = 2200;
const LAUNCH_OPENING_SOUND_VOLUME = 0.62;
const LAUNCH_OPENING_SOUND_FADE_OUT_MS = 520;
const LAUNCH_REDIRECT_DELAY_MS = 120;

// ============================================================================
// AUDIO HOOK
// ============================================================================
const useAudio = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Preload audio with proper extension URL
    // WXT's PublicPath only covers HTML entry points; sound assets are valid at runtime
    const url = browser.runtime.getURL(
      LOGIN_SOUND_PATH as unknown as Parameters<typeof browser.runtime.getURL>[0]
    );
    audioRef.current = new Audio(url);
    audioRef.current.preload = 'auto';
    audioRef.current.volume = 0.7;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const play = useCallback(() => {
    if (audioRef.current) {
      // Reset to start and play
      audioRef.current.currentTime = 0;
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          loginLog.warn('Audio play failed', err);
        });
      }
    }
  }, []);

  return { play };
};

// ============================================================================
// POWER BUTTON ICON
// ============================================================================
const PowerIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
  >
    <path d="M12 2v8M8 6a8 8 0 1 0 8 0" />
  </svg>
);

// ============================================================================
// LOGIN PAGE COMPONENT
// ============================================================================
const LoginPage: React.FC<{ onLogin: (user: AuthUser) => void }> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { play: playOpeningSound } = useAudio();

  const handleSubmit = useCallback(async () => {
    if (!username.trim() || !password) return;
    setIsLoading(true);
    const result = await AuthClient.login({ username: username.trim(), password });
    setIsLoading(false);
    if (!result.success) return;
    playOpeningSound();
    setTimeout(() => onLogin(result.session!.user), 400);
  }, [username, password, onLogin, playOpeningSound]);

  return (
    <div className="login-container">
      <div className="login-logo">
        <LogoSentra />
      </div>

      <div className="login-inputs">
        <div className="luxury-line">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="USERNAME"
            className="login-input"
          />
        </div>
        <div className="luxury-line">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="PASSWORD"
            className="login-input"
          />
        </div>
      </div>

      <button className="power-btn" onClick={handleSubmit} disabled={isLoading}>
        <PowerIcon />
      </button>
    </div>
  );
};

const DashboardPage: React.FC<{ user: AuthUser; onLogout: () => void }> = ({ user, onLogout }) => {
  const [activeEngine, setActiveEngine] = useState('clinical');
  const handleLaunch = async () => {
    const openingSoundOptions = {
      maxDurationMs: LAUNCH_OPENING_SOUND_MS,
      volume: LAUNCH_OPENING_SOUND_VOLUME,
      fadeOutMs: LAUNCH_OPENING_SOUND_FADE_OUT_MS,
    };
    const playedOffscreen = await playOffscreenSound('opening.mp3', openingSoundOptions).catch(
      () => false
    );
    if (!playedOffscreen) {
      playSound('opening.mp3', openingSoundOptions);
    }
    window.setTimeout(() => {
      window.location.href = '/sidepanel.html';
    }, LAUNCH_REDIRECT_DELAY_MS);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <LogoSentra className="text-h1" />
        <div className="text-h2 mt-2">Your Intelligence Assistant</div>
        <div className="text-subtitle mt-4">
          {user.name} • {user.facilityName}
        </div>
        <div
          className="dashboard-mantra mt-6 mb-2 text-mono opacity-30"
          style={{ fontSize: '8px', letterSpacing: '0.4em' }}
        >
          DIAGNOSIS | TERAPI | EVALUASI BERKELANJUTAN
        </div>
      </div>

      <div className="engine-list">
        {ENGINES.map((e) => (
          <div
            key={e.id}
            className={`engine-item ${activeEngine === e.id ? 'active' : ''}`}
            onClick={() => setActiveEngine(e.id)}
          >
            {e.label}
          </div>
        ))}
      </div>

      <div className="system-stats-grid">
        <div className="stat-item">
          <div className="text-mono stat-value">24ms</div>
          <div className="text-subtitle opacity-40" style={{ fontSize: '7px' }}>
            Latency
          </div>
        </div>
        <div className="stat-item">
          <div className="text-mono stat-value">AES-256</div>
          <div className="text-subtitle opacity-40" style={{ fontSize: '7px' }}>
            Security
          </div>
        </div>
        <div className="stat-item">
          <div className="text-mono stat-value">Active</div>
          <div className="text-subtitle opacity-40" style={{ fontSize: '7px' }}>
            Neural Core
          </div>
        </div>
      </div>

      <div className="dashboard-links-section">
        <div className="text-subtitle opacity-40 mb-3" style={{ fontSize: '7px' }}>
          EKOSISTEM KAMI
        </div>
        <div className="space-y-3 text-[10px] tracking-wide">
          {ECOSYSTEM_LINKS.map((item) => (
            <a
              key={item.id}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block hover:text-[#10B981] transition-colors"
            >
              <div>{item.name}</div>
              <div className="text-caption mt-1" style={{ fontSize: '8px' }}>
                {item.desc}
              </div>
            </a>
          ))}
        </div>
      </div>

      <div className="credits-box">
        <div className="text-caption">
          Dirancang dan dikembangkan oleh <b>dr. Ferdi Iskandar</b>
          <br />
          Hak milik <span className="credits-company">Sentra Artificial Intelligence</span>
          <br />
          <i className="text-mono opacity-60" style={{ fontSize: '8px' }}>
            &quot;Masterplan and masterpiece by Drferdi.&quot;
          </i>
        </div>
      </div>

      <div className="divider" />

      <div className="partners-title text-subtitle" style={{ fontSize: '8px', opacity: 0.5 }}>
        DIDUKUNG OLEH ORKESTRASI TEKNOLOGI
      </div>
      <div className="partners-grid">
        <div className="partner-card">
          <div
            className="partner-logo"
            style={{ background: "url('/icon/melinda.png') center/contain no-repeat" }}
          />
          <div className="partner-info">
            <div className="text-body font-semibold">RSIA Melinda</div>
            <div className="text-caption" style={{ fontSize: '8px' }}>
              Fondasi klinis aman untuk inovasi layanan kesehatan cerdas.
            </div>
          </div>
        </div>

        <div className="partner-card">
          <div
            className="partner-logo"
            style={{ background: "url('/icon/sidelab.png') center/contain no-repeat" }}
          />
          <div className="partner-info">
            <div className="text-body font-semibold">Sidelab</div>
            <div className="text-caption" style={{ fontSize: '8px' }}>
              Laboratorium digital presisi untuk validasi integrasi dan operasional.
            </div>
          </div>
        </div>

        <div className="partner-card">
          <div
            className="partner-logo"
            style={{ background: "url('/openai.svg') center/contain no-repeat" }}
          />
          <div className="partner-info">
            <div className="text-body font-semibold">OpenAI</div>
            <div className="text-caption" style={{ fontSize: '8px' }}>
              Lapisan reasoning adaptif untuk komunikasi dan otomasi klinis.
            </div>
          </div>
        </div>

        <div className="partner-card">
          <div
            className="partner-logo"
            style={{ background: "url('/icon/langflow.png') center/contain no-repeat" }}
          />
          <div className="partner-info">
            <div className="text-body font-semibold">Langflow</div>
            <div className="text-caption" style={{ fontSize: '8px' }}>
              Orkestrasi alur visual untuk pipeline agent dan integrasi.
            </div>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <button className="power-btn" onClick={handleLaunch} aria-label="Masuk ke Sentra Assist">
          <PowerIcon />
        </button>
        <div className="text-subtitle mt-4">Masuk ke Sentra Assist →</div>
        <div className="mt-6">
          <button className="logout-btn text-mono" onClick={onLogout}>
            Logout System
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================
const App: React.FC = () => {
  const [loginState, setLoginState] = useState<LoginState>('loading');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // Check if already logged in
  useEffect(() => {
    let isCancelled = false;

    const checkAuth = async () => {
      try {
        const session = await AuthClient.getStoredSessionWithRetry({
          attempts: LOGIN_BOOTSTRAP_ATTEMPTS,
          intervalMs: LOGIN_BOOTSTRAP_INTERVAL_MS,
        });
        if (isCancelled) return;
        if (session) {
          setCurrentUser(session.user);
          setLoginState('dashboard');
        } else {
          setLoginState('login');
        }
      } catch {
        if (isCancelled) return;
        setLoginState('login');
      }
    };

    void checkAuth();

    return () => {
      isCancelled = true;
    };
  }, []);

  const handleLogin = useCallback(async (user: AuthUser) => {
    setCurrentUser(user);
    setLoginState('dashboard');
  }, []);

  const handleLogout = useCallback(async () => {
    await AuthClient.logout();
    setCurrentUser(null);
    setLoginState('login');
  }, []);

  if (loginState === 'loading') {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <span>Initializing...</span>
      </div>
    );
  }

  if (loginState === 'login') {
    return <LoginPage onLogin={handleLogin} />;
  }

  return currentUser ? (
    <DashboardPage user={currentUser} onLogout={handleLogout} />
  ) : (
    <LoginPage onLogin={handleLogin} />
  );
};

// ============================================================================
// MOUNT
// ============================================================================
const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
