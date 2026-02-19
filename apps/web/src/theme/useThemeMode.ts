import { ThemeModeContext, type ThemeContextValue } from './themeModeContext';
import { DEFAULT_THEME_MODE } from './theme';
import React from 'react';

export const useThemeMode = (): ThemeContextValue => {
  const context = React.useContext(ThemeModeContext);
  if (!context) {
    return {
      mode: DEFAULT_THEME_MODE,
      setMode: () => undefined,
      toggleMode: () => undefined
    };
  }
  return context;
};
