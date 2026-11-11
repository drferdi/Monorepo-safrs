import { create } from 'zustand';

/** Selaras dengan bentuk zustand/persist — data lama tetap terbaca */
import { THEME_STORAGE_KEY } from '@/lib/app-identity';
export { THEME_STORAGE_KEY };

/**
 * ThemeMode type
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export type ThemeMode = 'light' | 'dark';

/**
 * readPersistedTheme
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export function readPersistedTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return 'dark';
    const parsed = JSON.parse(raw) as { state?: { theme?: unknown } };
    const t = parsed?.state?.theme;
    if (t === 'light' || t === 'dark') return t;
  } catch {
    /* ignore corrupt storage */
  }
  return 'dark';
}

function writeTheme(theme: ThemeMode): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ state: { theme }, version: 0 }));
  } catch {
    /* quota / private mode */
  }
}

/** Sinkron sebelum React — hindari FOUC dan mismatch class <html> */
export function bootstrapThemeDocument(): void {
  const t = readPersistedTheme();
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(t);
  root.setAttribute('data-theme', t);
}

type ThemeState = {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
};

/**
 * Tanpa zustand/persist async rehidasi — toggle tidak boleh ditimpa oleh
 * rehidasi terlambat (gejala: sebentar light lalu kembali gelap).
 */
export const useThemeStore = create<ThemeState>()((set, get) => ({
  theme: readPersistedTheme(),
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    writeTheme(next);
    set({ theme: next });
  },
  setTheme: (theme) => {
    writeTheme(theme);
    set({ theme });
  },
}));
