import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
  variant?: 'icon' | 'switch' | 'compact';
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ variant = 'icon', className = '' }) => {
  const { theme, toggleTheme, isDark } = useTheme();

  if (variant === 'switch') {
    return (
      <button
        id="theme-switch-full-btn"
        onClick={toggleTheme}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all border ${
          isDark
            ? 'bg-white/5 border-white/5 text-slate-300 hover:text-white hover:bg-white/10'
            : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
        } ${className}`}
        aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
        title={`Current mode: ${isDark ? 'Dark' : 'Light'}. Click to switch.`}
      >
        <div className="flex items-center gap-2.5">
          {isDark ? (
            <Moon className="w-4 h-4 text-[#00d2ff]" />
          ) : (
            <Sun className="w-4 h-4 text-amber-500" />
          )}
          <span className="text-xs font-medium">
            {isDark ? 'Dark Mode' : 'Light Mode'}
          </span>
        </div>

        {/* Visual Toggle Pill */}
        <div
          className={`w-9 h-5 rounded-full p-0.5 transition-colors relative flex items-center ${
            isDark ? 'bg-[#6735e8]' : 'bg-amber-500'
          }`}
        >
          <div
            className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform flex items-center justify-center ${
              isDark ? 'translate-x-4' : 'translate-x-0'
            }`}
          >
            {isDark ? (
              <Moon className="w-2.5 h-2.5 text-[#6735e8]" />
            ) : (
              <Sun className="w-2.5 h-2.5 text-amber-500" />
            )}
          </div>
        </div>
      </button>
    );
  }

  // Icon Button (for Navbar)
  return (
    <button
      id="theme-toggle-btn"
      onClick={toggleTheme}
      className={`p-2 rounded-xl transition-all flex items-center justify-center relative overflow-hidden group ${
        isDark
          ? 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200'
      } ${className}`}
      aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
      title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
    >
      <div className="relative w-4 h-4">
        <Sun
          className={`w-4 h-4 text-amber-500 absolute inset-0 transition-all duration-300 ${
            isDark
              ? 'opacity-0 rotate-90 scale-50'
              : 'opacity-100 rotate-0 scale-100'
          }`}
        />
        <Moon
          className={`w-4 h-4 text-[#00d2ff] absolute inset-0 transition-all duration-300 ${
            isDark
              ? 'opacity-100 rotate-0 scale-100'
              : 'opacity-0 -rotate-90 scale-50'
          }`}
        />
      </div>
      <span className="sr-only">Toggle theme</span>
    </button>
  );
};
