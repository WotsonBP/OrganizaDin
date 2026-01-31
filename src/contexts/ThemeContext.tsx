import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Colors, ThemeType, ColorScheme } from '../constants/theme';
import { getFirst, runQuery } from '../database';
import { useDatabase } from './DatabaseContext';

interface ThemeContextType {
  theme: ThemeType;
  colors: ColorScheme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: ThemeType) => void;
  hideValues: boolean;
  toggleHideValues: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { isReady } = useDatabase();
  const [theme, setThemeState] = useState<ThemeType>('dark');
  const [hideValues, setHideValues] = useState(false);

  useEffect(() => {
    if (!isReady) return;
    loadTheme();
  }, [isReady]);

  const loadTheme = async () => {
    try {
      const settings = await getFirst<{ theme: ThemeType; hide_values?: number }>(
        'SELECT theme, hide_values FROM user_settings WHERE id = 1'
      );
      if (settings?.theme) {
        setThemeState(settings.theme);
      }
      if (settings?.hide_values !== undefined) {
        setHideValues(settings.hide_values === 1);
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

  const toggleHideValues = async () => {
    const newValue = !hideValues;
    setHideValues(newValue);
    try {
      await runQuery(
        'UPDATE user_settings SET hide_values = ?, updated_at = datetime("now") WHERE id = 1',
        [newValue ? 1 : 0]
      );
    } catch (error) {
      console.log('Error saving hide_values:', error);
    }
  };

  const colors = Colors[theme] || Colors.dark;
  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, colors, isDark, toggleTheme, setTheme, hideValues, toggleHideValues }}>
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
