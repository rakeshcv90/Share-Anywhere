import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
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
  background: '#F0F6FF',
  surface: '#FFFFFF',
  surfaceAlt: 'rgba(255,255,255,0.85)',
  text: '#1A202C',
  subtext: '#4A5568',
  border: 'rgba(0,0,0,0.08)',
  gradientBg: ['#E0F7FA', '#B2EBF2', '#E1F5FE', '#FFFFFF'],
  headerGradient: ['#E0F7FA', '#B2EBF2', 'rgba(224,247,250,0.4)'],
  navBg: 'rgba(255,255,255,0.95)',
  icon: '#1A202C',
  accent: '#0072FF',
  cardBg: '#FFFFFF',
  statusBarStyle: 'dark-content',
};

// ─── Dark Theme ───────────────────────────────────────────────────────────────
export const darkColors: ThemeColors = {
  background: '#0D1117',
  surface: '#161B22',
  surfaceAlt: 'rgba(22,27,34,0.92)',
  text: '#E6EDF3',
  subtext: '#8B949E',
  border: 'rgba(255,255,255,0.08)',
  gradientBg: ['#0D1117', '#0D1B2A', '#0A1628', '#0D1117'],
  headerGradient: ['#0D1B2A', '#0A1628', 'rgba(13,27,42,0.8)'],
  navBg: 'rgba(22,27,34,0.97)',
  icon: '#E6EDF3',
  accent: '#58A6FF',
  cardBg: '#161B22',
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
    <ThemeContext.Provider value={{ theme, colorScheme, colors, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useTheme = () => useContext(ThemeContext);
