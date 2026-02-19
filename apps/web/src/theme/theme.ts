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

type AntThemeToken = {
  colorPrimary: string;
  colorPrimaryHover?: string;
  colorPrimaryActive?: string;
  colorInfo: string;
  colorBgBase: string;
  colorBgContainer: string;
  colorBgElevated: string;
  colorText: string;
  colorTextSecondary: string;
  colorBorder: string;
  colorBorderSecondary: string;
  colorFillSecondary: string;
  borderRadius: number;
};

const ANT_TOKENS: Record<ThemeMode, AntThemeToken> = {
  light: {
    colorPrimary: '#364c75',
    colorInfo: '#364c75',
    colorBgBase: '#f9f9f8',
    colorBgContainer: '#f2f3f1',
    colorBgElevated: '#ffffff',
    colorText: '#0d1b2a',
    colorTextSecondary: '#415a77',
    colorBorder: '#c8d1dc',
    colorBorderSecondary: '#e5e6e3',
    colorFillSecondary: '#ececea',
    borderRadius: 12
  },
  dark: {
    colorPrimary: '#5172af',
    colorPrimaryHover: '#5172af',
    colorPrimaryActive: '#415a77',
    colorInfo: '#5172af',
    colorBgBase: '#050b11',
    colorBgContainer: '#08111a',
    colorBgElevated: '#161f30',
    colorText: '#f9f9f8',
    colorTextSecondary: '#abbcd1',
    colorBorder: '#273647',
    colorBorderSecondary: '#101724',
    colorFillSecondary: '#161f30',
    borderRadius: 12
  }
};

export const getAntThemeTokens = (mode: ThemeMode): AntThemeToken => ANT_TOKENS[mode];

export const resolveCssVarColor = (variableName: string, fallback: string): string => {
  if (typeof window === 'undefined') return fallback;
  const value = window.getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  return value || fallback;
};
