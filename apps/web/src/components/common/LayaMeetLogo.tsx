import React from 'react';

interface LayaMeetLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  showBadge?: boolean;
  badgeText?: string;
  className?: string;
}

export const LayaMeetLogo: React.FC<LayaMeetLogoProps> = ({
  size = 'md',
  showWordmark = true,
  showBadge = false,
  badgeText = 'layameet.com',
  className = '',
}) => {
  const iconDimensions = {
    sm: { box: 'w-6 h-6', icon: 14, text: 'text-sm', badge: 'text-[9px]' },
    md: { box: 'w-8 h-8', icon: 18, text: 'text-base sm:text-lg', badge: 'text-[10px]' },
    lg: { box: 'w-10 h-10', icon: 22, text: 'text-xl sm:text-2xl', badge: 'text-xs' },
    xl: { box: 'w-12 h-12', icon: 26, text: 'text-2xl sm:text-3xl', badge: 'text-xs' },
  }[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Brand Icon: Polyglot Speech Convergence (Interlocking speech nodes with acoustic sound bars) */}
      <div
        className={`${iconDimensions.box} rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20 ring-1 ring-white/20 transition-all duration-200 group-hover:scale-105`}
        aria-hidden="true"
      >
        <svg
          width={iconDimensions.icon + 4}
          height={iconDimensions.icon + 4}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Main conversation bubble */}
          <path
            d="M2.5 11C2.5 6.30558 6.30558 2.5 11 2.5C15.6944 2.5 19.5 6.30558 19.5 11C19.5 12.9116 18.8688 14.6764 17.8056 16.0938L19 20.5L14.7289 19.28C13.5772 19.8592 12.3272 20.1775 11 20.1775C6.30558 20.1775 2.5 16.3719 2.5 11Z"
            fill="currentColor"
            fillOpacity="0.22"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
          {/* Audio Equalizer & Translation Voice Bars */}
          <path d="M7 13V9" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M10 15.5V6.5" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M13 13.5V8.5" stroke="#93c5fd" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M16 12V10" stroke="#93c5fd" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </div>

      {/* Wordmark */}
      {showWordmark && (
        <div className="flex items-center gap-2">
          <div className="flex items-baseline tracking-tight font-bold text-zinc-950 dark:text-zinc-100">
            <span className={iconDimensions.text}>LayaMeet</span>
          </div>

          {showBadge && (
            <span
              className={`hidden sm:inline font-mono font-medium px-1.5 py-0.5 rounded border ${iconDimensions.badge} bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700`}
            >
              {badgeText}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
