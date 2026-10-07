import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../context/language-context-def';
import { AppLanguage } from '../../i18n';
import { Globe, Check, ChevronDown } from 'lucide-react';

const LANGUAGE_OPTIONS: Array<{ code: AppLanguage; label: string; flag: string }> = [
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
];

export interface LanguageSwitcherProps {
  className?: string;
  onSelect?: (lang: AppLanguage) => void;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ className = '', onSelect }) => {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentOption = LANGUAGE_OPTIONS.find((opt) => opt.code === language) || LANGUAGE_OPTIONS[1];

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Chọn ngôn ngữ hệ thống"
        aria-expanded={isOpen}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white bg-white hover:bg-zinc-100 dark:bg-[#1a1a1b] dark:hover:bg-[#222224] border border-zinc-200 dark:border-[#3a3a3d] transition-colors cursor-pointer shadow-2xs"
        title="Chuyển đổi ngôn ngữ hiển thị"
      >
        <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />
        <span className="hidden sm:inline font-semibold">{currentOption.label}</span>
        <span className="sm:hidden font-mono uppercase">{currentOption.code}</span>
        <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-36 rounded-xl bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-[#333336] shadow-xl py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2.5 py-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800">
            Language
          </div>
          {LANGUAGE_OPTIONS.map((opt) => {
            const isSelected = opt.code === language;
            return (
              <button
                key={opt.code}
                type="button"
                onClick={() => {
                  setLanguage(opt.code);
                  if (onSelect) {
                    onSelect(opt.code);
                  }
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-sm">{opt.flag}</span>
                  <span>{opt.label}</span>
                </span>
                {isSelected && <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
