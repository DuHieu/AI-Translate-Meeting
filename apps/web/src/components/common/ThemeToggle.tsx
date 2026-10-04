import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  showLabel = false,
}) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
      aria-label={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
        isDark
          ? 'bg-[#1a1a1b] hover:bg-[#222224] text-zinc-300 hover:text-zinc-100 border-[#3a3a3d]'
          : 'bg-white hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900 border-zinc-200 shadow-xs'
      } ${className}`}
    >
      {isDark ? (
        <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0 transition-transform hover:rotate-45" />
      ) : (
        <Moon className="w-3.5 h-3.5 text-blue-600 shrink-0 transition-transform hover:-rotate-12" />
      )}

      {showLabel && (
        <span className="hidden sm:inline">
          {isDark ? 'Giao diện sáng' : 'Giao diện tối'}
        </span>
      )}
    </button>
  );
};
