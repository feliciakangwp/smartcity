// Light / dark theme. The choice is remembered in this browser; without one, the
// system setting is used. index.html applies it before first paint.
import { create } from 'zustand';

export type Theme = 'light' | 'dark';
export const THEME_STORAGE_KEY = 'port-nexus.theme';

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* storage unavailable */
  }
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function apply(theme: Theme) {
  if (typeof document !== 'undefined') document.documentElement.classList.toggle('dark', theme === 'dark');
}

export const useTheme = create<{ theme: Theme; toggle: () => void }>((set, get) => {
  const theme = initialTheme();
  apply(theme);
  return {
    theme,
    toggle: () => {
      const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
      apply(next);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        /* storage unavailable */
      }
      set({ theme: next });
    },
  };
});

/** Colours for chart text, which SVG attributes cannot take from CSS variables. */
export const chartInk = (theme: Theme) =>
  theme === 'dark' ? { text: '#b8c6d8', strong: '#e4ebf4', border: '#2c3c54', bg: '#121e31' } : { text: '#34465e', strong: '#0f1c2e', border: '#d5dee9', bg: '#ffffff' };
