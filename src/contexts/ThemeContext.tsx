import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Colors, ThemeType, ColorScheme } from '../constants/theme';
import { getFirst, runQuery } from '../database';

interface ThemeContextType {
  theme: ThemeType;
  colors: ColorScheme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeType>('dark');

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const settings = await getFirst<{ theme: ThemeType }>(
        'SELECT theme FROM user_settings WHERE id = 1'
      );
      if (settings?.theme) {
        setThemeState(settings.theme);
      }
    } catch (error) {
      console.log('Error loading theme:', error);
    }
  };

  const setTheme = async (newTheme: ThemeType) => {
    setThemeState(newTheme);
    try {
      await runQuery(
        'UPDATE user_settings SET theme = ?, updated_at = datetime("now") WHERE id = 1',
        [newTheme]
      );
    } catch (error) {
      console.log('Error saving theme:', error);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

  const colors = Colors[theme];
  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, colors, isDark, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
