import React from 'react';
import { getInitialThemeMode, THEME_STORAGE_KEY, type ThemeMode } from './theme';
import { ThemeModeContext, type ThemeContextValue } from './themeModeContext';

export const ThemeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [mode, setModeState] = React.useState<ThemeMode>(() => getInitialThemeMode());

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
    document.documentElement.style.colorScheme = mode;
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  }, [mode]);

  const setMode = React.useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);
  }, []);

  const toggleMode = React.useCallback(() => {
    setModeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const value = React.useMemo<ThemeContextValue>(() => ({
    mode,
    setMode,
    toggleMode
  }), [mode, setMode, toggleMode]);

  return (
    <ThemeModeContext.Provider value={value}>
      {children}
    </ThemeModeContext.Provider>
  );
};
