'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';

type ThemeContextType = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light');
  const [isMounted, setIsMounted] = useState(false);
  const [systemTheme, setSystemTheme] = useState<ThemeMode>('light');

  // Set the theme based on system preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    };

    try {
      // Set initial system theme
      handleChange();
      mediaQuery.addEventListener('change', handleChange);

      // Get saved theme preference
      const savedMode = localStorage.getItem('theme') as ThemeMode | null;
      setMode(savedMode || 'system');
    } catch (error) {
      console.error('Error initializing theme:', error);
      setMode('light');
    } finally {
      setIsMounted(true);
    }

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // Apply theme class to html element
  useEffect(() => {
    if (!isMounted) return;
    
    const root = window.document.documentElement;
    const isDark = mode === 'dark' || (mode === 'system' && systemTheme === 'dark');
    
    if (isDark) {
      root.classList.add('dark');
      root.setAttribute('data-mode', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-mode', 'light');
    }
    
    // Save theme preference
    if (mode === 'system') {
      localStorage.removeItem('theme');
    } else {
      localStorage.setItem('theme', mode);
    }
  }, [mode, systemTheme, isMounted]);

  const isDark = mode === 'dark' || (mode === 'system' && systemTheme === 'dark');

  // Prevent flash of unstyled content
  if (!isMounted) {
    return (
      <div className="invisible">
        {children}
      </div>
    );
  }

  return (
    <ThemeContext.Provider value={{ mode, setMode, isDark }}>
      <div className={isDark ? 'dark' : ''}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
