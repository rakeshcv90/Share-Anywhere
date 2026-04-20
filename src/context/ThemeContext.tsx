import React, { createContext, useContext, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { MMKV } from 'react-native-mmkv';

// ─── MMKV Storage ────────────────────────────────────────────────────────────
const storage = new MMKV({ id: 'theme-storage' });
const THEME_KEY = 'user_theme_preference';

// ─── Types ────────────────────────────────────────────────────────────────────
export type ThemePreference = 'light' | 'dark' | 'system';
export type ColorScheme = 'light' | 'dark';

export interface ThemeColors {
  // Backgrounds
  background: string;
  surface: string;
  surfaceAlt: string;
  // Text
  text: string;
  subtext: string;
  // Borders
  border: string;
  // Gradients
  gradientBg: string[];
  headerGradient: string[];
  // Navigation bar
  navBg: string;
  // Icons
  icon: string;
  // Accent
  accent: string;
  // Card
  cardBg: string;
  // Status
  statusBarStyle: 'light-content' | 'dark-content';
}

// ─── Light Theme ──────────────────────────────────────────────────────────────
export const lightColors: ThemeColors = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceAlt: 'rgba(255,255,255,0.85)',
  text: '#1E293B',
  subtext: '#64748B',
  border: 'rgba(0,0,0,0.08)',
  gradientBg: ['#F8FAFC', '#E2E8F0', '#F1F5F9', '#FFFFFF'],
  headerGradient: ['#F8FAFC', '#E2E8F0', 'rgba(248,250,252,0.4)'],
  navBg: 'rgba(255,255,255,0.95)',
  icon: '#1E293B',
  accent: '#FF6B00',
  cardBg: '#FFFFFF',
  statusBarStyle: 'dark-content',
};

// ─── Dark Theme (TransferQueen Space Theme) ──────────────────────────────────
export const darkColors: ThemeColors = {
  background: '#0F1E3A',
  surface: '#1B2D50',
  surfaceAlt: 'rgba(27,45,80,0.92)',
  text: '#FFFFFF',
  subtext: 'rgba(255,255,255,0.6)',
  border: 'rgba(255,255,255,0.08)',
  gradientBg: ['#0F1E3A', '#1B2D50', '#1E3A5F'],
  headerGradient: ['#0F1E3A', '#1B2D50', 'rgba(15,30,58,0.8)'],
  navBg: 'rgba(15,30,58,0.97)',
  icon: '#FFFFFF',
  accent: '#FF9500',
  cardBg: 'rgba(255,255,255,0.06)',
  statusBarStyle: 'light-content',
};

// ─── Context ──────────────────────────────────────────────────────────────────
interface ThemeContextValue {
  theme: ThemePreference;
  colorScheme: ColorScheme;
  colors: ThemeColors;
  setTheme: (pref: ThemePreference) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  colorScheme: 'light',
  colors: lightColors,
  setTheme: () => {},
  isDark: false,
});

// ─── Provider ─────────────────────────────────────────────────────────────────
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const rawScheme = useColorScheme();
  const systemScheme: ColorScheme = rawScheme === 'dark' ? 'dark' : 'light';

  const [theme, setThemeState] = useState<ThemePreference>(() => {
    const saved = storage.getString(THEME_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
    return 'system';
  });

  const colorScheme: ColorScheme =
    theme === 'system' ? systemScheme : (theme as ColorScheme);

  const isDark = colorScheme === 'dark';
  const colors = isDark ? darkColors : lightColors;

  const setTheme = useCallback((pref: ThemePreference) => {
    storage.set(THEME_KEY, pref);
    setThemeState(pref);
  }, []);

  return (
    <ThemeContext.Provider
      value={{ theme, colorScheme, colors, setTheme, isDark }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
