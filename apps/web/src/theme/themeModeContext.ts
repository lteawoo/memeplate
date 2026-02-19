import React from 'react';
import type { ThemeMode } from './theme';

export type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
};

export const ThemeModeContext = React.createContext<ThemeContextValue | null>(null);
