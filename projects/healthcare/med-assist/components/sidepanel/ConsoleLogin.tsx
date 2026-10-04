import { motion, useReducedMotion } from 'framer-motion';
import React, { useCallback, useEffect, useState } from 'react';

import ThemeToggle from '@/components/ui/ThemeToggle';
import type { AuthUser } from '@/lib/api/auth-store';

type LoginStage = 'idle' | 'loading' | 'error';

const LoginWordmark: React.FC = () => (
  <div className="login-wordmark" role="img" aria-label="Asisten Medis by Sentra Technology 2026">
    <div className="login-wordmark-line">Asisten Medis</div>
    <div className="login-wordmark-sub">by Sentra Technology 2026</div>
  </div>
);

export const ConsoleLogin: React.FC<{ onLoginSuccess: (user: AuthUser) => void }> = ({
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [stage, setStage] = useState<LoginStage>('idle');
  const [loginError, setLoginError] = useState<string | null>(null);
  // Passkey needs a live backend (server ceremony). Show it only when the
  // browser supports WebAuthn AND a backend base URL is configured — in Mode
  // Lokal (no backend) it is hidden and password login is the only path.
  const [passkeyAvailable, setPasskeyAvailable] = useState(false);

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
        /* leave passkey hidden on error */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Chief, 2026-10-04: no sound on the way to the sponsor page; the one welcome sound plays
  // when the main UI opens (runLaunchSequence in the side panel).
  const handleLogin = useCallback(async () => {
    if (!username.trim() || !password) return;
    setStage('loading');
    setLoginError(null);

    try {
      const { login } = await import('@/lib/api/auth-client');

      const result = await login({ username: username.trim(), password });
      if (!result.success || !result.session) {
        setLoginError(result.error?.message ?? 'Login gagal. Coba lagi.');
        setStage('error');
        return;
      }

      setTimeout(() => onLoginSuccess(result.session!.user), 400);
    } catch {
      setLoginError('Tidak dapat menghubungi server. Coba lagi nanti.');
      setStage('error');
    }
  }, [username, password, onLoginSuccess]);

  const handlePasskeyLogin = useCallback(async () => {
    setStage('loading');
    setLoginError(null);

    try {
      const { loginWithPasskey } = await import('@/lib/api/auth-client');
      const result = await loginWithPasskey();

      if (!result.success || !result.session) {
        // A user-cancelled prompt is not an error worth showing — just reset silently.
        if (result.error?.code !== 'PASSKEY_CANCELLED') {
          setLoginError(result.error?.message ?? 'Login dengan passkey gagal.');
        }
        setStage('idle');
        return;
      }

      setTimeout(() => onLoginSuccess(result.session!.user), 400);
    } catch {
      setStage('idle');
    }
  }, [onLoginSuccess]);

  const reduceMotion = useReducedMotion();
  const easeNeu = [0.19, 1, 0.22, 1] as const;

  // Orkestrasi: kartu turun-masuk dulu, anak-anak menyusul ber-stagger,
  // power core "menyala" paling akhir. Reduced motion: fade saja.
  const containerVariants = {
    hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: reduceMotion ? 0.3 : 0.75,
        ease: easeNeu,
        when: 'beforeChildren' as const,
        staggerChildren: reduceMotion ? 0 : 0.12,
        delayChildren: reduceMotion ? 0 : 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, filter: 'blur(10px)' },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { duration: reduceMotion ? 0.3 : 0.55, ease: easeNeu },
    },
  };

  // Ignition: scale overshoot halus saat power core muncul terakhir.
  const powerVariants = {
    hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.82 },
    visible: {
      opacity: 1,
      scale: reduceMotion ? 1 : [0.82, 1.05, 1],
      transition: { duration: reduceMotion ? 0.3 : 0.7, ease: easeNeu },
    },
  };

  return (
    <div className="login-view">
      <div className="login-view-stack">
        <motion.div
          className="login-card"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <div className="login-theme-toggle">
            <ThemeToggle />
          </div>
          <div className="login-header">
            <motion.div variants={itemVariants}>
              <LoginWordmark />
            </motion.div>
          </div>

          <motion.div className="login-system-status" variants={itemVariants}>
            <div className="status-dot" />
            System Off
          </motion.div>

          {passkeyAvailable ? (
            <>
              <motion.button
                type="button"
                className="login-passkey-btn"
                onClick={handlePasskeyLogin}
                disabled={stage === 'loading'}
                variants={itemVariants}
                aria-label="Masuk dengan Passkey"
              >
                Masuk dengan Passkey
              </motion.button>
              <motion.div
                className="login-passkey-divider"
                variants={itemVariants}
                aria-hidden="true"
              >
                atau
              </motion.div>
            </>
          ) : null}

          <div className="credential-lines">
            <motion.div className="luxury-line" variants={itemVariants}>
              <input
                id="login-username"
                type="text"
                placeholder="USERNAME"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (loginError) setLoginError(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                autoComplete="username"
                aria-label="Nama pengguna"
                aria-invalid={loginError ? true : undefined}
              />
            </motion.div>
            <motion.div className="luxury-line" variants={itemVariants}>
              <input
                id="login-password"
                type="password"
                placeholder="PASSWORD"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (loginError) setLoginError(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                autoComplete="current-password"
                aria-label="Kata sandi"
                aria-invalid={loginError ? true : undefined}
              />
            </motion.div>
          </div>

          {loginError ? (
            <p className="login-error" role="alert">
              {loginError}
            </p>
          ) : null}

          <motion.button
            type="button"
            className={`power-btn${stage === 'loading' ? ' loading' : ''}`}
            onClick={handleLogin}
            disabled={stage === 'loading'}
            variants={powerVariants}
            aria-label="Masuk"
            aria-busy={stage === 'loading'}
          >
            <div className="power-ring" aria-hidden="true" />
            <svg className="power-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2v8M8 6a8 8 0 1 0 8 0" />
            </svg>
          </motion.button>
        </motion.div>

        <p className="login-disclaimer">
          <span className="login-disclaimer-label">Penafian:</span> Sentra Assist merupakan alat
          bantu bagi tenaga kesehatan profesional dan tidak menggantikan penilaian klinis independen
          dokter maupun tenaga medis yang berkompeten.
        </p>
      </div>
    </div>
  );
};
