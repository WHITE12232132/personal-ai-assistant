import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { ColorScheme, lightColors, darkColors } from './colors';
import { getThemeMode, saveThemeMode } from '@/storage/PreferenceStorage';

export type ThemeMode = 'system' | 'light' | 'dark';

// Context 里装什么：颜色表 + 两个开关位
interface ThemeContextValue {
  colors: ColorScheme;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const scheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    getThemeMode().then(setThemeModeState);
  }, []);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    saveThemeMode(mode);
  };

  const isDark = themeMode === 'dark' || (themeMode === 'system' && scheme === 'dark');
  const colors = isDark ? darkColors : lightColors;
  const value: ThemeContextValue = { colors, isDark, themeMode, setThemeMode };



  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}


export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (ctx === undefined) {
    throw new Error('useTheme 必须在 <ThemeProvider> 内使用');
  }
  return ctx;
}


