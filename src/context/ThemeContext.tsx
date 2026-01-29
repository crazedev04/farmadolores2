import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DefaultTheme as NavDefaultTheme, DarkTheme as NavDarkTheme, Theme as NavTheme } from '@react-navigation/native';
import { lightTheme, darkTheme } from '../theme';

type ThemeType = typeof lightTheme;
type ThemeKey = 'light' | 'dark';

const themes: Record<ThemeKey, ThemeType> = {
  light: lightTheme,
  dark: darkTheme,
};

type ThemeContextType = {
  theme: ThemeType;
  toggleTheme: () => void;
  resetTheme: () => void;
  navigationTheme: NavTheme;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: themes.dark,
  toggleTheme: () => {},
  resetTheme: () => {},
  navigationTheme: {
    ...NavDarkTheme,
    colors: { ...NavDarkTheme.colors, ...themes.dark.colors },
    fonts: NavDarkTheme.fonts,
  },
});

export const useTheme = () => useContext(ThemeContext);

const STORAGE_KEY = 'theme';

export const ThemeContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeType>(themes.dark);

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      setTheme(saved === 'light' ? themes.light : themes.dark);
    })();
  }, []);

  const toggleTheme = async () => {
    const newKey: ThemeKey = theme.dark ? 'light' : 'dark';
    const newTheme = themes[newKey];
    setTheme(newTheme);
    await AsyncStorage.setItem(STORAGE_KEY, newKey);
  };

  const resetTheme = async () => {
    setTheme(themes.dark);
    await AsyncStorage.removeItem(STORAGE_KEY);
  };

  // Theme compatible con React Navigation
  const navigationTheme: NavTheme = {
    ...(theme.dark ? NavDarkTheme : NavDefaultTheme),
    colors: {
      ...(theme.dark ? NavDarkTheme.colors : NavDefaultTheme.colors),
      ...theme.colors,
    },
    fonts: (theme.dark ? NavDarkTheme.fonts : NavDefaultTheme.fonts),
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, resetTheme, navigationTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
