export type ThemeMode = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'memeplate-theme-mode';
export const DEFAULT_THEME_MODE: ThemeMode = 'light';

const THEME_MODES: ThemeMode[] = ['light', 'dark'];

const isThemeMode = (value: string): value is ThemeMode => {
  return THEME_MODES.includes(value as ThemeMode);
};

export const getInitialThemeMode = (): ThemeMode => {
  if (typeof window === 'undefined') return DEFAULT_THEME_MODE;

  const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (saved && isThemeMode(saved)) {
    return saved;
  }

  return DEFAULT_THEME_MODE;
};

export const resolveCssVarColor = (variableName: string, fallback: string): string => {
  if (typeof window === 'undefined') return fallback;
  const value = window.getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  return value || fallback;
};
