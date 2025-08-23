'use client';

import { useState, useEffect } from 'react';
import { useTheme } from './ThemeContext';
import { Sun, Moon, Monitor } from 'lucide-react';

export function ThemeToggle() {
  const { mode, setMode } = useTheme();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleThemeChange = (newMode: 'light' | 'dark' | 'system') => {
    if (setMode) {
      setMode(newMode);
    }
  };

  if (!isClient) {
    return (
      <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-full">
        <button className="p-2 rounded-full opacity-50 cursor-not-allowed">
          <Sun className="w-4 h-4" />
        </button>
        <button className="p-2 rounded-full opacity-50 cursor-not-allowed">
          <Monitor className="w-4 h-4" />
        </button>
        <button className="p-2 rounded-full opacity-50 cursor-not-allowed">
          <Moon className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-full">
      <button
        onClick={() => handleThemeChange('light')}
        className={`p-2 rounded-full transition-colors ${
          mode === 'light' 
            ? 'bg-white text-primary-600 shadow-sm' 
            : 'text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700'
        }`}
        aria-label="Light mode"
      >
        <Sun className="w-4 h-4" />
      </button>
      <button
        onClick={() => handleThemeChange('system')}
        className={`p-2 rounded-full transition-colors ${
          mode === 'system'
            ? 'bg-white text-primary-600 shadow-sm' 
            : 'text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700'
        }`}
        aria-label="System preference"
      >
        <Monitor className="w-4 h-4" />
      </button>
      <button
        onClick={() => handleThemeChange('dark')}
        className={`p-2 rounded-full transition-colors ${
          mode === 'dark'
            ? 'bg-gray-900 text-primary-400 shadow-sm' 
            : 'text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700'
        }`}
        aria-label="Dark mode"
      >
        <Moon className="w-4 h-4" />
      </button>
    </div>
  );
}

export default ThemeToggle;
