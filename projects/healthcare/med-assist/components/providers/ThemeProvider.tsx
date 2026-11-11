import { useEffect, useRef } from 'react';
import { useThemeStore } from '../../lib/theme-store';

/** Selaras durasi terpanjang di `style.css` (to-light 1.38s) + jeda kecil */
const LAMP_TRANSITION_MS = 1420;

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const theme = useThemeStore((state) => state.theme);
  /** Baseline tema — menghindari animasi pada mount / StrictMode remount; animasi hanya saat tema benar-benar berubah */
  const prevThemeRef = useRef<'light' | 'dark' | null>(null);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    root.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (prevThemeRef.current === null) {
      prevThemeRef.current = theme;
      return;
    }
    if (prevThemeRef.current === theme) return;
    prevThemeRef.current = theme;

    if (typeof window.matchMedia !== 'function') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const root = window.document.documentElement;
    root.classList.add('theme-lamp-transition');
    root.setAttribute('data-theme-direction', theme === 'light' ? 'to-light' : 'to-dark');
    const tid = window.setTimeout(() => {
      root.classList.remove('theme-lamp-transition');
      root.removeAttribute('data-theme-direction');
    }, LAMP_TRANSITION_MS);
    return () => {
      window.clearTimeout(tid);
    };
  }, [theme]);

  return <>{children}</>;
};

export default ThemeProvider;
